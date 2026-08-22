"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Nav from "../components/Nav";
import { useLeagueData } from "../lib/useLeagueData";
import { computeStandings, computeTopScorers, matchEventsTimeline } from "../lib/logic";
import Link from "next/link";

const TABS = [
  { id: "standings", label: "الترتيب" },
  { id: "groups", label: "المجموعات" },
  { id: "bracket", label: "خروج المغلوب" },
  { id: "awards", label: "الهدافون والجوائز" },
];

export default function HomePage() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const { data, loading, error } = useLeagueData();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "standings";
  const [tab, setTab] = useState(initialTab);

  if (loading) return <Shell><p className="text-center text-white/40 font-display text-2xl py-24">جارِ تحميل الدوري...</p></Shell>;
  if (error || !data) return <Shell><p className="text-center text-white/60 py-24">تعذر تحميل البيانات{error ? `: ${error}` : ""}</p></Shell>;

  const { teams, groups, matches, settings } = data;

  return (
    <Shell settings={settings}>
      <StadiumHero settings={settings} />

      {teams.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex justify-center gap-2 mb-8 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  tab === t.id ? "bg-gold/90 text-black" : "glass-card text-white/70 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "standings" && <StandingsTab teams={teams} groups={groups} matches={matches} />}
          {tab === "groups" && <GroupsTab teams={teams} groups={groups} matches={matches} />}
          {tab === "bracket" && <BracketTab teams={teams} matches={matches} />}
          {tab === "awards" && <AwardsView teams={teams} matches={matches} settings={settings} />}
        </>
      )}
    </Shell>
  );
}

function Shell({ children, settings }) {
  return (
    <>
      <Nav leagueName={settings?.leagueName} />
      <main className="max-w-6xl mx-auto px-4 pb-24">{children}</main>
    </>
  );
}

/* ==================== الهيرو: ملعب + أضواء كاشفة + شعار أصلي ==================== */
function StadiumHero({ settings }) {
  return (
    <section className="relative pt-10 pb-6 text-center overflow-hidden">
      <div className="relative mx-auto max-w-2xl h-56 sm:h-72 mb-2">
        <svg viewBox="0 0 600 300" className="w-full h-full" preserveAspectRatio="xMidYMax meet">
          <defs>
            <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#f3d675" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#f3d675" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="beamPurple" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#b17ef0" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#b17ef0" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="crestGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff6da" />
              <stop offset="55%" stopColor="#e7c465" />
              <stop offset="100%" stopColor="#8a6a1f" />
            </radialGradient>
            <linearGradient id="bowl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#182046" />
              <stop offset="100%" stopColor="#070b1a" />
            </linearGradient>
          </defs>

          {[70, 160, 240, 320, 400, 490].map((x, i) => (
            <polygon
              key={x}
              points={`${x - 6},260 ${x + 6},260 ${x + (i % 2 ? 60 : -60)},20 ${x + (i % 2 ? 30 : -30)},20`}
              fill={i % 3 === 0 ? "url(#beamPurple)" : "url(#beam)"}
              opacity="0.8"
            />
          ))}

          <path
            d="M40,270 Q300,150 560,270 L560,290 Q300,190 40,290 Z"
            fill="url(#bowl)"
            stroke="#d4af37"
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />
          <path
            d="M90,265 Q300,175 510,265"
            fill="none"
            stroke="#d4af37"
            strokeOpacity="0.25"
            strokeWidth="1"
          />

          {[95, 505].map((x) => (
            <g key={x}>
              <rect x={x - 2} y="150" width="4" height="115" fill="#0e1430" />
              <circle cx={x} cy="145" r="9" fill="#f3d675" opacity="0.9" />
              <circle cx={x} cy="145" r="18" fill="#f3d675" opacity="0.25" />
            </g>
          ))}

          <g transform="translate(300,95)">
            <circle r="42" fill="url(#crestGlow)" opacity="0.16" />
            <path
              d="M0,-30 L8,-9 L30,-9 L12,4 L19,26 L0,12 L-19,26 L-12,4 L-30,-9 L-8,-9 Z"
              fill="url(#crestGlow)"
              stroke="#fff6da"
              strokeWidth="0.6"
            />
            <circle r="46" fill="none" stroke="#d4af37" strokeOpacity="0.5" strokeWidth="1" />
          </g>
        </svg>
      </div>

      <p className="font-display text-gold2/80 tracking-[0.3em] text-sm mb-2">
        موسم {settings?.season}
      </p>
      <h1 className="font-display text-5xl sm:text-7xl gold-text leading-none mb-2">
        {settings?.leagueName}
      </h1>
      <p className="text-white/40 text-sm">ليلة الأبطال تبدأ هنا</p>
    </section>
  );
}

