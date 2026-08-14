import fs from "fs";
import path from "path";

/* ================= تخزين بيانات الدوري ================= */

const KEY = "league-data-v1";
const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const LOCAL_PATH = path.join(process.cwd(), "data", "league.local.json");

export function defaultData() {
  return {
    settings: { leagueName: "دوري الأبطال", season: "2026", logoText: "★" },
    teams: [],
    groups: [],
    matches: [],
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

let kvClient = null;
async function getKV() {
  if (!kvClient) {
    const { kv } = await import("@vercel/kv");
    kvClient = kv;
  }
  return kvClient;
}

export async function getData() {
  if (hasKV) {
    const kv = await getKV();
    const data = await kv.get(KEY);
    if (!data) {
      const fresh = defaultData();
      await kv.set(KEY, fresh);
      return fresh;
    }
    return data;
  }
  return readLocal();
}

export async function saveData(data) {
  if (hasKV) {
    const kv = await getKV();
    await kv.set(KEY, data);
    return;
  }
  writeLocal(data);
}

export async function resetData() {
  const fresh = defaultData();
  await saveData(fresh);
  return fresh;
}

/* ================= جلسة المشرف (Web Crypto - متوافقة مع Edge) ================= */

const COOKIE_NAME = "league_admin_session";

function getSecret() {
  return process.env.SESSION_SECRET || "dev_secret_change_me";
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
