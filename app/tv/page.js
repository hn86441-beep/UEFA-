"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLeagueData } from "../../lib/useLeagueData";
import { useEventSounds } from "../../lib/useEventSounds";
import { LiveFlash, eventMeta } from "../../components/LiveBits";
import { upcomingMatches, recentResults, kickoffMs, countdownParts, useNow } from "../../components/UpcomingResults";
import { computeStandings, computeTopScorers, matchEventsTimeline } from "../../lib/logic";

const DWELL = 12000; // مدة كل شريحة (مللي ثانية)
const LIVE_DWELL = 15000;
const p2 = (n) => String(n).padStart(2, "0");

function remainingOf(clock, now) {
  if (!clock) return 0;
  const base = clock.remainingSeconds ?? clock.totalSeconds ?? 0;
  return Math.max(0, base - (clock.running && clock.startedAt ? (now - clock.startedAt) / 1000 : 0));
}

export default function TvPage() {
  const [pollMs, setPollMs] = useState(5000);
  const { data, loading, error } = useLeagueData({ poll: pollMs, url: "/api/live" });
  const [soundOn] = useState(true);
  const { flash, needsUnlock, unlock, hasClips } = useEventSounds(data, soundOn);
  const now = useNow(1000);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const matches = data?.matches || [];
  const teams = data?.teams || [];
  const groups = data?.groups || [];
  const anyLive = matches.some((m) => m.clock?.running);
  useEffect(() => setPollMs(anyLive ? 3000 : 8000), [anyLive]);

  const teamById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);

  // بناء الشرائح المتبدّلة
  const slides = useMemo(() => {
    if (!data) return [];
    const base = [];
    if (groups.length > 0) {
      // مجموعتان في كل شريحة
      for (let i = 0; i < groups.length; i += 2) base.push({ kind: "standings", groups: groups.slice(i, i + 2), key: `st${i}` });
    } else if (teams.length > 0) {
      base.push({ kind: "table", key: "table" });
    }
    if (upcomingMatches(matches, 1).length || recentResults(matches, 1).length) base.push({ kind: "fixtures", key: "fx" });
    if (computeTopScorers(teams, matches).length) base.push({ kind: "scorers", key: "sc" });
    if (matches.some((m) => m.stage === "knockout")) base.push({ kind: "bracket", key: "ko" });
    if (base.length === 0) base.push({ kind: "empty", key: "empty" });

    const live = matches.filter((m) => m.clock?.running);
    if (live.length === 0) return base;
    // المباراة المباشرة تظهر قبل كل شريحة عادية
    return base.flatMap((s) => [...live.map((m) => ({ kind: "live", matchId: m.id, key: `live${m.id}_${s.key}` })), s]);
  }, [data, groups, teams, matches]);

  const safeIdx = slides.length ? idx % slides.length : 0;
  const slide = slides[safeIdx];

  const next = useCallback(() => setIdx((i) => i + 1), []);
  const prev = useCallback(() => setIdx((i) => (i - 1 + Math.max(1, slides.length)) % Math.max(1, slides.length)), [slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setTimeout(next, slide?.kind === "live" ? LIVE_DWELL : DWELL);
    return () => clearTimeout(t);
  }, [paused, slides.length, safeIdx, slide?.kind, next]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") next();
      else if (e.key === "ArrowRight") prev();
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === "f" || e.key === "F") toggleFs();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  function toggleFs() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    } catch {}
  }

  if (loading) return <Frame><p className="text-center text-white/40 font-display text-5xl py-40">جارِ التحميل...</p></Frame>;
  if (error || !data) return <Frame><p className="text-center text-white/60 text-3xl py-40">تعذر تحميل البيانات{error ? `: ${error}` : ""}</p></Frame>;

  return (
    <Frame>
      <LiveFlash event={flash} />
      <header className="flex items-center justify-between px-6 lg:px-12 pt-5">
        <h1 className="font-brand text-3xl lg:text-5xl gold-text">★ {data.settings?.leagueName || "دوري الأبطال"}</h1>
        <div className="flex items-center gap-3 text-white/40 text-sm">
          {anyLive && <span className="flex items-center gap-2 text-red-300 text-lg"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> مباشر</span>}
          <span className="font-display text-2xl tabular-nums" dir="ltr">{p2(new Date(now).getHours())}:{p2(new Date(now).getMinutes())}</span>
        </div>
      </header>

      <div key={slide?.key} className="tab-transition flex-1 px-6 lg:px-12 py-5 flex flex-col justify-center">
        {slide?.kind === "standings" && <StandingsSlide groupsPair={slide.groups} teams={teams} matches={matches} />}
        {slide?.kind === "table" && <GeneralTableSlide teams={teams} />}
        {slide?.kind === "fixtures" && <FixturesSlide matches={matches} teamById={teamById} now={now} />}
        {slide?.kind === "scorers" && <ScorersSlide teams={teams} matches={matches} />}
        {slide?.kind === "bracket" && <BracketSlide matches={matches} teamById={teamById} />}
        {slide?.kind === "live" && <LiveSlide match={matches.find((m) => m.id === slide.matchId)} teamById={teamById} now={now} />}
        {slide?.kind === "empty" && <p className="text-center text-white/40 text-4xl py-24">لا توجد بيانات لعرضها بعد.</p>}
      </div>

      <footer className="px-6 lg:px-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button key={s.key} onClick={() => setIdx(i)} aria-label={`شريحة ${i + 1}`} className={`h-2 rounded-full transition-all ${i === safeIdx ? "w-8 bg-gold" : "w-2 bg-white/20 hover:bg-white/40"}`} />
          ))}
        </div>
        <div className="flex items-center gap-2 opacity-40 hover:opacity-100 transition">
          {hasClips && needsUnlock && (
            <button onClick={unlock} className="text-xs px-3 py-1.5 rounded-full border border-gold bg-gold/15 text-gold2 animate-pulse">🔔 تفعيل الصوت</button>
          )}
          <button onClick={prev} className="text-xs px-3 py-1.5 rounded-full border border-white/20">◀</button>
          <button onClick={() => setPaused((p) => !p)} className="text-xs px-3 py-1.5 rounded-full border border-white/20">{paused ? "▶ تشغيل" : "⏸ إيقاف"}</button>
          <button onClick={next} className="text-xs px-3 py-1.5 rounded-full border border-white/20">▶</button>
          <button onClick={toggleFs} className="text-xs px-3 py-1.5 rounded-full border border-white/20">⛶ ملء الشاشة</button>
        </div>
      </footer>
    </Frame>
  );
}

