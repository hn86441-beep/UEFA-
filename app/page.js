"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Nav from "../components/Nav";
import { useLeagueData } from "../lib/useLeagueData";
import { computeStandings } from "../lib/logic";
import Link from "next/link";

const TABS = [
  { id: "standings", label: "الترتيب" },
  { id: "groups", label: "المجموعات" },
  { id: "bracket", label: "خروج المغلوب" },
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
  if (error || !data) return <Shell><p className="text-center text-white/60 py-24">تعذر تحميل البيانات</p></Shell>;

  const { teams, groups, matches, settings } = data;

  return (
    <Shell settings={settings}>
      <section className="pt-14 pb-8 text-center">
        <p className="font-display text-gold2/80 tracking-[0.3em] text-sm mb-2">
          موسم {settings?.season}
        </p>
        <h1 className="font-display text-5xl sm:text-7xl gold-text leading-none mb-4">
          {settings?.leagueName}
        </h1>
      </section>

      {teams.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex justify-center gap-2 mb-8">
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
                  <div key={m.id} className="flex items-center justify-between text-sm rounded-lg border border-white/10 px-3 py-2">
                    <span className="truncate">{teamById[m.teamA]?.name}</span>
                    <span className="font-display text-lg text-gold2 px-3">
                      {m.played ? `${m.scoreA} - ${m.scoreB}` : "vs"}
                    </span>
                    <span className="truncate text-left">{teamById[m.teamB]?.name}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ---------------- تبويب خروج المغلوب ---------------- */
function BracketTab({ teams, matches }) {
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const knockoutMatches = matches.filter((m) => m.stage === "knockout");
  const rounds = [...new Set(knockoutMatches.map((m) => m.round))];

  if (rounds.length === 0) return <p className="text-white/40 text-center py-10">لم تُقم أي قرعة إقصائية بعد.</p>;

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {rounds.map((roundLabel) => (
        <div key={roundLabel} className="min-w-[260px]">
          <h2 className="font-display text-2xl text-gold2 mb-4 text-center">{roundLabel}</h2>
          <div className="space-y-6">
            {knockoutMatches.filter((m) => m.round === roundLabel).map((m) => (
              <div key={m.id} className="glass-card rounded-xl p-4">
                <MatchLine name={teamById[m.teamA]?.name} score={m.scoreA} isWinner={m.winner === m.teamA} played={m.played} />
                <div className="h-px bg-white/10 my-2" />
                <MatchLine name={teamById[m.teamB]?.name} score={m.scoreB} isWinner={m.winner === m.teamB} played={m.played} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchLine({ name, score, isWinner, played }) {
  return (
    <div className={`flex items-center justify-between text-sm ${isWinner ? "text-gold2 font-bold" : "text-white/70"}`}>
      <span className="truncate">{name || "—"}</span>
      <span className="font-display text-lg">{played ? score : "-"}</span>
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
