import { NextResponse } from "next/server";
import {
  getData,
  saveData,
  defaultData,
  makeSessionCookie,
  clearSessionCookie,
  isAuthedFromCookieHeader,
} from "../../../lib/server";
import {
  uid,
  computeStandings,
  drawGroups,
  generateGroupMatches,
  drawKnockoutRound,
} from "../../../lib/logic";

// يمنع Vercel من تخزين استجابات هذا المسار مؤقتًا — كل طلب يجب أن يقرأ
// أحدث بيانات من قاعدة البيانات مباشرة (وإلا قد يرى الزوار بيانات قديمة
// حتى بعد حفظ تعديلات جديدة فعليًا).
export const dynamic = "force-dynamic";
export const revalidate = 0;

function ok(body, init) {
  return NextResponse.json(body, init);
}
function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function readBody(req) {
  return req.json().catch(() => ({}));
}

// نقاط الـ API التي يمكن استدعاؤها دون تسجيل دخول رغم أنها POST (تسجيل الدخول نفسه)
const OPEN_MUTATING = new Set(["auth/login", "auth/logout"]);

async function requireAuth(req, seg) {
  if (OPEN_MUTATING.has(seg)) return null; // مسموح بدون تحقق
  const authed = await isAuthedFromCookieHeader(req.headers.get("cookie") || "");
  if (!authed) return fail("غير مصرح لك. سجّل الدخول كمشرف.", 401);
  return null; // مصرح له
}

/* =========================== GET =========================== */
export async function GET(req, ctx) {
  try {
    return await handleGET(req, ctx);
  } catch (e) {
    return fail(e.message || "حدث خطأ غير متوقع في الخادم", 500);
  }
}

async function handleGET(req, { params }) {
  const p = params.path || [];
  const seg = p.join("/");

  if (seg === "data") {
    const data = await getData();
    if (!data.archives) data.archives = [];
    return ok(data);
  }
  if (seg === "auth/check") {
    const authed = await isAuthedFromCookieHeader(req.headers.get("cookie") || "");
    return ok({ authed });
  }
  return fail("غير موجود", 404);
}

/* =========================== POST =========================== */
export async function POST(req, ctx) {
  try {
    return await handlePOST(req, ctx);
  } catch (e) {
    return fail(e.message || "حدث خطأ غير متوقع في الخادم", 500);
  }
}

