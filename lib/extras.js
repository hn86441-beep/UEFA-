// حسابات الميزات الإضافية: بطاقات اللاعبين، سوق الانتقالات (فانتازي)، الأوسمة والمستويات، حاسبة التأهل.
// كلها تُحسب من بيانات الدوري الموجودة (الأحداث، التشكيلات، النتائج) بلا أي تغيير في قاعدة البيانات.
import { computeStandings } from "./logic";

export const POS_LABELS = { GK: "حارس", DEF: "مدافع", MID: "وسط", FWD: "مهاجم" };
export const POS_SHORT = { GK: "GK", DEF: "DEF", MID: "MID", FWD: "ATT" };
const isGKDEF = (pos) => pos === "GK" || pos === "DEF";
const clamp = (v, lo = 40, hi = 99) => Math.max(lo, Math.min(hi, Math.round(v)));
const pad = (n) => String(n).padStart(2, "0");

export const TIER_STYLE = {
  bronze: { name: "برونزية", stops: [[0, "#8c5a2b"], [0.5, "#dba670"], [1, "#6b3f1a"]], fg: "#2a1606", edge: "rgba(42,22,6,.45)", circle: "rgba(255,255,255,.28)" },
  silver: { name: "فضية", stops: [[0, "#8f99a4"], [0.5, "#eef2f6"], [1, "#667180"]], fg: "#1c232b", edge: "rgba(28,35,43,.4)", circle: "rgba(255,255,255,.4)" },
  gold: { name: "ذهبية", stops: [[0, "#a8801f"], [0.5, "#f6e08a"], [1, "#8a6a1f"]], fg: "#2b1f02", edge: "rgba(43,31,2,.45)", circle: "rgba(255,255,255,.35)" },
  special: { name: "خاصة", stops: [[0, "#0a1d4a"], [0.5, "#2563eb"], [1, "#06b6d4"]], fg: "#ffffff", edge: "rgba(255,255,255,.5)", circle: "rgba(255,255,255,.18)" },
};
export const tierBg = (t) => `linear-gradient(160deg, ${t.stops.map(([o, c]) => `${c} ${o * 100}%`).join(", ")})`;

export function monthLabel(key) {
  try {
    return new Date(`${key}-01T00:00:00`).toLocaleDateString("ar", { month: "long", year: "numeric" });
  } catch {
    return key;
  }
}
export function monthsOf(data) {
  return [...new Set((data.matches || []).filter((m) => m.played && m.date).map((m) => m.date.slice(0, 7)))].sort();
}
function weekStart(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d)) return "—";
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ---------------- الأوسمة ---------------- */
export const BADGES = [
  { id: "hat", icon: "🎩", name: "Hat-trick Hero", desc: "تسجيل 3 أهداف في مباراة واحدة", test: (s) => s.hatTricks, count: true },
  { id: "wall", icon: "🛡️", name: "Iron Wall", desc: "حارس/مدافع حافظ على نظافة شباكه 3 مباريات متتالية", test: (s) => (s.bestCs >= 3 ? 1 : 0) },
  { id: "clutch", icon: "⏱️", name: "Clutch Player", desc: "هدف في الدقائق الأخيرة غيّر نتيجة المباراة (تقدّم أو تعادل)", test: (s) => s.clutch, count: true },
  { id: "fire", icon: "🔥", name: "On Fire", desc: "التسجيل في 3 مباريات متتالية", test: (s) => (s.bestGoalStreak >= 3 ? 1 : 0) },
  { id: "playmaker", icon: "🎯", name: "Playmaker", desc: "3 تمريرات حاسمة أو أكثر", test: (s) => (s.assists >= 3 ? 1 : 0) },
  { id: "gloves", icon: "🧤", name: "Safe Hands", desc: "5 تصدّيات أو أكثر", test: (s) => (s.saves >= 5 ? 1 : 0) },
  { id: "mvp", icon: "👑", name: "MVP", desc: "أفضل لاعب في مباراتين أو أكثر", test: (s) => (s.motm >= 2 ? 1 : 0) },
  { id: "fair", icon: "🤝", name: "Fair Play", desc: "3 مباريات فأكثر بلا أي بطاقة", test: (s) => (s.apps >= 3 && s.yellow + s.red === 0 ? 1 : 0) },
  { id: "boot", icon: "👟", name: "Golden Boot", desc: "هدّاف الفترة (هدفان فأكثر)", test: (s) => (s._boot ? 1 : 0) },
];

export function levelInfo(xp) {
  const level = 1 + Math.floor(Math.sqrt(xp / 40));
  const cur = 40 * (level - 1) ** 2;
  const next = 40 * level ** 2;
  const titles = ["مبتدئ", "واعد", "محترف", "نجم", "أسطورة", "خالد"];
  return { level, title: titles[Math.min(5, Math.floor((level - 1) / 2))], progress: Math.min(1, (xp - cur) / (next - cur)), next };
}

