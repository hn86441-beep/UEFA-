"use client";
import { useMemo, useState } from "react";
import Nav from "../../components/Nav";
import { useLeagueData } from "../../lib/useLeagueData";
import { simulateGroup } from "../../lib/extras";

const STATUS = {
  q: { label: "✅ مؤهل رسميًا", cls: "text-green-300 bg-green-500/15 border-green-500/40" },
  in: { label: "🟢 في مراكز التأهل", cls: "text-green-200 bg-green-500/10 border-green-500/25" },
  chase: { label: "🟡 خارج التأهل حاليًا", cls: "text-amber-200 bg-amber-500/10 border-amber-500/25" },
  out: { label: "❌ خرج رياضيًا", cls: "text-red-300 bg-red-500/15 border-red-500/40" },
};

export default function CalculatorPage() {
  const { data, loading, error } = useLeagueData({ poll: 30000, url: "/api/live" });
  const [hypo, setHypo] = useState({});
  const [qualifyN, setQualifyN] = useState(2);

  const groups = data?.groups || [];
  const teamById = useMemo(() => Object.fromEntries((data?.teams || []).map((t) => [t.id, t])), [data?.teams]);
  const remaining = useMemo(() => (data?.matches || []).filter((m) => m.stage === "group" && !m.played), [data?.matches]);

  const set = (id, a, b) => setHypo((h) => ({ ...h, [id]: { a, b } }));
  const clear = () => setHypo({});
  const randomize = () => {
    const h = {};
    remaining.forEach((m) => (h[m.id] = { a: String(Math.floor(Math.random() * 4)), b: String(Math.floor(Math.random() * 4)) }));
    setHypo(h);
  };
  const filled = Object.values(hypo).filter((h) => h.a !== "" && h.b !== "").length;

  return (
    <>
      <Nav leagueName={data?.settings?.leagueName} />
      <main className="max-w-5xl mx-auto px-3 sm:px-4 pb-24 pt-6">
        <h1 className="font-brand text-3xl sm:text-5xl gold-text text-center mb-1">🧮 حاسبة التأهل</h1>
        <p className="text-center text-white/40 text-xs sm:text-sm mb-5">أدخل نتائج افتراضية للمباريات المتبقية وشاهد الترتيب والتأهل فورًا</p>

        {loading && <p className="text-center text-white/40 py-20 font-display text-2xl">جارِ التحميل...</p>}
        {!loading && !data && <p className="text-center text-white/60 py-20">تعذر تحميل البيانات{error ? `: ${error}` : ""}</p>}
        {data && groups.length === 0 && <p className="text-center text-white/50 py-16">لا توجد مجموعات بعد — تعمل الحاسبة في مرحلة المجموعات.</p>}

        {groups.length > 0 && (
          <>
            <div className="glass-card rounded-2xl p-3 sm:p-4 mb-5 flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
              <label className="text-xs text-white/60 flex items-center gap-2">
                المتأهلون من كل مجموعة
                <select value={qualifyN} onChange={(e) => setQualifyN(Number(e.target.value))} className="rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-sm">
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <button onClick={randomize} disabled={remaining.length === 0} className="text-xs px-3 py-2 rounded-lg border border-gold/40 text-gold2 hover:bg-gold/10 disabled:opacity-30">🎲 نتائج عشوائية</button>
              <button onClick={clear} className="text-xs px-3 py-2 rounded-lg border border-white/15 text-white/60 hover:bg-white/5">↺ مسح الافتراضات{filled ? ` (${filled})` : ""}</button>
            </div>

            <div className="space-y-6">
              {groups.map((g) => {
                const rows = simulateGroup(data.teams, data.matches, g.id, hypo, qualifyN);
                const gm = remaining.filter((m) => m.group === g.id);
                return (
                  <section key={g.id} className="glass-card rounded-2xl p-3 sm:p-5">
                    <h2 className="font-display text-2xl text-gold2 mb-3">المجموعة {g.name}</h2>
                    <div className="space-y-1.5 mb-4">
                      {rows.map((t) => {
                        const delta = t.realRank - t.rank;
                        const st = STATUS[t.status];
                        return (
                          <div key={t.id} className={`rounded-xl border px-2.5 py-2 ${t.rank < qualifyN ? "border-green-500/30 bg-green-500/5" : "border-white/10"}`}>
                            <div className="flex items-center gap-2">
                              <span className="font-display text-lg w-6 text-center text-white/50">{t.rank + 1}</span>
                              <span className="flex-1 min-w-0 truncate font-semibold">{t.name}</span>
                              {delta !== 0 && <span className={`text-xs ${delta > 0 ? "text-green-400" : "text-red-400"}`}>{delta > 0 ? "▲" : "▼"}{Math.abs(delta)}</span>}
                              <span className="text-[11px] text-white/40 hidden sm:inline">لعب {t.played} · فارق {t.gf - t.ga}</span>
                              <span className="font-display text-2xl text-gold2 w-9 text-center">{t.points}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
                              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                              <span className="text-[10px] text-white/35">متبقي {t.remaining} · أقصى نقاط {t.max}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {gm.length === 0 ? (
                      <p className="text-white/35 text-sm text-center">لا مباريات متبقية في هذه المجموعة.</p>
                    ) : (
                      <>
                        <p className="text-xs text-white/50 mb-2">المباريات المتبقية — اضغط نتيجة سريعة أو اكتب الأهداف:</p>
                        <div className="space-y-2">
                          {gm.map((m) => {
                            const h = hypo[m.id] || { a: "", b: "" };
                            return (
                              <div key={m.id} className="rounded-xl border border-white/10 p-2.5">
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                  <span className="text-sm truncate">{teamById[m.teamA]?.name}</span>
                                  <div className="flex items-center gap-1">
                                    <input type="number" min="0" inputMode="numeric" value={h.a} onChange={(e) => set(m.id, e.target.value, h.b)} className="w-12 h-10 text-center rounded-lg bg-black/40 border border-white/15 outline-none focus:border-gold/60 text-lg" />
                                    <span className="text-white/30">:</span>
                                    <input type="number" min="0" inputMode="numeric" value={h.b} onChange={(e) => set(m.id, h.a, e.target.value)} className="w-12 h-10 text-center rounded-lg bg-black/40 border border-white/15 outline-none focus:border-gold/60 text-lg" />
                                  </div>
                                  <span className="text-sm truncate text-end">{teamById[m.teamB]?.name}</span>
                                </div>
                                <div className="flex gap-1.5 justify-center mt-2">
                                  <button onClick={() => set(m.id, "1", "0")} className="text-[11px] px-2.5 py-1 rounded-full border border-white/15 text-white/60 hover:bg-white/5">فوز {teamById[m.teamA]?.name}</button>
                                  <button onClick={() => set(m.id, "0", "0")} className="text-[11px] px-2.5 py-1 rounded-full border border-white/15 text-white/60 hover:bg-white/5">تعادل</button>
                                  <button onClick={() => set(m.id, "0", "1")} className="text-[11px] px-2.5 py-1 rounded-full border border-white/15 text-white/60 hover:bg-white/5">فوز {teamById[m.teamB]?.name}</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>
    </>
  );
}
