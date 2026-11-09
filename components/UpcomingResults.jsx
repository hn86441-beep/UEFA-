"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// وقت انطلاق المباراة (ms) أو null إن لم يُحدَّد تاريخ
export function kickoffMs(m) {
  if (!m?.date) return null;
  const t = new Date(`${m.date}T${m.time || "00:00"}`).getTime();
  return Number.isNaN(t) ? null : t;
}

// المباريات القادمة: غير منتهية ولا جارية ولها تاريخ، مرتبة تصاعديًا
export function upcomingMatches(matches, limit = 5) {
  return (matches || [])
    .filter((m) => !m.played && !m.clock?.running && kickoffMs(m) !== null)
    .sort((a, b) => kickoffMs(a) - kickoffMs(b))
    .slice(0, limit);
}

// آخر النتائج: المنتهية، الأحدث أولًا (التي بلا تاريخ تأتي بعد المؤرَّخة)
export function recentResults(matches, limit = 5) {
  return (matches || [])
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.played && !m.clock?.running && m.scoreA != null && m.scoreB != null)
    .sort((x, y) => (kickoffMs(y.m) ?? -1) - (kickoffMs(x.m) ?? -1) || y.i - x.i)
    .slice(0, limit)
    .map(({ m }) => m);
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function countdownParts(target, now) {
  const diff = Math.max(0, target - now);
  const s = Math.floor(diff / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    done: diff <= 0,
  };
}

const p2 = (n) => String(n).padStart(2, "0");

function dateLabel(m) {
  try {
    const d = new Date(`${m.date}T00:00:00`).toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long" });
    return `${d}${m.time ? ` — ${m.time}` : ""}`;
  } catch {
    return `${m.date}${m.time ? ` — ${m.time}` : ""}`;
  }
}

function TeamName({ team, className = "" }) {
  if (!team) return <span className={className}>—</span>;
  return (
    <Link href={`/team/${team.id}`} className={`hover:text-gold2 transition ${className}`}>
      {team.name}
    </Link>
  );
}

export default function UpcomingResults({ matches, teamById }) {
  const now = useNow(1000);
  const next = upcomingMatches(matches, 5);
  const recent = recentResults(matches, 5);
  if (next.length === 0 && recent.length === 0) return null;

  const first = next[0];
  const cd = first ? countdownParts(kickoffMs(first), now) : null;

  return (
    <section className="grid md:grid-cols-2 gap-4 mb-6">
      <div className="glass-card rounded-2xl p-4">
        <h3 className="font-display text-xl text-gold2 mb-3 text-center">📅 المباريات القادمة</h3>
        {first && (
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 mb-3 text-center">
            <p className="text-[11px] text-white/50 mb-1">المباراة القادمة تنطلق بعد</p>
            {cd.done ? (
              <p className="font-display text-2xl text-green-300 animate-pulse">حان موعدها الآن</p>
            ) : (
              <div className="flex items-center justify-center gap-2 sm:gap-3" dir="ltr">
                {[
                  [cd.d, "يوم"],
                  [cd.h, "ساعة"],
                  [cd.m, "دقيقة"],
                  [cd.s, "ثانية"],
                ].map(([v, l]) => (
                  <div key={l} className="min-w-[52px]">
                    <p className="font-display text-3xl sm:text-4xl text-gold2 tabular-nums leading-none">{p2(v)}</p>
                    <p className="text-[10px] text-white/40 mt-1">{l}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm mt-2 font-semibold">
              <TeamName team={teamById[first.teamA]} /> <span className="text-white/30 px-1">×</span> <TeamName team={teamById[first.teamB]} />
            </p>
          </div>
        )}
        {next.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-3">لا مباريات مجدولة بعد.</p>
        ) : (
          <div className="space-y-1.5">
            {next.map((m) => (
              <div key={m.id} className="rounded-lg border border-white/10 px-3 py-2">
                <p className="text-[11px] text-white/40 text-center mb-0.5">🕐 {dateLabel(m)}{m.venue ? ` · ${m.venue}` : ""}</p>
                <div className="flex items-center justify-between text-sm gap-2">
                  <TeamName team={teamById[m.teamA]} className="truncate" />
                  <span className="text-gold2/70 text-xs">vs</span>
                  <TeamName team={teamById[m.teamB]} className="truncate text-left" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-4">
        <h3 className="font-display text-xl text-gold2 mb-3 text-center">✅ آخر النتائج</h3>
        {recent.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-3">لا نتائج بعد.</p>
        ) : (
          <div className="space-y-1.5">
            {recent.map((m) => (
              <div key={m.id} className="rounded-lg border border-white/10 px-3 py-2">
                {m.date && <p className="text-[11px] text-white/40 text-center mb-0.5">🕐 {dateLabel(m)}</p>}
                <div className="flex items-center justify-between text-sm gap-2">
                  <TeamName team={teamById[m.teamA]} className={`truncate ${m.scoreA > m.scoreB ? "font-bold text-white" : "text-white/70"}`} />
                  <span className="font-display text-lg text-gold2 px-1 tabular-nums">{m.scoreA} - {m.scoreB}</span>
                  <TeamName team={teamById[m.teamB]} className={`truncate text-left ${m.scoreB > m.scoreA ? "font-bold text-white" : "text-white/70"}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