/* ---------------- التحليل الرئيسي ---------------- */
export function analyze(data, { month = "all" } = {}) {
  const teams = data.teams || [];
  const stats = {};
  teams.forEach((t) =>
    (t.players || []).forEach((p) => {
      stats[p.id] = {
        id: p.id, name: p.name, pos: p.pos || "", teamId: t.id, teamName: t.name,
        apps: 0, goals: 0, assists: 0, saves: 0, yellow: 0, red: 0, wins: 0, cleanSheets: 0, motm: 0,
        hatTricks: 0, clutch: 0, csStreak: 0, bestCs: 0, goalStreak: 0, bestGoalStreak: 0,
        fp: 0, weekly: {}, value: 1, valueHist: [1], lastFp: 0, lastDelta: 0,
      };
    })
  );
  const key = (m) => `${m.date || "9999-99-99"}T${m.time || "99:99"}`;
  const ms = (data.matches || [])
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.played && m.scoreA != null && m.scoreB != null && (month === "all" || (m.date || "").slice(0, 7) === month))
    .sort((x, y) => key(x.m).localeCompare(key(y.m)) || x.i - y.i)
    .map((x) => x.m);

  const weekSet = new Set();
  ms.forEach((m) => {
    const total = m.clock?.totalSeconds ? m.clock.totalSeconds / 60 : 90;
    const wk = weekStart(m.date);
    weekSet.add(wk);
    const evs = m.events || [];

    ["A", "B"].forEach((side) => {
      const teamId = side === "A" ? m.teamA : m.teamB;
      const team = teams.find((t) => t.id === teamId);
      if (!team) return;
      const my = side === "A" ? m.scoreA : m.scoreB;
      const opp = side === "A" ? m.scoreB : m.scoreA;
      const won = my > opp || (my === opp && m.winner === teamId);
      const lost = my < opp || (my === opp && m.winner && m.winner !== teamId);
      const lu = m.lineups?.[side];
      const hasLineup = (lu?.starting?.length || 0) + (lu?.subs?.length || 0) > 0;
      const ids = new Set(hasLineup ? [...(lu.starting || []), ...(lu.subs || [])] : (team.players || []).map((p) => p.id));
      evs.filter((e) => e.side === side).forEach((e) => {
        if (e.playerId) ids.add(e.playerId);
        if (e.assistId) ids.add(e.assistId);
      });

      ids.forEach((id) => {
        const s = stats[id];
        if (!s) return;
        const mine = evs.filter((e) => e.side === side);
        const goals = mine.filter((e) => e.type === "goal" && e.playerId === id).length;
        const assists = mine.filter((e) => e.type === "goal" && e.assistId === id).length;
        const saves = mine.filter((e) => e.type === "save" && e.playerId === id).length;
        const yellow = mine.filter((e) => e.type === "yellow" && e.playerId === id).length;
        const red = mine.filter((e) => e.type === "red" && e.playerId === id).length;
        const cs = opp === 0;
        const isMotm = m.motm?.side === side && m.motm?.playerId === id;

        s.apps++; s.goals += goals; s.assists += assists; s.saves += saves; s.yellow += yellow; s.red += red;
        if (won) s.wins++;
        if (cs) s.cleanSheets++;
        if (isMotm) s.motm++;
        if (goals >= 3) s.hatTricks++;
        if (isGKDEF(s.pos)) {
          s.csStreak = cs ? s.csStreak + 1 : 0;
          s.bestCs = Math.max(s.bestCs, s.csStreak);
        }
        s.goalStreak = goals > 0 ? s.goalStreak + 1 : 0;
        s.bestGoalStreak = Math.max(s.bestGoalStreak, s.goalStreak);

        // نقاط الفانتازي لهذه المباراة
        const gp = isGKDEF(s.pos) ? 6 : s.pos === "MID" ? 5 : 4;
        const fp =
          1 + goals * gp + assists * 3 + (cs ? (isGKDEF(s.pos) ? 4 : s.pos === "MID" ? 1 : 0) : 0) +
          saves * 0.5 - yellow - red * 3 + (won ? 2 : 0) + (isMotm ? 3 : 0) + (goals >= 3 ? 3 : 0);
        s.fp += fp;
        s.lastFp = fp;
        s.weekly[wk] = (s.weekly[wk] || 0) + fp;

        // القيمة السوقية: ترتفع بحسب الأداء والنتيجة وتنخفض عند الضعف
        const prev = s.value;
        s.value = Math.max(0.2, prev + (fp - 3) * 0.06 + (won ? 0.05 : lost ? -0.04 : 0));
        s.lastDelta = s.value - prev;
        s.valueHist.push(s.value);
      });
    });

    // اكتشاف أهداف اللحظات الأخيرة (تقدّم أو تعادل بعد 85% من الوقت)
    let a = 0, b = 0;
    evs.filter((e) => e.type === "goal").sort((x, y) => (Number(x.minute) || 0) - (Number(y.minute) || 0)).forEach((e) => {
      const mine = e.side === "A";
      const before = (mine ? a : b) - (mine ? b : a);
      if (mine) a++; else b++;
      if ((Number(e.minute) || 0) >= total * 0.85 && before <= 0 && before >= -1 && stats[e.playerId]) stats[e.playerId].clutch++;
    });
  });

  const players = Object.values(stats).filter((s) => s.apps > 0);
  const topGoals = Math.max(0, ...players.map((p) => p.goals));
  players.forEach((s) => {
    s._boot = topGoals >= 2 && s.goals === topGoals;
    const per = (x) => (s.apps ? x / s.apps : 0);
    const winRate = per(s.wins);
    const csRate = per(s.cleanSheets);
    const score =
      s.goals * 4 + s.assists * 3 + s.wins * 1.5 + s.cleanSheets * (isGKDEF(s.pos) ? 3 : 1) +
      s.saves + s.motm * 4 - s.yellow - s.red * 4 + s.apps * 0.5;
    s.rating = clamp(58 + 38 * (1 - Math.exp(-score / 18)), 45, 99);
    s.tier = s.rating >= 85 ? "special" : s.rating >= 75 ? "gold" : s.rating >= 65 ? "silver" : "bronze";
    const phy = 58 + Math.min(s.apps, 10) * 2.5 - (s.yellow + s.red * 2) * 2;
    const pac = 52 + per(s.goals) * 15 + winRate * 12 + Math.min(s.apps, 10) * 1.2;
    s.attrs =
      s.pos === "GK"
        ? [
            { k: "DIV", v: clamp(50 + per(s.saves) * 6 + csRate * 20) }, { k: "HAN", v: clamp(50 + csRate * 35) },
            { k: "KIC", v: clamp(48 + per(s.assists) * 40) }, { k: "REF", v: clamp(50 + winRate * 30) },
            { k: "SPD", v: clamp(pac) }, { k: "POS", v: clamp(phy) },
          ]
        : [
            { k: "PAC", v: clamp(pac) }, { k: "SHO", v: clamp(45 + per(s.goals) * 38 + s.goals * 1.5) },
            { k: "PAS", v: clamp(45 + per(s.assists) * 42 + s.assists * 1.5) },
            { k: "DRI", v: clamp(48 + (per(s.goals) + per(s.assists)) * 20 + s.motm * 3 + winRate * 10) },
            { k: "DEF", v: clamp(45 + csRate * 30 + (isGKDEF(s.pos) ? 12 : 0)) }, { k: "PHY", v: clamp(phy) },
          ];
    s.badges = BADGES.map((b) => ({ ...b, n: b.test(s) })).filter((b) => b.n > 0);
    s.xp = Math.round(s.fp * 10 + s.badges.length * 50);
    s.lvl = levelInfo(s.xp);
    s.valueChangePct = s.valueHist.length > 1 ? ((s.value - s.valueHist[s.valueHist.length - 2]) / s.valueHist[s.valueHist.length - 2]) * 100 : 0;
  });
  players.sort((x, y) => y.rating - x.rating || y.fp - x.fp);

  const weeks = [...weekSet].sort().map((k, i) => ({
    key: k,
    label: `الأسبوع ${i + 1}${k !== "—" ? ` (${k})` : ""}`,
    top: players.map((p) => ({ id: p.id, name: p.name, teamName: p.teamName, fp: p.weekly[k] || 0 })).filter((x) => x.fp > 0).sort((x, y) => y.fp - x.fp).slice(0, 5),
  }));
  return { players, weeks };
}

