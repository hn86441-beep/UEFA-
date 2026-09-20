import fs from "fs";
import path from "path";

/* ================= تخزين بيانات الدوري ================= */

const KEY = "league-data-v1";
// أسماء المتغيرات كما يعرضها موقع Upstash نفسه مباشرة (وليس عبر تكامل Vercel Marketplace)
const hasKV = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const isVercel = !!process.env.VERCEL;
const LOCAL_PATH = path.join(process.cwd(), "data", "league.local.json");

export function defaultData() {
  return {
    settings: { leagueName: "دوري الأبطال", season: "2026", logoText: "★" },
    teams: [],
    groups: [],
    matches: [],
    archives: [],
  };
}

function readLocal() {
  try {
    if (!fs.existsSync(LOCAL_PATH)) {
      fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
      fs.writeFileSync(LOCAL_PATH, JSON.stringify(defaultData(), null, 2));
    }
    return JSON.parse(fs.readFileSync(LOCAL_PATH, "utf-8"));
  } catch {
    return defaultData();
  }
}

function writeLocal(data) {
  fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_PATH, JSON.stringify(data, null, 2));
}

let redisClient = null;
async function getRedis() {
  if (!redisClient) {
    const { Redis } = await import("@upstash/redis");
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redisClient;
}

const NEEDS_DB_MESSAGE =
  "لم يتم ربط قاعدة بيانات دائمة بالموقع بعد. أنشئ قاعدة بيانات مجانية على upstash.com وأضف UPSTASH_REDIS_REST_URL وUPSTASH_REDIS_REST_TOKEN في إعدادات Vercel ثم أعد النشر.";

export async function getData() {
  if (hasKV) {
    const redis = await getRedis();
    const data = await redis.get(KEY);
    if (!data) {
      const fresh = defaultData();
      await redis.set(KEY, fresh);
      return fresh;
    }
    return data;
  }
  if (isVercel) {
    throw new Error(NEEDS_DB_MESSAGE);
  }
  return readLocal();
}

export async function saveData(data) {
  if (hasKV) {
    const redis = await getRedis();
    await redis.set(KEY, data);
    return;
  }
  if (isVercel) {
    throw new Error(NEEDS_DB_MESSAGE);
  }
  writeLocal(data);
}

export async function resetData() {
  const fresh = defaultData();
  await saveData(fresh);
  return fresh;
}

/* ================= المقاطع الصوتية المخصّصة (نفس قاعدة البيانات، مفتاح منفصل) ================= */
// تُخزَّن في مفتاح مستقل عن بيانات الدوري الرئيسية حتى لا تُبطئ كل عملية حفظ
// عادية (إضافة فريق، تسجيل نتيجة...) بحمل بيانات صوتية أكبر حجمًا معها في كل مرة.

const SOUNDS_KEY = "league-sound-clips-v1";
const SOUNDS_LOCAL_PATH = path.join(process.cwd(), "data", "sound-clips.local.json");

function readLocalSounds() {
  try {
    if (!fs.existsSync(SOUNDS_LOCAL_PATH)) return {};
    return JSON.parse(fs.readFileSync(SOUNDS_LOCAL_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeLocalSounds(clips) {
  fs.mkdirSync(path.dirname(SOUNDS_LOCAL_PATH), { recursive: true });
  fs.writeFileSync(SOUNDS_LOCAL_PATH, JSON.stringify(clips, null, 2));
}

export async function getSoundClips() {
  if (hasKV) {
    const redis = await getRedis();
    const clips = await redis.get(SOUNDS_KEY);
    return clips || {};
  }
  if (isVercel) return {}; // بدون قاعدة بيانات مربوطة، لا نعطّل باقي الموقع بسبب هذه الميزة الاختيارية
  return readLocalSounds();
}

export async function saveSoundClips(clips) {
  if (hasKV) {
    const redis = await getRedis();
    await redis.set(SOUNDS_KEY, clips);
    return;
  }
  if (isVercel) {
    throw new Error(NEEDS_DB_MESSAGE);
  }
  writeLocalSounds(clips);
}

/* ================= جلسة المشرف (Web Crypto - متوافقة مع Edge) ================= */

const COOKIE_NAME = "league_admin_session";

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "لم يُحدَّد سر الجلسة بعد. من إعدادات Vercel أضف متغير SESSION_SECRET ثم أعد النشر."
    );
  }
  return secret;
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(value) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return toHex(sig);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export async function makeSessionCookie() {
  const value = "admin-ok";
  const sig = await hmacHex(value);
  return `${COOKIE_NAME}=${value}.${sig}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

async function verifyToken(token) {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx === -1) return false;
  const value = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (value !== "admin-ok") return false;
  const expected = await hmacHex(value);
  return timingSafeEqual(sig, expected);
}

export async function isAuthedFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return false;
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
  return verifyToken(cookies[COOKIE_NAME]);
}
