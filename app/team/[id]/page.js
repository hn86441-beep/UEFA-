"use client";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Nav from "../../../components/Nav";
import { kickoffMs, countdownParts, useNow } from "../../../components/UpcomingResults";
import { useLeagueData } from "../../../lib/useLeagueData";
import { computeStandings } from "../../../lib/logic";

const POS = { GK: "حارس", DEF: "مدافع", MID: "وسط", FWD: "مهاجم" };
const BADGE = {
  W: "bg-green-500/20 text-green-300 border-green-500/40",
  D: "bg-white/10 text-white/70 border-white/20",
  L: "bg-red-500/20 text-red-300 border-red-500/40",
};
const BADGE_LABEL = { W: "ف", D: "ت", L: "خ" };
const p2 = (n) => String(n).padStart(2, "0");

function dateLabel(m) {
  if (!m.date) return "بدون موعد محدد";
  try {
    const d = new Date(`${m.date}T00:00:00`).toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long" });
    return `${d}${m.time ? ` — ${m.time}` : ""}`;
  } catch {
    return `${m.date}${m.time ? ` — ${m.time}` : ""}`;
  }
}
function stageLabel(m) {
  return m.stage === "knockout" ? m.round || "خروج المغلوب" : m.round === 2 ? "إياب" : "ذهاب";
}