/* ---------------- حاسبة التأهل ---------------- */
export function simulateGroup(teams, matches, groupId, hypo, qualifyN) {
  const merged = matches.map((m) => {
    const h = hypo[m.id];
    if (m.stage === "group" && m.group === groupId && !m.played && h && h.a !== "" && h.b !== "" && h.a != null && h.b != null) {
      return { ...m, played: true, scoreA: Number(h.a), scoreB: Number(h.b) };
    }
    return m;
  });
  const table = computeStandings(teams, merged, groupId);
  const real = computeStandings(teams, matches, groupId);
  const remainingOf = (id) => merged.filter((m) => m.stage === "group" && m.group === groupId && !m.played && (m.teamA === id || m.teamB === id)).length;
  const rows = table.map((t, i) => ({
    ...t,
    remaining: remainingOf(t.id),
    max: t.points + 3 * remainingOf(t.id),
    realRank: real.findIndex((r) => r.id === t.id),
    rank: i,
  }));
  rows.forEach((t) => {
    const others = rows.filter((u) => u.id !== t.id);
    const canCatch = others.filter((u) => u.max >= t.points).length; // فرق قد تلحق به
    const sure = others.filter((u) => u.points > t.max).length; // فرق متقدّمة عليه حتمًا
    t.status = canCatch < qualifyN ? "q" : sure >= qualifyN ? "out" : t.rank < qualifyN ? "in" : "chase";
  });
  return rows;
}
