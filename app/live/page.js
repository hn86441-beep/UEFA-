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

function fmt(sec) {
  const mm = Math.floor(sec / 60).toString().padStart(2, "0");
  const ss = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

const rank = (m) => (m.clock?.running ? 0 : !m.played ? 1 : 2);

function LiveInner() {
  const sp = useSearchParams();
  const [sel, setSel] = useState(sp.get("match") || "");
  const [pollMs, setPollMs] = useState(3000);
  const [soundOn, setSoundOn] = useState(true);
  const { data, loading, error } = useLeagueData({ poll: pollMs, url: "/api/live" });
  const { flash, needsUnlock, unlock, hasClips } = useEventSounds(data, soundOn);

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

  const timeline = useMemo(
    () => (match ? matchEventsTimeline(match, teamA, teamB) : []),
    [match, teamA, teamB]
  );
  const ordered = useMemo(() => [...timeline].sort((a, b) => (Number(b.minute) || 0) - (Number(a.minute) || 0)), [timeline]);

  const stats = useMemo(() => {
    const count = {};
    timeline.forEach((e) => {
      count[e.type] = count[e.type] || { A: 0, B: 0 };
      count[e.type][e.side === "B" ? "B" : "A"] += 1;
    });
    const base = ["goal", "save", "yellow", "red"];
    const extra = Object.keys(count).filter((t) => !base.includes(t));
    return [...base, ...extra].map((t) => ({ type: t, a: count[t]?.A || 0, b: count[t]?.B || 0 }));
  }, [timeline]);

  const remaining = useRemaining(match?.clock);
  const isLive = !!match?.clock?.running;
  const status = isLive ? "مباشر الآن" : match?.played ? "انتهت المباراة" : "لم تبدأ بعد";
  const showScore = isLive || match?.played;

  return (
    <>
      <Nav leagueName={data?.settings?.leagueName} />
      <LiveFlash event={flash} />
      <main className="max-w-5xl mx-auto px-4 pb-24 pt-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <h1 className="font-brand text-3xl sm:text-4xl gold-text">📺 المباريات المباشرة</h1>
          <div className="flex items-center gap-2">
            <SoundToggle on={soundOn} setOn={setSoundOn} needsUnlock={needsUnlock} unlock={unlock} hasClips={hasClips} />
            <Link href="/" className="text-xs px-4 py-2 rounded-full border border-white/15 text-white/60 hover:text-white">
              الرئيسية
            </Link>
          </div>
        </div>

        {loading && <p className="text-center text-white/40 py-24 font-display text-2xl">جارِ التحميل...</p>}
        {!loading && (error || !data) && <p className="text-center text-white/60 py-24">تعذر تحميل البيانات{error ? `: ${error}` : ""}</p>}
        {!loading && data && !match && <p className="text-center text-white/50 py-24">لا توجد مباريات بعد.</p>}

        {match && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
              {sorted.slice(0, 16).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSel(m.id)}
                  className={`shrink-0 text-xs px-3 py-2 rounded-lg border transition flex items-center gap-1.5 ${
                    m.id === match.id ? "border-gold/70 bg-gold/10 text-gold2" : "border-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  {m.clock?.running && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                  {teamById[m.teamA]?.name} <span className="text-white/30">×</span> {teamById[m.teamB]?.name}
                </button>
              ))}
            </div>

            <section className={`glass-card rounded-2xl p-6 sm:p-8 mb-6 text-center border ${isLive ? "border-red-500/40" : "border-white/10"}`}>
              <p className={`text-xs mb-4 flex items-center justify-center gap-2 ${isLive ? "text-red-400" : "text-white/40"}`}>
                {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                {status}
                {isLive && remaining != null && <span className="font-display text-base tabular-nums text-white">⏱ {fmt(remaining)}</span>}
                {match.stage === "knockout" && match.round ? <span className="text-gold2/70">• {match.round}</span> : null}
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <p className="font-brand text-xl sm:text-3xl text-white truncate">{teamA?.name || "؟"}</p>
                <p className="font-display text-5xl sm:text-7xl text-gold2 tabular-nums px-2">
                  {showScore ? `${match.scoreA ?? 0} - ${match.scoreB ?? 0}` : "VS"}
                </p>
                <p className="font-brand text-xl sm:text-3xl text-white truncate">{teamB?.name || "؟"}</p>
              </div>
              {(match.date || match.time) && (
                <p className="text-[11px] text-white/35 mt-4">🕐 {[match.date, match.time].filter(Boolean).join(" — ")}</p>
              )}
            </section>

            <div className="grid lg:grid-cols-5 gap-6">
              <section className="glass-card rounded-2xl p-5 lg:col-span-3">
                <h2 className="font-display text-xl text-gold2 mb-4">أحداث المباراة</h2>
                {ordered.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-8">لا توجد أحداث مسجّلة بعد.</p>
                ) : (
                  <div className="space-y-2">
                    {ordered.map((e) => {
                      const m = eventMeta(e.type);
                      const card = (
                        <div className={`rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm ${m.color}`}>
                          <span className="ml-1">{m.icon}</span>
                          {e.playerName || m.label}
                          <span className="block text-[10px] text-white/40">{(e.side === "B" ? teamB : teamA)?.name} · {m.label}</span>
                        </div>
                      );
                      return (
                        <div key={e.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <div>{e.side !== "B" ? card : null}</div>
                          <span className="font-display text-xs text-white/50 tabular-nums w-10 text-center">{e.minute ? `${e.minute}'` : "•"}</span>
                          <div>{e.side === "B" ? card : null}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {match.notes && <p className="text-[11px] text-white/40 mt-4 pt-3 border-t border-white/5">📋 {match.notes}</p>}
              </section>

              <section className="glass-card rounded-2xl p-5 lg:col-span-2 h-fit">
                <h2 className="font-display text-xl text-gold2 mb-4">الإحصائيات</h2>
                <div className="flex justify-between text-xs text-white/50 mb-3">
                  <span>{teamA?.name}</span>
                  <span>{teamB?.name}</span>
                </div>
                <div className="space-y-4">
                  {stats.map((s) => {
                    const m = eventMeta(s.type);
                    const total = s.a + s.b;
                    return (
                      <div key={s.type}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-display text-lg text-gold2 w-8">{s.a}</span>
                          <span className="text-white/60 text-xs">{m.icon} {m.label}</span>
                          <span className="font-display text-lg text-sky-300 w-8 text-left">{s.b}</span>
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
            </div>
          </>
        )}
      </main>
    </>
  );
}