async function handlePOST(req, { params }) {
  const p = params.path || [];
  const seg = p.join("/");
  const authFail = await requireAuth(req, seg);
  if (authFail) return authFail;

  // ---- رفع مقطع صوتي مخصّص لحدث معيّن (هدف / تصدٍّ / إنذار / طرد) ----
  // يُعالَج قبل قراءة body كـ JSON لأن هذا الطلب يصل كـ multipart/form-data
  if (seg === "sounds/upload") {
    const SOUND_TYPES = ["goal", "save", "yellow", "red"];
    try {
      const formData = await req.formData();
      const file = formData.get("file");
      const type = formData.get("type");
      if (!file || typeof file === "string") return fail("لم يتم إرفاق ملف صوتي");
      if (!SOUND_TYPES.includes(type)) return fail("نوع الحدث غير معروف");
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return fail(
          "لم يتم ربط مساحة تخزين للملفات بعد. من مشروعك في Vercel اذهب إلى Storage → أضف Blob → اربطها بالمشروع → أعد النشر.",
          500
        );
      }
      const { put } = await import("@vercel/blob");
      const safeName = file.name?.replace(/[^\w.\-]/g, "_") || "clip.mp3";
      const blob = await put(`sounds/${type}-${Date.now()}-${safeName}`, file, {
        access: "public",
        addRandomSuffix: true,
      });
      const data = await getData();
      data.settings.soundClips = { ...(data.settings.soundClips || {}), [type]: blob.url };
      await saveData(data);
      return ok({ url: blob.url, soundClips: data.settings.soundClips });
    } catch (e) {
      return fail("تعذر رفع الملف: " + e.message, 500);
    }
  }

  const body = await readBody(req);

  // ---- تسجيل الدخول / الخروج ----
  if (seg === "auth/login") {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return fail(
        "لم يُحدَّد المشرف كلمة سر بعد. من إعدادات Vercel أضف متغير ADMIN_PASSWORD ثم أعد النشر.",
        500
      );
    }
    if (!body.password || body.password !== adminPassword) {
      return fail("كلمة السر غير صحيحة", 401);
    }
    const res = ok({ ok: true });
    res.headers.set("Set-Cookie", await makeSessionCookie());
    return res;
  }
  if (seg === "auth/logout") {
    const res = ok({ ok: true });
    res.headers.set("Set-Cookie", clearSessionCookie());
    return res;
  }

  // ---- إضافة فريق ----
  if (seg === "teams") {
    if (!body.name?.trim()) return fail("اسم الفريق مطلوب");
    const data = await getData();
    const team = {
      id: uid("t"),
      name: body.name.trim(),
      group: body.group || null,
      logo: body.logo || "",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      points: 0,
      players: [],
    };
    data.teams.push(team);
    await saveData(data);
    return ok(team, { status: 201 });
  }

  // ---- إضافة لاعب لقائمة فريق ----
  if (seg === "players") {
    const { teamId, name } = body;
    if (!name?.trim()) return fail("اسم اللاعب مطلوب");
    const data = await getData();
    const team = data.teams.find((t) => t.id === teamId);
    if (!team) return fail("الفريق غير موجود", 404);
    if (!team.players) team.players = [];
    const player = { id: uid("p"), name: name.trim() };
    team.players.push(player);
    await saveData(data);
    return ok(player, { status: 201 });
  }

  // ---- إضافة مجموعة ----
  if (seg === "groups") {
    if (!body.name?.trim()) return fail("اسم المجموعة مطلوب");
    const data = await getData();
    const group = { id: uid("g"), name: body.name.trim(), teamIds: [] };
    data.groups.push(group);
    await saveData(data);
    return ok(group, { status: 201 });
  }

  // ---- إضافة مباراة يدويًا (تحكم كامل: يمكن إضافتها لأي مجموعة أو كمباراة إقصائية) ----
  if (seg === "matches") {
    const { stage = "group", group = null, round = 1, teamA, teamB, date = "", time = "", venue = "" } = body;
    if (!teamA || !teamB || teamA === teamB) return fail("اختر فريقين مختلفين");
    const data = await getData();
    const match = {
      id: uid("m"),
      stage,
      group,
      round,
      teamA,
      teamB,
      scoreA: null,
      scoreB: null,
      played: false,
      date,
      time,
      venue,
      winner: null,
      events: [],
      notes: "",
      motm: null,
      lineups: { A: { starting: [], subs: [] }, B: { starting: [], subs: [] } },
      clock: { running: false, accumulated: 0, startedAt: null },
    };
    data.matches.push(match);
    await saveData(data);
    return ok(match, { status: 201 });
  }

  // ---- قرعة المجموعات ----
  if (seg === "draw/groups") {
    const { doubleRound = true, generateMatches = true } = body;
    const data = await getData();
    if (data.groups.length < 1) return fail("أنشئ مجموعات أولًا قبل القرعة");
    if (data.teams.length < data.groups.length)
      return fail("عدد الفرق أقل من عدد المجموعات");

    const assignment = drawGroups(data.teams, data.groups);
    data.teams = data.teams.map((t) => ({ ...t, group: assignment[t.id] || null }));
    data.groups = data.groups.map((g) => ({
      ...g,
      teamIds: data.teams.filter((t) => t.group === g.id).map((t) => t.id),
    }));

    data.matches = data.matches.filter((m) => m.stage !== "group");
    if (generateMatches) {
      data.groups.forEach((g) => {
        data.matches.push(...generateGroupMatches(data.teams, g.id, doubleRound));
      });
    }
    await saveData(data);
    return ok(data);
  }

  // ---- قرعة دور إقصائي ----
  if (seg === "knockout/draw") {
    const { teamIds, roundName } = body;
    if (!Array.isArray(teamIds) || teamIds.length < 2) return fail("اختر فريقين على الأقل");
    if (!roundName?.trim()) return fail("أدخل اسم الدور");
    const data = await getData();
    const newMatches = drawKnockoutRound(teamIds, roundName.trim());
    data.matches.push(...newMatches);
    await saveData(data);
    return ok(newMatches, { status: 201 });
  }

  // ---- إعادة حساب نقاط الفرق من نتائج المباريات ----
  if (seg === "recalc") {
    const data = await getData();
    data.groups.forEach((g) => {
      const table = computeStandings(data.teams, data.matches, g.id);
      table.forEach((row) => {
        const t = data.teams.find((t) => t.id === row.id);
        if (t) Object.assign(t, {
          played: row.played, won: row.won, drawn: row.drawn,
          lost: row.lost, gf: row.gf, ga: row.ga, points: row.points,
        });
      });
    });
    await saveData(data);
    return ok(data);
  }

  // ---- أرشفة الموسم الحالي وبدء موسم جديد ----
  if (seg === "season/archive") {
    const data = await getData();
    if (data.teams.length === 0) return fail("لا يوجد شيء لأرشفته بعد");
    const archive = {
      id: uid("arc"),
      label: body.label?.trim() || data.settings?.season || "موسم",
      archivedAt: new Date().toISOString(),
      settings: data.settings,
      teams: data.teams,
      groups: data.groups,
      matches: data.matches,
    };
    const fresh = defaultData();
    fresh.archives = [...(data.archives || []), archive];
    fresh.settings.leagueName = data.settings?.leagueName || fresh.settings.leagueName;
    await saveData(fresh);
    return ok(fresh);
  }

  // ---- إعادة ضبط كاملة (مع الحفاظ على أرشيف المواسم السابقة) ----
  if (seg === "reset") {
    const data = await getData();
    const fresh = defaultData();
    fresh.archives = data.archives || [];
    await saveData(fresh);
    return ok(fresh);
  }

  return fail("غير موجود", 404);
}

