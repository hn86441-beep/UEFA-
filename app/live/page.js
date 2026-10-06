"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Nav from "../../components/Nav";
import { LiveFlash, SoundToggle, eventMeta } from "../../components/LiveBits";
import { useLeagueData } from "../../lib/useLeagueData";
import { useEventSounds } from "../../lib/useEventSounds";
import { matchEventsTimeline } from "../../lib/logic";

export default function LivePage() {
  return (
    <Suspense>
      <LiveInner />
    </Suspense>
  );
}

function useRemaining(clock) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!clock?.running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [clock?.running, clock?.startedAt]);
  if (!clock) return null;
  const base = clock.remainingSeconds ?? clock.totalSeconds ?? 0;
  return Math.max(0, base - (clock.running && clock.startedAt ? (now - clock.startedAt) / 1000 : 0));
}

const fmt = (sec) =>
  `${Math.floor(sec / 60).toString().padStart(2, "0")}:${Math.floor(sec % 60).toString().padStart(2, "0")}`;
const rank = (m) => (m.clock?.running ? 0 : !m.played ? 1 : 2);
const VIEWS = [
  { id: "events", label: "الأحداث" },
  { id: "stats", label: "الإحصائيات" },
  { id: "lineups", label: "التشكيلة" },
];

function LiveInner() {
  const sp = useSearchParams();
  const [sel, setSel] = useState(sp.get("match") || "");
  const [view, setView] = useState("events");
  const [pollMs, setPollMs] = useState(3000);
  const [soundOn, setSoundOn] = useState(true);
  const { data, loading, error } = useLeagueData({ poll: pollMs, url: "/api/live" });
  const { flash, needsUnlock, unlock, hasClips, test, status } = useEventSounds(data, soundOn);

  const matches = data?.matches || [];
  const anyLive = matches.some((m) => m.clock?.running);
  useEffect(() => {
    setPollMs(anyLive ? 3000 : 12000);
  }, [anyLive]);

  const teamById = useMemo(() => Object.fromEntries((data?.teams || []).map((t) => [t.id, t])), [data?.teams]);
  const sorted = useMemo(() => [...matches].sort((a, b) => rank(a) - rank(b)), [matches]);
  const match = matches.find((m) => m.id === sel) || sorted[0];
  const teamA = match ? teamById[match.teamA] : null;
  const teamB = match ? teamById[match.teamB] : null;

  const asc = useMemo(() => (match ? matchEventsTimeline(match, teamA, teamB) : []), [match, teamA, teamB]);
  const desc = useMemo(() => [...asc].reverse(), [asc]);
  const goals = useMemo(() => asc.filter((e) => e.type === "goal"), [asc]);

  const stats = useMemo(() => {
    const count = {};
    asc.forEach((e) => {
      count[e.type] = count[e.type] || { A: 0, B: 0 };
      count[e.type][e.side === "B" ? "B" : "A"] += 1;
    });
    const base = ["goal", "save", "yellow", "red"];
    const extra = Object.keys(count).filter((t) => !base.includes(t));
    return [...base, ...extra].map((t) => ({ type: t, a: count[t]?.A || 0, b: count[t]?.B || 0 }));
  }, [asc]);

  const remaining = useRemaining(match?.clock);
  const isLive = !!match?.clock?.running;
  const totalMin = (match?.clock?.totalSeconds || 900) / 60;
  const elapsedMin = match?.played && !isLive ? totalMin : remaining == null ? 0 : totalMin - remaining / 60;
  const status2 = isLive ? "مباشر الآن" : match?.played ? "انتهت المباراة" : "لم تبدأ بعد";
  const showScore = isLive || match?.played || match?.scoreA != null;
  const motm = match?.motm ? (match.motm.side === "B" ? teamB : teamA)?.players?.find((p) => p.id === match.motm.playerId) : null;

  function share() {
    if (!match) return;
    const url = `${location.origin}/live?match=${match.id}`;
    const text = `${teamA?.name} ${match.scoreA ?? 0} - ${match.scoreB ?? 0} ${teamB?.name}\n${data?.settings?.leagueName || ""}`;
    if (navigator.share) navigator.share({ title: "نتيجة مباشرة", text, url }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank");
  }

  return (
    <>
      <Nav leagueName={data?.settings?.leagueName} />
      <LiveFlash event={flash} />
      <main className="max-w-5xl mx-auto px-3 sm:px-4 pb-24 pt-5 sm:pt-8 overflow-x-hidden">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <h1 className="font-brand text-2xl sm:text-4xl gold-text">📺 المباشر</h1>
          <Link href="/" className="text-xs px-3 py-2 rounded-full border border-white/15 text-white/60 hover:text-white">
            الرئيسية
          </Link>
        </div>
        <div className="mb-4">
          <SoundToggle on={soundOn} setOn={setSoundOn} needsUnlock={needsUnlock} unlock={unlock} hasClips={hasClips} test={test} status={status} />
        </div>

        {loading && <p className="text-center text-white/40 py-24 font-display text-2xl">جارِ التحميل...</p>}
        {!loading && !data && <p className="text-center text-white/60 py-24">تعذر تحميل البيانات{error ? `: ${error}` : ""}</p>}
        {!loading && data && !match && <p className="text-center text-white/50 py-24">لا توجد مباريات بعد.</p>}

        {match && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-3 px-3 snap-x">
              {sorted.slice(0, 16).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSel(m.id)}
                  className={`snap-start shrink-0 text-[11px] sm:text-xs px-3 py-2 rounded-lg border transition flex items-center gap-1.5 whitespace-nowrap ${
                    m.id === match.id ? "border-gold/70 bg-gold/10 text-gold2" : "border-white/10 text-white/60"
                  }`}
                >
                  {m.clock?.running && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                  {teamById[m.teamA]?.name} × {teamById[m.teamB]?.name}
                </button>
              ))}
            </div>

            <section className={`glass-card rounded-2xl p-4 sm:p-8 mb-4 text-center border ${isLive ? "border-red-500/40" : "border-white/10"}`}>
              <p className={`text-[11px] sm:text-xs mb-3 flex items-center justify-center gap-2 flex-wrap ${isLive ? "text-red-400" : "text-white/40"}`}>
                {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                {status2}
                {isLive && remaining != null && <span className="font-display text-base tabular-nums text-white">⏱ {fmt(remaining)}</span>}
                {match.stage === "knockout" && match.round ? <span className="text-gold2/70">• {match.round}</span> : null}
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <p className="min-w-0 font-brand text-base sm:text-3xl text-white leading-tight break-words">{teamA?.name || "؟"}</p>
                <p className="font-display text-4xl sm:text-7xl text-gold2 tabular-nums px-1">
                  {showScore ? `${match.scoreA ?? 0}-${match.scoreB ?? 0}` : "VS"}
                </p>
                <p className="min-w-0 font-brand text-base sm:text-3xl text-white leading-tight break-words">{teamB?.name || "؟"}</p>
              </div>
              {goals.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-white/55">
                  {["A", "B"].map((side) => (
                    <div key={side} className={`min-w-0 space-y-0.5 ${side === "A" ? "text-start" : "text-end"}`}>
                      {goals.filter((e) => (e.side === "B" ? "B" : "A") === side).map((e) => (
                        <p key={e.id} className="truncate">⚽ {e.playerName} {e.minute ? `${e.minute}'` : ""}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-center gap-2 mt-3 flex-wrap text-[11px] text-white/40">
                {(match.date || match.time) && <span>🕐 {[match.date, match.time].filter(Boolean).join(" — ")}</span>}
                {match.venue && <span>📍 {match.venue}</span>}
                {motm && <span className="text-gold2/80">⭐ أفضل لاعب: {motm.name}</span>}
              </div>
              <button onClick={share} className="mt-3 text-[11px] px-3 py-1.5 rounded-full border border-green-500/40 text-green-300">
                📤 مشاركة النتيجة
              </button>
            </section>

            <EventStrip events={asc} total={totalMin} elapsed={elapsedMin} />

            <div className="flex gap-1.5 my-4 lg:hidden">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${view === v.id ? "bg-gold/90 text-black" : "glass-card text-white/70"}`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-5 gap-4 lg:mt-4">
              <section className={`${view === "events" ? "block" : "hidden"} lg:block lg:col-span-3 glass-card rounded-2xl p-3 sm:p-5`}>
                <h2 className="font-display text-lg sm:text-xl text-gold2 mb-3">أحداث المباراة</h2>
                {desc.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-8">لا توجد أحداث مسجّلة بعد.</p>
                ) : (
                  <div className="space-y-2">
                    {desc.map((e) => {
                      const m = eventMeta(e.type);
                      const card = (
                        <div className={`rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs sm:text-sm break-words ${m.color}`}>
                          {m.icon} {e.playerName || m.label}
                          <span className="block text-[10px] text-white/40">{m.label}</span>
                          {e.assistId && (
                            <span className="block text-[10px] text-sky-300/80">
                              🅰️ {(e.side === "B" ? teamB : teamA)?.players?.find((pl) => pl.id === e.assistId)?.name}
                            </span>
                          )}
                        </div>
                      );
                      return (
                        <div key={e.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                          <div className="min-w-0">{e.side !== "B" ? card : null}</div>
                          <span className="font-display text-xs text-white/50 tabular-nums w-8 text-center">{e.minute ? `${e.minute}'` : "•"}</span>
                          <div className="min-w-0">{e.side === "B" ? card : null}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {match.notes && <p className="text-[11px] text-white/40 mt-4 pt-3 border-t border-white/5">📋 {match.notes}</p>}
              </section>

              <section className={`${view === "stats" ? "block" : "hidden"} lg:block lg:col-span-2 glass-card rounded-2xl p-3 sm:p-5 h-fit`}>
                <h2 className="font-display text-lg sm:text-xl text-gold2 mb-3">الإحصائيات</h2>
                <div className="flex justify-between text-xs text-white/50 mb-3 gap-2">
                  <span className="truncate">{teamA?.name}</span>
                  <span className="truncate">{teamB?.name}</span>
                </div>
                <div className="space-y-4">
                  {stats.map((s) => {
                    const m = eventMeta(s.type);
                    const total = s.a + s.b;
                    return (
                      <div key={s.type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display text-lg text-gold2 w-8">{s.a}</span>
                          <span className="text-white/60 text-xs">{m.icon} {m.label}</span>
                          <span className="font-display text-lg text-sky-300 w-8 text-end">{s.b}</span>
                        </div>
                        <div className="flex h-1.5 rounded overflow-hidden bg-white/5 gap-0.5">
                          <div className="bg-gold/80 transition-all duration-500" style={{ width: total ? `${(s.a / total) * 100}%` : 0 }} />
                          <div className="bg-sky-400/70 transition-all duration-500" style={{ width: total ? `${(s.b / total) * 100}%` : 0 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className={`${view === "lineups" ? "block" : "hidden"} lg:block lg:col-span-5 glass-card rounded-2xl p-3 sm:p-5`}>
                <h2 className="font-display text-lg sm:text-xl text-gold2 mb-3">🧩 التشكيلة</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Lineup team={teamA} lineup={match.lineups?.A} />
                  <Lineup team={teamB} lineup={match.lineups?.B} />
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </>
  );
}

// شريط زمني للمباراة: التقدّم الحالي + أيقونات الأحداث (الفريق الأول فوق الخط والثاني تحته)
function EventStrip({ events, total, elapsed }) {
  const max = Math.max(total, ...events.map((e) => Number(e.minute) || 0), 1);
  const pos = (m) => `${Math.min(100, Math.max(0, (m / max) * 100))}%`;
  return (
    <div className="glass-card rounded-2xl px-4 py-3">
      <div className="relative h-14">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded bg-white/10 overflow-hidden">
          <div className="h-full bg-gold/70 transition-all duration-1000" style={{ width: pos(elapsed) }} />
        </div>
        {events.map((e) => (
          <span
            key={e.id}
            className={`absolute text-sm ${e.side === "B" ? "bottom-0" : "top-0"}`}
            style={{ insetInlineStart: pos(Number(e.minute) || 0), marginInlineStart: "-0.55em" }}
          >
            {eventMeta(e.type).icon}
          </span>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-white/30 tabular-nums">
        <span>0′</span>
        <span>{Math.round(max)}′</span>
      </div>
    </div>
  );
}

function Lineup({ team, lineup }) {
  const names = (ids) => (ids || []).map((id) => team?.players?.find((p) => p.id === id)?.name).filter(Boolean);
  const start = names(lineup?.starting);
  const subs = names(lineup?.subs);
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-white mb-1 truncate">{team?.name}</p>
      {start.length === 0 && subs.length === 0 ? (
        <p className="text-[11px] text-white/30">لم تُعلن التشكيلة بعد.</p>
      ) : (
        <>
          <ul className="space-y-0.5 text-xs text-white/70">
            {start.map((n) => <li key={n} className="truncate">• {n}</li>)}
          </ul>
          {subs.length > 0 && (
            <>
              <p className="text-[10px] text-white/30 mt-2 mb-0.5">الاحتياط</p>
              <ul className="space-y-0.5 text-xs text-white/50">
                {subs.map((n) => <li key={n} className="truncate">• {n}</li>)}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