function Frame({ children }) {
  return <main dir="rtl" className="min-h-screen flex flex-col overflow-hidden select-none">{children}</main>;
}

function SlideTitle({ children }) {
  return <h2 className="font-display text-4xl lg:text-6xl text-gold2 text-center mb-6 lg:mb-8">{children}</h2>;
}

/* ---------- الترتيب ---------- */
function StandingsSlide({ groupsPair, teams, matches }) {
  return (
    <div>
      <SlideTitle>جدول الترتيب</SlideTitle>
      <div className={`grid gap-6 lg:gap-10 ${groupsPair.length > 1 ? "lg:grid-cols-2" : "max-w-4xl mx-auto w-full"}`}>
        {groupsPair.map((g) => {
          const table = computeStandings(teams, matches, g.id);
          return (
            <div key={g.id} className="glass-card rounded-3xl p-5 lg:p-8">
              <h3 className="font-display text-3xl lg:text-5xl text-gold2 mb-4">المجموعة {g.name}</h3>
              <BigTable rows={table} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GeneralTableSlide({ teams }) {
  const rows = [...teams].sort((a, b) => (b.points || 0) - (a.points || 0) || (b.gf - b.ga) - (a.gf - a.ga)).slice(0, 12);
  return (
    <div className="max-w-5xl mx-auto w-full">
      <SlideTitle>جدول الترتيب العام</SlideTitle>
      <div className="glass-card rounded-3xl p-5 lg:p-8"><BigTable rows={rows} /></div>
    </div>
  );
}

function BigTable({ rows }) {
  return (
    <table className="w-full text-2xl lg:text-4xl">
      <thead>
        <tr className="text-white/40 text-lg lg:text-2xl">
          <th className="text-right font-normal pb-3 w-12">#</th>
          <th className="text-right font-normal pb-3">الفريق</th>
          <th className="font-normal pb-3">لعب</th>
          <th className="font-normal pb-3">فارق</th>
          <th className="font-normal pb-3">نقاط</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t, i) => (
          <tr key={t.id} className={`border-t border-white/10 ${i < 2 ? "text-white" : "text-white/65"}`}>
            <td className="py-2 lg:py-3 text-gold2/70 font-display">{i + 1}</td>
            <td className="py-2 lg:py-3 font-bold truncate max-w-[14rem] lg:max-w-[22rem]">{t.name}</td>
            <td className="text-center">{t.played || 0}</td>
            <td className="text-center" dir="ltr">{(t.gf || 0) - (t.ga || 0) > 0 ? "+" : ""}{(t.gf || 0) - (t.ga || 0)}</td>
            <td className="text-center font-display text-4xl lg:text-6xl text-gold2">{t.points || 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------- القادمة + آخر النتائج ---------- */
function FixturesSlide({ matches, teamById, now }) {
  const next = upcomingMatches(matches, 4);
  const recent = recentResults(matches, 4);
  const first = next[0];
  const cd = first ? countdownParts(kickoffMs(first), now) : null;
  return (
    <div>
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
        <div className="glass-card rounded-3xl p-5 lg:p-8">
          <h3 className="font-display text-3xl lg:text-5xl text-gold2 text-center mb-4">📅 المباريات القادمة</h3>
          {first && (
            <div className="text-center mb-5 rounded-2xl border border-gold/30 bg-gold/5 py-4">
              {cd.done ? (
                <p className="font-display text-4xl lg:text-6xl text-green-300 animate-pulse">حان موعدها</p>
              ) : (
                <p className="font-display text-5xl lg:text-7xl text-gold2 tabular-nums" dir="ltr">
                  {cd.d > 0 ? `${cd.d}d ` : ""}{p2(cd.h)}:{p2(cd.m)}:{p2(cd.s)}
                </p>
              )}
            </div>
          )}
          {next.length === 0 && <p className="text-center text-white/30 text-3xl py-6">لا مباريات مجدولة</p>}
          <div className="space-y-3">
            {next.map((m) => (
              <div key={m.id} className="rounded-2xl border border-white/10 px-4 py-3">
                <p className="text-lg lg:text-2xl text-white/45 text-center">{m.date}{m.time ? ` — ${m.time}` : ""}</p>
                <div className="flex items-center justify-between text-2xl lg:text-4xl font-bold gap-3">
                  <span className="truncate">{teamById[m.teamA]?.name}</span>
                  <span className="text-gold2/70 text-xl">vs</span>
                  <span className="truncate text-left">{teamById[m.teamB]?.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card rounded-3xl p-5 lg:p-8">
          <h3 className="font-display text-3xl lg:text-5xl text-gold2 text-center mb-4">✅ آخر النتائج</h3>
          {recent.length === 0 && <p className="text-center text-white/30 text-3xl py-6">لا نتائج بعد</p>}
          <div className="space-y-3">
            {recent.map((m) => (
              <div key={m.id} className="rounded-2xl border border-white/10 px-4 py-3">
                {m.date && <p className="text-lg lg:text-2xl text-white/45 text-center">{m.date}</p>}
                <div className="flex items-center justify-between text-2xl lg:text-4xl font-bold gap-3">
                  <span className={`truncate ${m.scoreA > m.scoreB ? "" : "text-white/60"}`}>{teamById[m.teamA]?.name}</span>
                  <span className="font-display text-4xl lg:text-6xl text-gold2 tabular-nums" dir="ltr">{m.scoreA} - {m.scoreB}</span>
                  <span className={`truncate text-left ${m.scoreB > m.scoreA ? "" : "text-white/60"}`}>{teamById[m.teamB]?.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- الهدافون ---------- */
function ScorersSlide({ teams, matches }) {
  const top = computeTopScorers(teams, matches).slice(0, 8);
  const max = top[0]?.goals || 1;
  return (
    <div className="max-w-5xl mx-auto w-full">
      <SlideTitle>⚽ الهدافون</SlideTitle>
      <div className="glass-card rounded-3xl p-5 lg:p-8 space-y-3">
        {top.map((s, i) => (
          <div key={`${s.name}${s.teamId}`} className="flex items-center gap-4">
            <span className="font-display text-3xl lg:text-5xl text-gold2/70 w-10 text-center">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-2xl lg:text-4xl font-bold truncate">{s.name} <span className="text-white/40 text-lg lg:text-2xl font-normal">— {s.teamName}</span></p>
                <p className="font-display text-4xl lg:text-6xl text-gold2 tabular-nums">{s.goals}</p>
              </div>
              <div className="h-2 rounded-full bg-white/10 mt-1 overflow-hidden">
                <div className="h-full rounded-full bg-gold/80" style={{ width: `${(s.goals / max) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- خروج المغلوب ---------- */
function BracketSlide({ matches, teamById }) {
  const ko = matches.filter((m) => m.stage === "knockout");
  const rounds = [...new Set(ko.map((m) => m.round))].slice(-3);
  return (
    <div>
      <SlideTitle>🏆 خروج المغلوب</SlideTitle>
      <div className={`grid gap-6 ${{ 1: "", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3" }[Math.min(3, Math.max(1, rounds.length))]}`}>
        {rounds.map((r) => (
          <div key={r} className="glass-card rounded-3xl p-5 lg:p-6">
            <h3 className="font-display text-3xl lg:text-4xl text-gold2 text-center mb-4">{r}</h3>
            <div className="space-y-3">
              {ko.filter((m) => m.round === r).map((m) => (
                <div key={m.id} className="rounded-2xl border border-white/10 px-4 py-3 text-xl lg:text-3xl">
                  <div className={`flex justify-between gap-2 ${m.played && m.winner === m.teamA ? "text-gold2 font-bold" : ""}`}>
                    <span className="truncate">{teamById[m.teamA]?.name || "—"}</span>
                    <span className="font-display tabular-nums">{m.played ? m.scoreA : ""}</span>
                  </div>
                  <div className={`flex justify-between gap-2 ${m.played && m.winner === m.teamB ? "text-gold2 font-bold" : ""}`}>
                    <span className="truncate">{teamById[m.teamB]?.name || "—"}</span>
                    <span className="font-display tabular-nums">{m.played ? m.scoreB : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- مباراة مباشرة ---------- */
function LiveSlide({ match, teamById, now }) {
  if (!match) return null;
  const A = teamById[match.teamA];
  const B = teamById[match.teamB];
  const rem = remainingOf(match.clock, now);
  const events = matchEventsTimeline(match, A, B).filter((e) => ["goal", "red", "yellow"].includes(e.type)).slice(-5).reverse();
  return (
    <div className="max-w-6xl mx-auto w-full">
      <p className="text-center text-red-300 text-2xl lg:text-4xl mb-4 flex items-center justify-center gap-3">
        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" /> مباراة مباشرة
      </p>
      <div className="glass-card rounded-3xl p-6 lg:p-10 border-red-500/30">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 lg:gap-8 text-center">
          <p className="font-brand text-4xl lg:text-7xl truncate">{A?.name}</p>
          <div>
            <p className="font-display text-7xl lg:text-[9rem] leading-none text-gold2 tabular-nums" dir="ltr">{match.scoreA ?? 0} - {match.scoreB ?? 0}</p>
            <p className={`font-display text-4xl lg:text-6xl tabular-nums mt-2 ${rem <= 60 && rem > 0 ? "text-red-300 animate-pulse" : "text-green-300"}`} dir="ltr">⏱ {p2(Math.floor(rem / 60))}:{p2(Math.floor(rem % 60))}</p>
          </div>
          <p className="font-brand text-4xl lg:text-7xl truncate">{B?.name}</p>
        </div>
        {events.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/10 grid sm:grid-cols-2 gap-x-10 gap-y-2 text-xl lg:text-3xl">
            {events.map((e) => (
              <p key={e.id} className="truncate text-white/80">
                <span className="text-gold2/70 tabular-nums ml-2">{e.minute ? `${e.minute}'` : ""}</span>
                {eventMeta(e.type).icon} {e.playerName} <span className="text-white/35 text-lg">— {e.teamName}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