/* =========================== PUT =========================== */
export async function PUT(req, ctx) {
  try {
    return await handlePUT(req, ctx);
  } catch (e) {
    return fail(e.message || "حدث خطأ غير متوقع في الخادم", 500);
  }
}

async function handlePUT(req, { params }) {
  const p = params.path || [];
  const authFail = await requireAuth(req, p.join("/"));
  if (authFail) return authFail;
  const body = await readBody(req);
  const data = await getData();

  if (p[0] === "data" && p.length === 1) {
    data.settings = { ...data.settings, ...body };
    await saveData(data);
    return ok(data);
  }

  if (p[0] === "teams" && p.length === 2) {
    const t = data.teams.find((t) => t.id === p[1]);
    if (!t) return fail("الفريق غير موجود", 404);
    const allowed = ["name", "group", "logo", "played", "won", "drawn", "lost", "gf", "ga", "points", "players", "captainId"];
    allowed.forEach((k) => { if (k in body) t[k] = body[k]; });
    await saveData(data);
    return ok(t);
  }

  if (p[0] === "groups" && p.length === 2) {
    const g = data.groups.find((g) => g.id === p[1]);
    if (!g) return fail("المجموعة غير موجودة", 404);
    if ("name" in body) g.name = body.name;
    await saveData(data);
    return ok(g);
  }

  if (p[0] === "matches" && p.length === 2) {
    const m = data.matches.find((m) => m.id === p[1]);
    if (!m) return fail("المباراة غير موجودة", 404);
    ["scoreA", "scoreB", "played", "date", "time", "round", "winner", "events", "notes", "venue", "motm", "lineups", "clock"].forEach((k) => {
      if (k in body) m[k] = body[k];
    });
    if (m.stage === "knockout" && m.played && m.scoreA !== null && m.scoreB !== null) {
      if (m.scoreA > m.scoreB) m.winner = m.teamA;
      else if (m.scoreB > m.scoreA) m.winner = m.teamB;
    }
    // تحديث فوري لنقاط الفرق في المجموعة فور حفظ النتيجة (بدون الحاجة لزر تحديث يدوي)
    if (m.stage === "group" && m.group) {
      const table = computeStandings(data.teams, data.matches, m.group);
      table.forEach((row) => {
        const t = data.teams.find((t) => t.id === row.id);
        if (t) Object.assign(t, {
          played: row.played, won: row.won, drawn: row.drawn,
          lost: row.lost, gf: row.gf, ga: row.ga, points: row.points,
        });
      });
    }
    await saveData(data);
    return ok(m);
  }

  return fail("غير موجود", 404);
}

/* =========================== DELETE =========================== */
export async function DELETE(req, ctx) {
  try {
    return await handleDELETE(req, ctx);
  } catch (e) {
    return fail(e.message || "حدث خطأ غير متوقع في الخادم", 500);
  }
}

async function handleDELETE(req, { params }) {
  const p = params.path || [];
  const authFail = await requireAuth(req, p.join("/"));
  if (authFail) return authFail;
  const data = await getData();

  if (p[0] === "sounds" && p.length === 2) {
    if (data.settings.soundClips) delete data.settings.soundClips[p[1]];
    await saveData(data);
    return ok({ ok: true, soundClips: data.settings.soundClips || {} });
  }

  if (p[0] === "players" && p.length === 3) {
    const team = data.teams.find((t) => t.id === p[1]);
    if (!team) return fail("الفريق غير موجود", 404);
    team.players = (team.players || []).filter((pl) => pl.id !== p[2]);
    await saveData(data);
    return ok({ ok: true });
  }

  if (p[0] === "teams" && p.length === 2) {
    data.teams = data.teams.filter((t) => t.id !== p[1]);
    data.groups.forEach((g) => { g.teamIds = g.teamIds.filter((id) => id !== p[1]); });
    data.matches = data.matches.filter((m) => m.teamA !== p[1] && m.teamB !== p[1]);
    await saveData(data);
    return ok({ ok: true });
  }

  if (p[0] === "groups" && p.length === 2) {
    data.groups = data.groups.filter((g) => g.id !== p[1]);
    data.teams.forEach((t) => { if (t.group === p[1]) t.group = null; });
    data.matches = data.matches.filter((m) => m.group !== p[1]);
    await saveData(data);
    return ok({ ok: true });
  }

  if (p[0] === "matches" && p.length === 2) {
    data.matches = data.matches.filter((m) => m.id !== p[1]);
    await saveData(data);
    return ok({ ok: true });
  }

  return fail("غير موجود", 404);
}
