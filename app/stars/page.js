"use client";
import { useMemo, useState } from "react";
import Nav from "../../components/Nav";
import { useLeagueData } from "../../lib/useLeagueData";
import { analyze, monthsOf, monthLabel, BADGES, POS_LABELS, POS_SHORT, TIER_STYLE, tierBg } from "../../lib/extras";

const TABS = [
  { id: "cards", label: "🃏 البطاقات" },
  { id: "market", label: "💹 سوق الانتقالات" },
  { id: "badges", label: "🏅 الأوسمة والمستويات" },
];
const BUDGET = 8;

export default function StarsPage() {
  const { data, loading, error } = useLeagueData({ poll: 30000, url: "/api/live" });
  const [tab, setTab] = useState("cards");
  const [month, setMonth] = useState("all");
  const [picked, setPicked] = useState([]);
  const [weekKey, setWeekKey] = useState("");

  const months = useMemo(() => (data ? monthsOf(data) : []), [data]);
  const { players, weeks } = useMemo(() => (data ? analyze(data, { month }) : { players: [], weeks: [] }), [data, month]);
  const noPos = players.length > 0 && players.every((p) => !p.pos);
  const week = weeks.find((w) => w.key === weekKey) || weeks[weeks.length - 1];

  return (
    <>
      <Nav leagueName={data?.settings?.leagueName} />
      <main className="max-w-6xl mx-auto px-3 sm:px-4 pb-24 pt-6">
        <h1 className="font-brand text-3xl sm:text-5xl gold-text text-center mb-1">نجوم الدوري</h1>
        <p className="text-center text-white/40 text-xs sm:text-sm mb-5">بطاقات، سوق انتقالات، أوسمة ومستويات — تُحسب تلقائيًا من نتائج المباريات</p>

        <div className="flex gap-2 justify-center flex-wrap mb-3">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === t.id ? "bg-gold/90 text-black" : "glass-card text-white/70"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex justify-center mb-6">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm">
            <option value="all">🏆 البطولة كاملة</option>
            {months.map((m) => <option key={m} value={m}>📅 {monthLabel(m)}</option>)}
          </select>
        </div>

        {loading && <p className="text-center text-white/40 py-20 font-display text-2xl">جارِ التحميل...</p>}
        {!loading && !data && <p className="text-center text-white/60 py-20">تعذر تحميل البيانات{error ? `: ${error}` : ""}</p>}
        {data && players.length === 0 && (
          <p className="text-center text-white/50 py-16">لا توجد بيانات كافية بعد — تظهر البطاقات بعد انتهاء مباريات فيها لاعبون مسجّلون.</p>
        )}
        {noPos && (
          <p className="text-center text-amber-300/80 text-xs mb-5">💡 للمشرف: حدّد مركز كل لاعب (حارس/مدافع/وسط/مهاجم) من لوحة التحكم ← اللاعبون لتصبح الحسابات والأوسمة أدق.</p>
        )}

        {players.length > 0 && tab === "cards" && (
          <>
            <h2 className="font-display text-xl text-gold2 mb-3">⭐ تشكيلة الفترة (أفضل 5)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
              {players.slice(0, 5).map((p, i) => <PlayerCard key={p.id} p={p} star={i === 0} />)}
            </div>
            {players.length > 5 && (
              <>
                <h2 className="font-display text-xl text-gold2 mb-3">كل البطاقات</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {players.slice(5).map((p) => <PlayerCard key={p.id} p={p} />)}
                </div>
              </>
            )}
          </>
        )}

        {players.length > 0 && tab === "market" && (
          <MarketTab players={players} weeks={weeks} week={week} setWeekKey={setWeekKey} picked={picked} setPicked={setPicked} />
        )}
        {players.length > 0 && tab === "badges" && <BadgesTab players={players} />}
      </main>
    </>
  );
}