export default function TeamPage() {
  const params = useParams();
  const id = decodeURIComponent(String(params?.id || ""));
  const { data, loading, error } = useLeagueData({ poll: 15000, url: "/api/live" });
  const now = useNow(1000);

  const view = useMemo(() => {
    if (!data) return null;
    const teams = data.teams || [];
    const matches = data.matches || [];
    const team = teams.find((t) => t.id === id);
    if (!team) return { team: null };
    const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));

    const mine = matches.filter((m) => m.teamA === id || m.teamB === id);
    const rows = mine.map((m) => {
      const side = m.teamA === id ? "A" : "B";
      const oppId = side === "A" ? m.teamB : m.teamA;
      const my = side === "A" ? m.scoreA : m.scoreB;
      const op = side === "A" ? m.scoreB : m.scoreA;
      let res = null;
      if (m.played && my != null && op != null) {
        res = my > op ? "W" : my < op ? "L" : m.winner ? (m.winner === id ? "W" : "L") : "D";
      }
      return { m, side, opp: teamById[oppId], my, op, res, live: !!m.clock?.running };
    });

    const played = rows.filter((r) => r.res && !r.live);
    const byDateDesc = (a, b) => (kickoffMs(b.m) ?? -1) - (kickoffMs(a.m) ?? -1);
    const results = [...played].sort(byDateDesc);
    const upcoming = rows
      .filter((r) => !r.res && !r.live)
      .sort((a, b) => (kickoffMs(a.m) ?? Infinity) - (kickoffMs(b.m) ?? Infinity));
    const liveRows = rows.filter((r) => r.live);

    const st = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    played.forEach((r) => {
      st.p++;
      st.gf += r.my;
      st.ga += r.op;
      if (r.my > r.op) st.w++;
      else if (r.my < r.op) st.l++;
      else st.d++;
    });

    // ترتيب الفريق داخل مجموعته
    let rank = null;
    let points = null;
    let groupName = null;
    if (team.group) {
      const table = computeStandings(teams, matches, team.group);
      const i = table.findIndex((t) => t.id === id);
      if (i >= 0) {
        rank = i + 1;
        points = table[i].points;
      }
      groupName = data.groups?.find((g) => g.id === team.group)?.name || null;
    }

    // إحصاءات اللاعبين من أحداث المباريات
    const pl = {};
    (team.players || []).forEach((p) => (pl[p.id] = { ...p, goals: 0, assists: 0, yellow: 0, red: 0, saves: 0 }));
    mine.forEach((m) => {
      const side = m.teamA === id ? "A" : "B";
      (m.events || []).filter((e) => e.side === side).forEach((e) => {
        if (e.type === "goal") {
          if (pl[e.playerId]) pl[e.playerId].goals++;
          if (e.assistId && pl[e.assistId]) pl[e.assistId].assists++;
        } else if (e.type === "yellow" && pl[e.playerId]) pl[e.playerId].yellow++;
        else if (e.type === "red" && pl[e.playerId]) pl[e.playerId].red++;
        else if (e.type === "save" && pl[e.playerId]) pl[e.playerId].saves++;
      });
    });
    const players = Object.values(pl).sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name, "ar"));

    return { team, st, rank, points, groupName, results, upcoming, liveRows, players, form: results.slice(0, 5).map((r) => r.res).reverse() };
  }, [data, id]);

  const leagueName = data?.settings?.leagueName;

  if (loading) {
    return (
      <>
        <Nav leagueName={leagueName} />
        <main className="max-w-4xl mx-auto px-4 py-24 text-center text-white/40 font-display text-2xl">جارِ التحميل...</main>
      </>
    );
  }
  if (error || !data) {
    return (
      <>
        <Nav />
        <main className="max-w-4xl mx-auto px-4 py-24 text-center text-white/60">تعذر تحميل البيانات{error ? `: ${error}` : ""}</main>
      </>
    );
  }
  if (!view?.team) {
    return (
      <>
        <Nav leagueName={leagueName} />
        <main className="max-w-4xl mx-auto px-4 py-24 text-center">
          <p className="text-white/60 mb-4">الفريق غير موجود.</p>
          <Link href="/" className="text-gold2 underline">العودة للرئيسية</Link>
        </main>
      </>
    );
  }

  const { team, st, rank, points, groupName, results, upcoming, liveRows, players, form } = view;
  const next = upcoming.find((r) => kickoffMs(r.m) !== null);
  const cd = next ? countdownParts(kickoffMs(next.m), now) : null;
  const topScorer = players[0]?.goals > 0 ? players[0] : null;

  return (
    <>
      <Nav leagueName={leagueName} />
      <main className="max-w-4xl mx-auto px-3 sm:px-4 pb-24 pt-6 space-y-5">
        {/* الترويسة */}
        <section className="glass-card rounded-2xl p-5 sm:p-7 text-center">
          <p className="text-gold2/70 text-xs mb-1">{groupName ? `المجموعة ${groupName}` : "الفريق"}</p>
          <h1 className="font-brand text-4xl sm:text-6xl gold-text mb-3">{team.name}</h1>
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            {rank && <span className="text-xs px-3 py-1 rounded-full border border-gold/40 text-gold2">المركز {rank} في المجموعة</span>}
            {form.length > 0 && (
              <span className="flex items-center gap-1" title="آخر النتائج">
                {form.map((r, i) => (
                  <span key={i} className={`w-6 h-6 rounded-full border text-[11px] flex items-center justify-center font-bold ${BADGE[r]}`}>{BADGE_LABEL[r]}</span>
                ))}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 max-w-xl mx-auto">
            {[
              ["لعب", st.p],
              ["فوز", st.w],
              ["تعادل", st.d],
              ["خسارة", st.l],
              ["له", st.gf],
              ["عليه", st.ga],
              ["نقاط", points ?? "—"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-black/25 border border-white/10 py-2">
                <p className="font-display text-2xl text-gold2 leading-none">{v}</p>
                <p className="text-[10px] text-white/40 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* مباشر الآن */}
        {liveRows.map((r) => (
          <Link key={r.m.id} href={`/live?match=${r.m.id}`} className="block rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-center">
            <p className="text-red-300 text-xs mb-1 flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> مباشر الآن — اضغط للمتابعة</p>
            <p className="font-semibold">
              {team.name} <span className="font-display text-xl text-gold2 px-2">{r.my ?? 0} - {r.op ?? 0}</span> {r.opp?.name}
            </p>
          </Link>
        ))}

        {/* المباراة القادمة */}
        {next && (
          <section className="glass-card rounded-2xl p-4 text-center">
            <p className="text-xs text-white/50 mb-1">المباراة القادمة — {dateLabel(next.m)}</p>
            <p className="font-semibold mb-2">
              {team.name} <span className="text-white/30 px-1">×</span>{" "}
              {next.opp ? <Link href={`/team/${next.opp.id}`} className="hover:text-gold2">{next.opp.name}</Link> : "—"}
            </p>
            {cd.done ? (
              <p className="font-display text-xl text-green-300 animate-pulse">حان موعدها</p>
            ) : (
              <p className="font-display text-3xl text-gold2 tabular-nums" dir="ltr">
                {cd.d > 0 ? `${cd.d}d ` : ""}{p2(cd.h)}:{p2(cd.m)}:{p2(cd.s)}
              </p>
            )}
          </section>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {/* جدول المباريات القادمة */}
          <section className="glass-card rounded-2xl p-4">
            <h2 className="font-display text-xl text-gold2 mb-3">📅 جدول المباريات</h2>
            {upcoming.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-3">لا مباريات قادمة.</p>
            ) : (
              <div className="space-y-1.5">
                {upcoming.map((r) => (
                  <div key={r.m.id} className="rounded-lg border border-white/10 px-3 py-2">
                    <p className="text-[11px] text-white/40 mb-0.5">{stageLabel(r.m)} · 🕐 {dateLabel(r.m)}{r.m.venue ? ` · ${r.m.venue}` : ""}</p>
                    <p className="text-sm">
                      <span className="text-white/40 text-xs">{r.side === "A" ? "(أرضه) " : "(خارج) "}</span>
                      {r.opp ? <Link href={`/team/${r.opp.id}`} className="hover:text-gold2">{r.opp.name}</Link> : "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* النتائج */}
          <section className="glass-card rounded-2xl p-4">
            <h2 className="font-display text-xl text-gold2 mb-3">✅ النتائج</h2>
            {results.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-3">لا نتائج بعد.</p>
            ) : (
              <div className="space-y-1.5">
                {results.map((r) => (
                  <div key={r.m.id} className="rounded-lg border border-white/10 px-3 py-2 flex items-center gap-2">
                    <span className={`w-6 h-6 shrink-0 rounded-full border text-[11px] flex items-center justify-center font-bold ${BADGE[r.res]}`}>{BADGE_LABEL[r.res]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white/40">{stageLabel(r.m)}{r.m.date ? ` · ${r.m.date}` : ""}</p>
                      <p className="text-sm truncate">
                        {r.opp ? <Link href={`/team/${r.opp.id}`} className="hover:text-gold2">{r.opp.name}</Link> : "—"}
                      </p>
                    </div>
                    <span className="font-display text-lg text-gold2 tabular-nums">{r.my} - {r.op}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* التشكيلة والهدافون */}
        <section className="glass-card rounded-2xl p-4">
          <h2 className="font-display text-xl text-gold2 mb-1">👥 اللاعبون والهدافون</h2>
          {topScorer && <p className="text-xs text-white/50 mb-3">هدّاف الفريق: <b className="text-gold2">{topScorer.name}</b> ({topScorer.goals} ⚽)</p>}
          {players.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-3">لم تُسجَّل قائمة اللاعبين بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs">
                    <th className="text-right font-normal pb-2">اللاعب</th>
                    <th className="font-normal pb-2">⚽</th>
                    <th className="font-normal pb-2">🅰️</th>
                    <th className="font-normal pb-2">🧤</th>
                    <th className="font-normal pb-2">🟨</th>
                    <th className="font-normal pb-2">🟥</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.id} className="border-t border-white/5">
                      <td className="py-2">
                        <span className="font-semibold">{p.name}</span>
                        {team.captainId === p.id && <span className="text-[10px] mr-1.5 px-1.5 py-0.5 rounded border border-gold/40 text-gold2">C</span>}
                        {p.pos && <span className="text-[11px] text-white/35 mr-2">{POS[p.pos] || p.pos}</span>}
                      </td>
                      <td className="text-center font-display text-lg text-gold2">{p.goals || "·"}</td>
                      <td className="text-center">{p.assists || "·"}</td>
                      <td className="text-center">{p.saves || "·"}</td>
                      <td className="text-center">{p.yellow || "·"}</td>
                      <td className="text-center">{p.red || "·"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-center"><Link href="/" className="text-xs text-white/40 hover:text-gold2">← العودة إلى الترتيب</Link></p>
      </main>
    </>
  );
}