/* ---------------- تبويب الترتيب ---------------- */
function StandingsTab({ teams, groups, matches }) {
  if (groups.length > 0) {
    return (
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => {
          const table = computeStandings(teams, matches, g.id);
          return (
            <div key={g.id} className="glass-card rounded-2xl p-4">
              <h3 className="font-display text-2xl text-gold2 mb-3">المجموعة {g.name}</h3>
              <MiniTable table={table} />
            </div>
          );
        })}
      </section>
    );
  }
  return (
    <section className="glass-card rounded-2xl p-4">
      <h3 className="font-display text-2xl text-gold2 mb-3">جدول الترتيب العام</h3>
      <FullTable teams={[...teams].sort((a, b) => b.points - a.points)} />
    </section>
  );
}

/* ---------------- تبويب المجموعات ---------------- */
function GroupsTab({ teams, groups, matches }) {
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));
  if (groups.length === 0) return <p className="text-white/40 text-center py-10">لم تُنشأ مجموعات بعد.</p>;

  return (
    <div className="space-y-8">
      {groups.map((g) => {
        const table = computeStandings(teams, matches, g.id);
        const groupMatches = matches.filter((m) => m.stage === "group" && m.group === g.id);
        return (
          <section key={g.id} className="glass-card rounded-2xl p-6">
            <h2 className="font-display text-3xl text-gold2 mb-4">المجموعة {g.name}</h2>
            <div className="overflow-x-auto mb-6">
              <FullTable teams={table} />
            </div>
            {groupMatches.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-2">
                {groupMatches.map((m) => (
                  <MatchCard key={m.id} match={m} teamA={teamById[m.teamA]} teamB={teamById[m.teamB]} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* بطاقة مباراة قابلة للتوسيع لعرض تقرير الأهداف بالدقيقة والإنذارات والملاحظات */
function formatMatchDateTime(match) {
  if (!match.date && !match.time) return "";
  if (match.date && match.time) return `${match.date} — ${match.time}`;
  return match.date || match.time;
}

function MatchCard({ match, teamA, teamB }) {
  const [open, setOpen] = useState(false);
  const timeline = matchEventsTimeline(match, teamA, teamB);
  const hasDetails = timeline.length > 0 || match.notes;
  const dateTimeLabel = formatMatchDateTime(match);

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      {dateTimeLabel && (
        <p className="text-[11px] text-white/35 text-center pt-1.5">🕐 {dateTimeLabel}</p>
      )}
      <button
        onClick={() => hasDetails && setOpen(!open)}
        className={`w-full flex items-center justify-between text-sm px-3 py-2 ${hasDetails ? "cursor-pointer hover:bg-white/5" : "cursor-default"}`}
      >
        <span className="truncate">{teamA?.name}</span>
        <span className="flex items-center gap-2 px-3">
          <span className="font-display text-lg text-gold2">
            {match.played ? `${match.scoreA} - ${match.scoreB}` : "vs"}
          </span>
          {hasDetails && <span className="text-white/30 text-xs">{open ? "▲" : "▼"}</span>}
        </span>
        <span className="truncate text-left">{teamB?.name}</span>
      </button>
      {open && hasDetails && (
        <div className="border-t border-white/10 bg-black/20 px-4 py-3 space-y-2">
          {timeline.map((e) => (
            <div key={e.id} className={`flex items-center gap-2 text-xs ${e.side === "B" ? "flex-row-reverse text-left" : ""}`}>
              <span>{e.type === "goal" ? "⚽" : e.type === "yellow" ? "🟨" : "🟥"}</span>
              <span className="text-white/70">{e.playerName}</span>
              <span className="text-white/40">{e.minute ? `${e.minute}'` : ""}</span>
            </div>
          ))}
          {match.notes && (
            <p className="text-[11px] text-white/40 pt-1 border-t border-white/5 mt-2">📋 {match.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- تبويب خروج المغلوب: شجرة بطولة بأسلوب دوري الأبطال ---------------- */
function BracketTab({ teams, matches }) {
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const knockoutMatches = matches.filter((m) => m.stage === "knockout");
  const rounds = [...new Set(knockoutMatches.map((m) => m.round))];

  if (rounds.length === 0) return <p className="text-white/40 text-center py-10">لم تُقم أي قرعة إقصائية بعد.</p>;

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-6 px-1">
      {rounds.map((roundLabel, ri) => {
        const isFinal = ri === rounds.length - 1;
        const roundMatches = knockoutMatches.filter((m) => m.round === roundLabel);
        return (
          <div key={roundLabel} className="flex items-center gap-3">
            <div className="min-w-[240px]">
              <div className="text-center mb-4">
                <h2 className={`font-display text-2xl ${isFinal ? "text-gold2" : "text-white/80"}`}>
                  {isFinal && "🏆 "}
                  {roundLabel}
                </h2>
                <div className="h-0.5 w-16 mx-auto mt-1 rounded-full" style={{ background: "linear-gradient(90deg, transparent, #d4af37, transparent)" }} />
              </div>
              <div className="space-y-8">
                {roundMatches.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl p-4 ${
                      isFinal
                        ? "border-2 border-gold shadow-[0_0_25px_rgba(212,175,55,0.35)] bg-gradient-to-b from-[#1a1530] to-[#0b0d20]"
                        : "glass-card"
                    }`}
                  >
                    {formatMatchDateTime(m) && (
                      <p className="text-[11px] text-white/35 text-center mb-2">🕐 {formatMatchDateTime(m)}</p>
                    )}
                    <MatchLine name={teamById[m.teamA]?.name} score={m.scoreA} isWinner={m.winner === m.teamA} played={m.played} />
                    <div className="h-px bg-white/10 my-2" />
                    <MatchLine name={teamById[m.teamB]?.name} score={m.scoreB} isWinner={m.winner === m.teamB} played={m.played} />
                    <BracketMatchScorers match={m} teamA={teamById[m.teamA]} teamB={teamById[m.teamB]} />
                  </div>
                ))}
              </div>
            </div>
            {!isFinal && (
              <div className="hidden sm:flex flex-col items-center text-gold/40 shrink-0">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12h14M12 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MatchLine({ name, score, isWinner, played }) {
  return (
    <div className={`flex items-center justify-between text-sm ${isWinner ? "text-gold2 font-bold" : "text-white/70"}`}>
      <span className="truncate flex items-center gap-1.5">
        {isWinner && <span className="text-xs">★</span>}
        {name || "—"}
      </span>
      <span className="font-display text-lg">{played ? score : "-"}</span>
    </div>
  );
}

function BracketMatchScorers({ match, teamA, teamB }) {
  const timeline = matchEventsTimeline(match, teamA, teamB).filter((e) => e.type === "goal");
  if (timeline.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-white/10 space-y-0.5">
      {timeline.map((e) => (
        <p key={e.id} className={`text-[11px] text-white/40 ${e.side === "B" ? "text-left" : ""}`}>
          ⚽ {e.playerName} {e.minute ? `${e.minute}'` : ""}
        </p>
      ))}
    </div>
  );
}

/* ---------------- تبويب الهدافون والجوائز (عرض عام) ---------------- */
function AwardsView({ teams, matches, settings }) {
  const scorers = computeTopScorers(teams, matches);
  const awards = settings?.awards || {};
  const hasAwards = awards.bestPlayer || awards.bestGoalkeeper || awards.bestYoungPlayer;

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-2xl p-6">
        <h2 className="font-display text-2xl text-gold2 mb-4">🏆 هداف الدوري</h2>
        {scorers.length === 0 ? (
          <p className="text-white/40 text-sm">لا توجد أهداف مسجّلة بعد.</p>
        ) : (
          <div className="space-y-2">
            {scorers.slice(0, 10).map((s, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <div
                  key={`${s.playerId || s.name}-${s.teamId}`}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 ${
                    i === 0 ? "border border-gold/50 bg-gold/5" : "border border-white/5"
                  }`}
                >
                  <span className={`w-7 text-center ${medal ? "text-lg" : "font-display text-lg text-white/40"}`}>
                    {medal || i + 1}
                  </span>
                  <span className="flex-1 font-semibold">{s.name}</span>
                  <span className="text-white/50 text-sm">{s.teamName}</span>
                  <span className="font-display text-xl text-gold2 w-10 text-center">{s.goals}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {hasAwards && (
        <section className="grid sm:grid-cols-3 gap-4">
          {awards.bestPlayer && <AwardCard icon="🥇" label="أفضل لاعب" name={awards.bestPlayer} />}
          {awards.bestGoalkeeper && <AwardCard icon="🧤" label="أفضل حارس مرمى" name={awards.bestGoalkeeper} />}
          {awards.bestYoungPlayer && <AwardCard icon="⭐" label="أفضل لاعب شاب" name={awards.bestYoungPlayer} />}
        </section>
      )}
    </div>
  );
}

function AwardCard({ icon, label, name }) {
  return (
    <div className="glass-card rounded-2xl p-6 text-center">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-white/50 text-xs mb-1">{label}</p>
      <p className="font-display text-xl text-gold2">{name}</p>
    </div>
  );
}

/* ---------------- جداول مشتركة ---------------- */
function MiniTable({ table }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-white/40 text-xs">
          <th className="text-right font-normal pb-2">الفريق</th>
          <th className="pb-2 w-8">ل</th>
          <th className="pb-2 w-8">نق</th>
        </tr>
      </thead>
      <tbody>
        {table.slice(0, 4).map((t, i) => (
          <tr key={t.id} className={i < 2 ? "text-white" : "text-white/60"}>
            <td className="py-1.5 flex items-center gap-2">
              <span className="w-4 text-gold2/70 text-xs">{i + 1}</span>
              {t.name}
            </td>
            <td className="text-center">{t.played}</td>
            <td className="text-center font-display text-lg text-gold2">{t.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FullTable({ teams }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-white/40 text-xs">
          <th className="text-right font-normal pb-2">#</th>
          <th className="text-right font-normal pb-2">الفريق</th>
          <th className="pb-2">لعب</th>
          <th className="pb-2">فوز</th>
          <th className="pb-2">تعادل</th>
          <th className="pb-2">خسارة</th>
          <th className="pb-2">له</th>
          <th className="pb-2">عليه</th>
          <th className="pb-2">فارق</th>
          <th className="pb-2">نقاط</th>
        </tr>
      </thead>
      <tbody>
        {teams.map((t, i) => (
          <tr key={t.id} className="border-t border-white/5">
            <td className="py-2 text-white/40">{i + 1}</td>
            <td className="py-2 font-semibold">{t.name}</td>
            <td className="text-center">{t.played}</td>
            <td className="text-center">{t.won}</td>
            <td className="text-center">{t.drawn}</td>
            <td className="text-center">{t.lost}</td>
            <td className="text-center">{t.gf}</td>
            <td className="text-center">{t.ga}</td>
            <td className="text-center">{t.gf - t.ga}</td>
            <td className="text-center font-display text-lg text-gold2">{t.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyState() {
  return (
    <div className="glass-card rounded-2xl p-10 text-center">
      <p className="text-white/60 mb-3">لم تُضف أي فرق بعد.</p>
      <Link href="/admin" className="inline-block px-5 py-2 rounded-lg bg-gold/90 text-black font-semibold hover:bg-gold2 transition">
        اذهب للوحة التحكم لإضافة الفرق
      </Link>
    </div>
  );
}