/* ---------------- بطاقة لاعب بأسلوب FIFA ---------------- */
function PlayerCard({ p, star }) {
  const t = TIER_STYLE[p.tier];
  return (
    <div>
      <div className="relative rounded-[20px] p-3 sm:p-4 shadow-xl overflow-hidden" style={{ background: tierBg(t), color: t.fg, border: `2px solid ${t.edge}` }}>
        {star && <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-black/60 text-gold2 px-2 py-0.5 rounded-full whitespace-nowrap">⭐ لاعب الفترة</span>}
        <div className="flex items-start justify-between mt-3">
          <div className="text-center leading-none">
            <div className="font-display text-4xl sm:text-5xl">{p.rating}</div>
            <div className="text-[11px] font-bold tracking-wider mt-1">{POS_SHORT[p.pos] || "PLY"}</div>
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-brand text-3xl sm:text-4xl" style={{ background: t.circle }}>
            {p.name?.trim()?.[0] || "؟"}
          </div>
        </div>
        <p className="text-center font-brand text-lg sm:text-xl mt-2 truncate">{p.name}</p>
        <div className="h-px my-2" style={{ background: t.edge }} />
        <div dir="ltr" className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {p.attrs.map((a) => (
            <div key={a.k} className="flex items-baseline gap-1.5">
              <span className="font-display text-lg w-7">{a.v}</span>
              <span className="text-[11px] font-bold opacity-80">{a.k}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] mt-2 opacity-80 truncate">{p.teamName}{p.pos ? ` · ${POS_LABELS[p.pos]}` : ""}</p>
        <div className="flex justify-center gap-1 mt-1 text-sm min-h-[20px]">
          {p.badges.slice(0, 5).map((b) => <span key={b.id} title={b.name}>{b.icon}</span>)}
        </div>
      </div>
      <button onClick={() => downloadCard(p)} className="mt-1.5 w-full text-[11px] py-1.5 rounded-lg border border-white/15 text-white/60 hover:text-white hover:bg-white/5">
        ⬇️ تحميل PNG
      </button>
    </div>
  );
}

function downloadCard(p) {
  const t = TIER_STYLE[p.tier];
  const W = 600, H = 840;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, W, H);
  t.stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = t.edge; x.lineWidth = 8; x.strokeRect(14, 14, W - 28, H - 28);
  x.fillStyle = t.fg; x.textBaseline = "alphabetic";
  x.textAlign = "left"; x.font = "bold 120px sans-serif"; x.fillText(String(p.rating), 56, 170);
  x.font = "bold 36px sans-serif"; x.fillText(POS_SHORT[p.pos] || "PLY", 60, 220);
  x.fillStyle = t.circle; x.beginPath(); x.arc(430, 190, 105, 0, Math.PI * 2); x.fill();
  x.fillStyle = t.fg; x.textAlign = "center"; x.font = "bold 110px sans-serif"; x.fillText(p.name?.trim()?.[0] || "؟", 430, 225);
  x.font = "bold 58px sans-serif"; x.fillText(p.name, W / 2, 380, 520);
  x.fillStyle = t.edge; x.fillRect(60, 410, W - 120, 4);
  x.fillStyle = t.fg; x.textAlign = "left";
  p.attrs.forEach((a, i) => {
    const cx = i % 2 === 0 ? 90 : 340, cy = 490 + Math.floor(i / 2) * 78;
    x.font = "bold 54px sans-serif"; x.fillText(String(a.v), cx, cy);
    x.font = "bold 30px sans-serif"; x.fillText(a.k, cx + 100, cy);
  });
  x.textAlign = "center"; x.font = "28px sans-serif"; x.fillText(p.teamName || "", W / 2, 750, 520);
  x.font = "34px sans-serif"; x.fillText(p.badges.slice(0, 6).map((b) => b.icon).join(" "), W / 2, 800);
  c.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `card-${p.name}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  });
}

/* ---------------- سوق الانتقالات + فريق الأحلام ---------------- */
function Spark({ data }) {
  if (data.length < 2) return <span className="text-white/20 text-xs">—</span>;
  const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 70},${22 - ((v - min) / r) * 20}`).join(" ");
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width="70" height="24" viewBox="0 0 70 24" className="shrink-0" dir="ltr">
      <polyline points={pts} fill="none" stroke={up ? "#4ade80" : "#f87171"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MarketTab({ players, weeks, week, setWeekKey, picked, setPicked }) {
  const byValue = [...players].sort((a, b) => b.value - a.value);
  const gainers = [...players].sort((a, b) => b.lastDelta - a.lastDelta).slice(0, 3);
  const losers = [...players].sort((a, b) => a.lastDelta - b.lastDelta).slice(0, 3).filter((p) => p.lastDelta < 0);
  const team = picked.map((id) => players.find((p) => p.id === id)).filter(Boolean);
  const cost = team.reduce((s, p) => s + p.value, 0);
  const pts = team.reduce((s, p) => s + p.fp, 0);
  const toggle = (p) =>
    setPicked((cur) => (cur.includes(p.id) ? cur.filter((i) => i !== p.id) : cur.length >= 5 || cost + p.value > BUDGET ? cur : [...cur, p.id]));

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-2xl p-4 border border-gold/30">
        <h2 className="font-display text-xl text-gold2 mb-1">🧑‍🤝‍🧑 فريق أحلامك</h2>
        <p className="text-[11px] text-white/40 mb-3">اختر حتى 5 لاعبين بميزانية {BUDGET}M — تُحسب نقاط فريقك من أداء لاعبيهم.</p>
        <div className="flex gap-2 flex-wrap mb-3 min-h-[34px]">
          {team.length === 0 && <span className="text-white/30 text-sm">اضغط "＋ ضمّ" بجانب أي لاعب</span>}
          {team.map((p) => (
            <button key={p.id} onClick={() => toggle(p)} className="px-3 py-1.5 rounded-full text-xs bg-gold/15 border border-gold/40 text-gold2">{p.name} ✕</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="font-display text-2xl text-gold2">{(BUDGET - cost).toFixed(2)}M</p><p className="text-[10px] text-white/40">الميزانية المتبقية</p></div>
          <div><p className="font-display text-2xl text-white">{team.length}/5</p><p className="text-[10px] text-white/40">اللاعبون</p></div>
          <div><p className="font-display text-2xl text-green-300">{pts.toFixed(1)}</p><p className="text-[10px] text-white/40">نقاط الفريق</p></div>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-4">
        <section className="glass-card rounded-2xl p-4">
          <h2 className="font-display text-lg text-green-300 mb-2">🔥 الأكثر ارتفاعًا (آخر مباراة)</h2>
          {gainers.map((p) => <MoverRow key={p.id} p={p} />)}
        </section>
        <section className="glass-card rounded-2xl p-4">
          <h2 className="font-display text-lg text-red-300 mb-2">📉 الأكثر انخفاضًا</h2>
          {losers.length === 0 ? <p className="text-white/30 text-sm">لا انخفاضات الآن</p> : losers.map((p) => <MoverRow key={p.id} p={p} />)}
        </section>
      </div>

      {weeks.length > 0 && week && (
        <section className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <h2 className="font-display text-lg text-gold2">🗓️ نجوم الأسبوع (نقاط فانتازي)</h2>
            <select value={week.key} onChange={(e) => setWeekKey(e.target.value)} className="rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-xs">
              {weeks.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
            </select>
          </div>
          {week.top.map((x, i) => (
            <div key={x.id} className="flex items-center gap-3 py-1.5 border-t border-white/5 text-sm">
              <span className="w-6 text-center">{["🥇", "🥈", "🥉"][i] || i + 1}</span>
              <span className="flex-1 truncate">{x.name} <span className="text-white/40 text-xs">· {x.teamName}</span></span>
              <span className="font-display text-lg text-green-300">{x.fp.toFixed(1)}</span>
            </div>
          ))}
        </section>
      )}

      <section className="glass-card rounded-2xl p-4">
        <h2 className="font-display text-lg text-gold2 mb-3">💰 القيم السوقية</h2>
        <div className="space-y-1">
          {byValue.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 sm:gap-3 py-2 border-t border-white/5 text-sm">
              <span className="w-5 text-white/40 text-xs">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-[11px] text-white/40 truncate">{p.teamName}{p.pos ? ` · ${POS_LABELS[p.pos]}` : ""}</p>
              </div>
              <Spark data={p.valueHist} />
              <div className="text-end w-20 shrink-0">
                <p className="font-display text-lg text-gold2 leading-none">{p.value.toFixed(2)}M</p>
                <p className={`text-[11px] ${p.lastDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {p.lastDelta >= 0 ? "▲" : "▼"} {Math.abs(p.valueChangePct).toFixed(1)}%
                </p>
              </div>
              <button onClick={() => toggle(p)} className={`text-[11px] px-2 py-1.5 rounded-lg border shrink-0 ${picked.includes(p.id) ? "bg-gold/90 text-black border-gold" : "border-white/20 text-white/60"}`}>
                {picked.includes(p.id) ? "✓ ضُمّ" : "＋ ضمّ"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MoverRow({ p }) {
  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className="flex-1 truncate">{p.name} <span className="text-white/40 text-xs">· {p.teamName}</span></span>
      <span className={`font-display ${p.lastDelta >= 0 ? "text-green-400" : "text-red-400"}`}>{p.lastDelta >= 0 ? "+" : ""}{p.lastDelta.toFixed(2)}M</span>
    </div>
  );
}

/* ---------------- الأوسمة والمستويات ---------------- */
function BadgesTab({ players }) {
  const byXp = [...players].sort((a, b) => b.xp - a.xp);
  return (
    <div className="space-y-6">
      <section className="glass-card rounded-2xl p-4">
        <h2 className="font-display text-lg text-gold2 mb-3">🏅 كتالوج الأوسمة</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {BADGES.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2">
              <span className="text-2xl">{b.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{b.name}</p>
                <p className="text-[11px] text-white/45">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-4">
        <h2 className="font-display text-lg text-gold2 mb-3">📈 ترتيب المستويات (XP)</h2>
        <div className="space-y-3">
          {byXp.map((p, i) => (
            <div key={p.id} className="rounded-xl border border-white/10 p-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center font-display text-xl text-gold2 shrink-0">{p.lvl.level}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{i === 0 ? "👑 " : ""}{p.name} <span className="text-white/40 text-xs">· {p.teamName}</span></p>
                  <p className="text-[11px] text-gold2/80">{p.lvl.title} · {p.xp} XP</p>
                </div>
                <div className="flex gap-1 flex-wrap justify-end max-w-[40%]">
                  {p.badges.map((b) => (
                    <span key={b.id} title={`${b.name}${b.n > 1 ? ` ×${b.n}` : ""}`} className="text-lg relative">
                      {b.icon}{b.n > 1 && <sup className="text-[9px] text-gold2">×{b.n}</sup>}
                    </span>
                  ))}
                </div>
              </div>
              <div className="h-1.5 rounded bg-white/10 mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-l from-gold2 to-gold" style={{ width: `${p.lvl.progress * 100}%` }} />
              </div>
              <p className="text-[10px] text-white/30 mt-1">المستوى التالي عند {p.lvl.next} XP</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
