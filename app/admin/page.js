"use client";
import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import { useLeagueData, callApi } from "../../lib/useLeagueData";
import { computeStandings, computeTopScorers } from "../../lib/logic";

export default function AdminPage() {
  const [authState, setAuthState] = useState("checking"); // checking | out | in

  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((j) => setAuthState(j.authed ? "in" : "out"))
      .catch(() => setAuthState("out"));
  }, []);

  if (authState === "checking") {
    return (
      <>
        <Nav />
        <main className="max-w-6xl mx-auto px-4 py-24 text-center text-white/40 font-display text-2xl">
          جارِ التحقق...
        </main>
      </>
    );
  }

  if (authState === "out") {
    return <LoginView onLoggedIn={() => setAuthState("in")} />;
  }

  return <Dashboard onLoggedOut={() => setAuthState("out")} />;
}

/* ==================== تسجيل الدخول ==================== */
function LoginView({ onLoggedIn }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await callApi("/api/auth/login", "POST", { password });
      onLoggedIn();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="max-w-md mx-auto px-4 py-20">
        <div className="glass-card rounded-2xl p-8">
          <h1 className="font-display text-3xl gold-text mb-1">لوحة التحكم</h1>
          <p className="text-white/50 text-sm mb-6">هذه اللوحة مخصصة للمشرف فقط</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">كلمة السر</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-gold/50"
                placeholder="••••••••"
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gold/90 text-black font-bold hover:bg-gold2 transition disabled:opacity-50"
            >
              {loading ? "جارِ الدخول..." : "دخول"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}

/* ==================== لوحة التحكم ==================== */
const TABS = [
  { id: "settings", label: "الإعدادات" },
  { id: "teams", label: "الفرق" },
  { id: "groups", label: "المجموعات والقرعة" },
  { id: "matches", label: "مباريات المجموعات" },
  { id: "knockout", label: "خروج المغلوب" },
  { id: "awards", label: "الهدافون والجوائز" },
];

function Dashboard({ onLoggedOut }) {
  const { data, loading, error, refresh } = useLeagueData();
  const [tab, setTab] = useState("teams");
  const [msg, setMsg] = useState(null);

  function flash(text, isError = false) {
    setMsg({ text, isError });
    setTimeout(() => setMsg(null), 3500);
  }

  async function handleLogout() {
    await callApi("/api/auth/logout", "POST", {});
    onLoggedOut();
  }

  if (loading) {
    return (
      <>
        <Nav />
        <main className="max-w-6xl mx-auto px-4 py-24 text-center text-white/40 font-display text-2xl">
          جارِ التحميل...
        </main>
      </>
    );
  }
  if (error || !data) {
    return (
      <>
        <Nav />
        <main className="max-w-6xl mx-auto px-4 py-24 text-center text-white/60">تعذر تحميل البيانات</main>
      </>
    );
  }

  return (
    <>
      <Nav leagueName={data.settings?.leagueName} />
      <main className="max-w-6xl mx-auto px-4 pb-24">
        <div className="flex items-center justify-between pt-8 pb-6">
          <h1 className="font-display text-4xl gold-text">لوحة التحكم</h1>
          <button onClick={handleLogout} className="text-sm px-4 py-2 rounded-lg border border-white/15 hover:bg-white/5 transition">
            تسجيل الخروج
          </button>
        </div>

        {msg && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${msg.isError ? "bg-red-500/15 text-red-300 border border-red-500/30" : "bg-green-500/15 text-green-300 border border-green-500/30"}`}>
            {msg.text}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === t.id ? "bg-gold/90 text-black" : "glass-card text-white/70 hover:text-white"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "settings" && <SettingsTab data={data} refresh={refresh} flash={flash} />}
        {tab === "teams" && <TeamsTab data={data} refresh={refresh} flash={flash} />}
        {tab === "groups" && <GroupsTab data={data} refresh={refresh} flash={flash} />}
        {tab === "matches" && <MatchesTab data={data} refresh={refresh} flash={flash} />}
        {tab === "knockout" && <KnockoutTab data={data} refresh={refresh} flash={flash} />}
        {tab === "awards" && <AwardsTab data={data} refresh={refresh} flash={flash} />}

        <div className="mt-14 pt-6 border-t border-white/10">
          <button
            onClick={async () => {
              if (!confirm("سيتم حذف كل الفرق والمجموعات والمباريات نهائيًا. متأكد؟")) return;
              await callApi("/api/reset", "POST", {});
              await refresh();
              flash("تمت إعادة ضبط الدوري بالكامل");
            }}
            className="text-sm px-4 py-2 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10 transition"
          >
            إعادة ضبط الدوري بالكامل (حذف كل شيء)
          </button>
        </div>
      </main>
    </>
  );
}

/* ---------------- الإعدادات ---------------- */
function SettingsTab({ data, refresh, flash }) {
  const [leagueName, setLeagueName] = useState(data.settings?.leagueName || "");
  const [season, setSeason] = useState(data.settings?.season || "");

  async function save() {
    try {
      await callApi("/api/data", "PUT", { leagueName, season });
      await refresh();
      flash("تم حفظ الإعدادات");
    } catch (e) {
      flash(e.message, true);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-6 max-w-lg">
      <h2 className="font-display text-2xl text-gold2 mb-4">إعدادات الدوري</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-white/60 mb-1">اسم الدوري</label>
          <input value={leagueName} onChange={(e) => setLeagueName(e.target.value)} className="w-full rounded-lg bg-black/30 border border-white/10 px-4 py-2.5 outline-none focus:border-gold/50" />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1">الموسم</label>
          <input value={season} onChange={(e) => setSeason(e.target.value)} className="w-full rounded-lg bg-black/30 border border-white/10 px-4 py-2.5 outline-none focus:border-gold/50" />
        </div>
        <button onClick={save} className="px-5 py-2.5 rounded-lg bg-gold/90 text-black font-semibold hover:bg-gold2 transition">
          حفظ
        </button>
      </div>
    </div>
  );
}

/* ---------------- الفرق ---------------- */
function TeamsTab({ data, refresh, flash }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");

  async function addTeam() {
    if (!name.trim()) return;
    try {
      await callApi("/api/teams", "POST", { name, group: group || null });
      setName("");
      await refresh();
      flash("تمت إضافة الفريق");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function updateTeam(id, patch) {
    try {
      await callApi(`/api/teams/${id}`, "PUT", patch);
      await refresh();
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function deleteTeam(id) {
    if (!confirm("حذف هذا الفريق نهائيًا؟")) return;
    try {
      await callApi(`/api/teams/${id}`, "DELETE");
      await refresh();
      flash("تم حذف الفريق");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function recalc() {
    try {
      await callApi("/api/recalc", "POST", {});
      await refresh();
      flash("تم تحديث الإحصائيات تلقائيًا من نتائج المباريات");
    } catch (e) {
      flash(e.message, true);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display text-2xl text-gold2 mb-4">إضافة فريق جديد</h2>
        <div className="flex flex-wrap gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الفريق" className="flex-1 min-w-[200px] rounded-lg bg-black/30 border border-white/10 px-4 py-2.5 outline-none focus:border-gold/50" />
          <select value={group} onChange={(e) => setGroup(e.target.value)} className="rounded-lg bg-black/30 border border-white/10 px-4 py-2.5 outline-none focus:border-gold/50">
            <option value="">بدون مجموعة</option>
            {data.groups.map((g) => (
              <option key={g.id} value={g.id}>المجموعة {g.name}</option>
            ))}
          </select>
          <button onClick={addTeam} className="px-5 py-2.5 rounded-lg bg-gold/90 text-black font-semibold hover:bg-gold2 transition">إضافة</button>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-display text-2xl text-gold2">كل الفرق ({data.teams.length})</h2>
          <button onClick={recalc} className="text-xs px-3 py-2 rounded-lg border border-gold/40 text-gold2 hover:bg-gold/10 transition">
            تحديث النقاط تلقائيًا من نتائج المباريات
          </button>
        </div>

        {data.teams.length === 0 ? (
          <p className="text-white/40 text-sm">لا يوجد فرق بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-white/40 text-xs">
                  <th className="text-right font-normal pb-2">الفريق</th>
                  <th className="text-right font-normal pb-2">المجموعة</th>
                  <th className="pb-2 w-14">لعب</th>
                  <th className="pb-2 w-14">فوز</th>
                  <th className="pb-2 w-14">تعادل</th>
                  <th className="pb-2 w-14">خسارة</th>
                  <th className="pb-2 w-14">له</th>
                  <th className="pb-2 w-14">عليه</th>
                  <th className="pb-2 w-16">نقاط</th>
                  <th className="pb-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.teams.map((t) => (
                  <tr key={t.id} className="border-t border-white/5">
                    <td className="py-2">
                      <input defaultValue={t.name} onBlur={(e) => e.target.value !== t.name && updateTeam(t.id, { name: e.target.value })} className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-gold/50 outline-none w-32" />
                    </td>
                    <td className="py-2">
                      <select value={t.group || ""} onChange={(e) => updateTeam(t.id, { group: e.target.value || null })} className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs">
                        <option value="">—</option>
                        {data.groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </td>
                    {["played", "won", "drawn", "lost", "gf", "ga"].map((field) => (
                      <td key={field} className="py-2 text-center">
                        <input type="number" defaultValue={t[field]} onBlur={(e) => Number(e.target.value) !== t[field] && updateTeam(t.id, { [field]: Number(e.target.value) })} className="w-12 text-center bg-black/20 border border-white/10 rounded px-1 py-1 outline-none focus:border-gold/50" />
                      </td>
                    ))}
                    <td className="py-2 text-center">
                      <input type="number" defaultValue={t.points} onBlur={(e) => Number(e.target.value) !== t.points && updateTeam(t.id, { points: Number(e.target.value) })} className="w-14 text-center bg-black/20 border border-gold/30 rounded px-1 py-1 outline-none focus:border-gold/60 font-display text-base text-gold2" />
                    </td>
                    <td className="py-2 text-center">
                      <button onClick={() => deleteTeam(t.id)} className="text-red-400/70 hover:text-red-400 text-xs">حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- المجموعات والقرعة ---------------- */
function GroupsTab({ data, refresh, flash }) {
  const [name, setName] = useState("");
  const [doubleRound, setDoubleRound] = useState(true);

  async function addGroup() {
    if (!name.trim()) return;
    try {
      await callApi("/api/groups", "POST", { name });
      setName("");
      await refresh();
      flash("تمت إضافة المجموعة");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function deleteGroup(id) {
    if (!confirm("حذف هذه المجموعة؟ (ستبقى الفرق لكن بدون مجموعة)")) return;
    try {
      await callApi(`/api/groups/${id}`, "DELETE");
      await refresh();
      flash("تم حذف المجموعة");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function runDraw() {
    if (!confirm("ستُعاد قرعة توزيع الفرق على المجموعات عشوائيًا، وستُحذف مباريات المجموعات الحالية وتُنشأ من جديد. متابعة؟")) return;
    try {
      await callApi("/api/draw/groups", "POST", { doubleRound, generateMatches: true });
      await refresh();
      flash("تمت القرعة بنجاح وتوليد جدول المباريات");
    } catch (e) {
      flash(e.message, true);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display text-2xl text-gold2 mb-4">إنشاء مجموعة</h2>
        <div className="flex flex-wrap gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أ  أو  A" className="flex-1 min-w-[160px] rounded-lg bg-black/30 border border-white/10 px-4 py-2.5 outline-none focus:border-gold/50" />
          <button onClick={addGroup} className="px-5 py-2.5 rounded-lg bg-gold/90 text-black font-semibold hover:bg-gold2 transition">إضافة مجموعة</button>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display text-2xl text-gold2 mb-4">المجموعات ({data.groups.length})</h2>
        {data.groups.length === 0 ? (
          <p className="text-white/40 text-sm">لا توجد مجموعات بعد.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {data.groups.map((g) => {
              const teams = data.teams.filter((t) => t.group === g.id);
              return (
                <div key={g.id} className="rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-xl text-gold2">المجموعة {g.name}</span>
                    <button onClick={() => deleteGroup(g.id)} className="text-red-400/70 hover:text-red-400 text-xs">حذف</button>
                  </div>
                  {teams.length === 0 ? (
                    <p className="text-white/30 text-xs">لا فرق بعد</p>
                  ) : (
                    <ul className="text-sm text-white/70 space-y-1">
                      {teams.map((t) => <li key={t.id}>{t.name}</li>)}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display text-2xl text-gold2 mb-3">قرعة توزيع المجموعات</h2>
        <p className="text-white/50 text-sm mb-4">توزّع كل الفرق عشوائيًا وبالتساوي على المجموعات الموجودة، وتُولّد جدول مباريات كل مجموعة تلقائيًا.</p>
        <label className="flex items-center gap-2 text-sm text-white/70 mb-4">
          <input type="checkbox" checked={doubleRound} onChange={(e) => setDoubleRound(e.target.checked)} />
          ذهاب وإياب (كل فريقين يلتقيان مرتين)
        </label>
        <button onClick={runDraw} className="px-5 py-2.5 rounded-lg bg-gold/90 text-black font-semibold hover:bg-gold2 transition">إجراء القرعة الآن</button>
      </div>
    </div>
  );
}

/* ---------------- مباريات المجموعات ---------------- */
function MatchesTab({ data, refresh, flash }) {
  const teamById = Object.fromEntries(data.teams.map((t) => [t.id, t]));
  const groupMatches = data.matches.filter((m) => m.stage === "group");

  async function saveScore(m, scoreA, scoreB) {
    try {
      await callApi(`/api/matches/${m.id}`, "PUT", {
        scoreA: scoreA === "" ? null : Number(scoreA),
        scoreB: scoreB === "" ? null : Number(scoreB),
        played: scoreA !== "" && scoreB !== "",
      });
      await refresh();
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function saveScorers(matchId, scorersA, scorersB) {
    try {
      await callApi(`/api/matches/${matchId}`, "PUT", { scorersA, scorersB });
      await refresh();
      flash("تم حفظ الهدافين");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function deleteMatch(id) {
    if (!confirm("حذف هذه المباراة؟")) return;
    try {
      await callApi(`/api/matches/${id}`, "DELETE");
      await refresh();
    } catch (e) {
      flash(e.message, true);
    }
  }

  if (data.groups.length === 0) {
    return <div className="glass-card rounded-2xl p-8 text-center text-white/50">أنشئ مجموعات وأجرِ القرعة أولًا من تبويب "المجموعات والقرعة" حتى تظهر المباريات هنا.</div>;
  }

  return (
    <div className="space-y-6">
      {data.groups.map((g) => {
        const matches = groupMatches.filter((m) => m.group === g.id);
        const table = computeStandings(data.teams, data.matches, g.id);
        return (
          <div key={g.id} className="glass-card rounded-2xl p-6">
            <h2 className="font-display text-2xl text-gold2 mb-4">المجموعة {g.name}</h2>
            <div className="overflow-x-auto mb-5">
              <table className="w-full text-xs min-w-[520px]">
                <thead>
                  <tr className="text-white/40">
                    <th className="text-right font-normal pb-2">الفريق</th>
                    <th className="pb-2">لعب</th>
                    <th className="pb-2">فوز</th>
                    <th className="pb-2">تعادل</th>
                    <th className="pb-2">خسارة</th>
                    <th className="pb-2">فارق</th>
                    <th className="pb-2">نقاط</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((t) => (
                    <tr key={t.id} className="border-t border-white/5">
                      <td className="py-1.5">{t.name}</td>
                      <td className="text-center">{t.played}</td>
                      <td className="text-center">{t.won}</td>
                      <td className="text-center">{t.drawn}</td>
                      <td className="text-center">{t.lost}</td>
                      <td className="text-center">{t.gf - t.ga}</td>
                      <td className="text-center text-gold2 font-display text-base">{t.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[11px] text-white/30 mt-2">
                هذا الجدول محسوب تلقائيًا من نتائج المباريات أدناه فقط للعرض — للاعتماد عليه في جدول الفرق، اضغط "تحديث النقاط تلقائيًا" في تبويب الفرق.
              </p>
            </div>
            <div className="space-y-2">
              {matches.length === 0 ? (
                <p className="text-white/30 text-sm">لا مباريات في هذه المجموعة.</p>
              ) : (
                matches.map((m) => (
                  <MatchRow key={m.id} match={m} teamA={teamById[m.teamA]} teamB={teamById[m.teamB]} onSave={saveScore} onDelete={deleteMatch} onSaveScorers={saveScorers} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MatchRow({ match, teamA, teamB, onSave, onDelete, onSaveScorers }) {
  const [a, setA] = useState(match.scoreA ?? "");
  const [b, setB] = useState(match.scoreB ?? "");
  return (
    <div className="rounded-lg border border-white/10 px-3 py-2 text-sm">
      <div className="flex items-center gap-3">
        <span className="flex-1 truncate">{teamA?.name || "—"}</span>
        <input type="number" value={a} onChange={(e) => setA(e.target.value)} onBlur={() => onSave(match, a, b)} className="w-14 text-center bg-black/20 border border-white/10 rounded px-1 py-1 outline-none focus:border-gold/50" />
        <span className="text-white/30">–</span>
        <input type="number" value={b} onChange={(e) => setB(e.target.value)} onBlur={() => onSave(match, a, b)} className="w-14 text-center bg-black/20 border border-white/10 rounded px-1 py-1 outline-none focus:border-gold/50" />
        <span className="flex-1 truncate text-left">{teamB?.name || "—"}</span>
        <button onClick={() => onDelete(match.id)} className="text-red-400/60 hover:text-red-400 text-xs">حذف</button>
      </div>
      {onSaveScorers && (
        <ScorersPanel match={match} teamA={teamA} teamB={teamB} onSaveScorers={onSaveScorers} />
      )}
    </div>
  );
}

/* ---------------- تسجيل الهدافين (مشترك بين المجموعات وخروج المغلوب) ---------------- */
function ScorersPanel({ match, teamA, teamB, onSaveScorers }) {
  const [open, setOpen] = useState(false);
  const [scorersA, setScorersA] = useState(match.scorersA || []);
  const [scorersB, setScorersB] = useState(match.scorersB || []);

  function addRow(side) {
    if (side === "A") setScorersA([...scorersA, { name: "", goals: 1 }]);
    else setScorersB([...scorersB, { name: "", goals: 1 }]);
  }
  function updateRow(side, idx, patch) {
    const list = [...(side === "A" ? scorersA : scorersB)];
    list[idx] = { ...list[idx], ...patch };
    if (side === "A") setScorersA(list);
    else setScorersB(list);
  }
  function removeRow(side, idx) {
    const list = (side === "A" ? scorersA : scorersB).filter((_, i) => i !== idx);
    if (side === "A") setScorersA(list);
    else setScorersB(list);
  }
  function save() {
    onSaveScorers(
      match.id,
      scorersA.filter((s) => s.name?.trim()),
      scorersB.filter((s) => s.name?.trim())
    );
  }

  const totalGoals =
    (match.scorersA || []).reduce((s, x) => s + (Number(x.goals) || 0), 0) +
    (match.scorersB || []).reduce((s, x) => s + (Number(x.goals) || 0), 0);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[11px] text-gold2/70 hover:text-gold2 mt-1.5">
        ⚽ تسجيل الهدافين {totalGoals > 0 ? `(${totalGoals} هدف مسجّل)` : ""}
      </button>
    );
  }

  return (
    <div className="mt-2 grid sm:grid-cols-2 gap-3 bg-black/20 rounded-lg p-3">
      <ScorerSide label={teamA?.name} rows={scorersA} onAdd={() => addRow("A")} onChange={(i, p) => updateRow("A", i, p)} onRemove={(i) => removeRow("A", i)} />
      <ScorerSide label={teamB?.name} rows={scorersB} onAdd={() => addRow("B")} onChange={(i, p) => updateRow("B", i, p)} onRemove={(i) => removeRow("B", i)} />
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="text-xs px-3 py-1.5 rounded border border-white/15 text-white/60 hover:bg-white/5">إغلاق</button>
        <button onClick={() => { save(); setOpen(false); }} className="text-xs px-3 py-1.5 rounded bg-gold/90 text-black font-semibold hover:bg-gold2">حفظ الهدافين</button>
      </div>
    </div>
  );
}

function ScorerSide({ label, rows, onAdd, onChange, onRemove }) {
  return (
    <div>
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <div className="space-y-1">
        {rows.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <input value={s.name} onChange={(e) => onChange(i, { name: e.target.value })} placeholder="اسم اللاعب" className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-gold/50" />
            <input type="number" min="1" value={s.goals} onChange={(e) => onChange(i, { goals: Number(e.target.value) })} className="w-12 text-center bg-black/30 border border-white/10 rounded px-1 py-1 text-xs outline-none focus:border-gold/50" />
            <button onClick={() => onRemove(i)} className="text-red-400/60 hover:text-red-400 text-xs">×</button>
          </div>
        ))}
      </div>
      <button onClick={onAdd} className="text-[11px] text-gold2/70 hover:text-gold2 mt-1">+ إضافة هداف</button>
    </div>
  );
}

/* ---------------- خروج المغلوب ---------------- */
function KnockoutTab({ data, refresh, flash }) {
  const teamById = Object.fromEntries(data.teams.map((t) => [t.id, t]));
  const [roundName, setRoundName] = useState("ربع النهائي");
  const [selected, setSelected] = useState([]);

  const knockoutMatches = data.matches.filter((m) => m.stage === "knockout");
  const rounds = [...new Set(knockoutMatches.map((m) => m.round))];

  function toggleTeam(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function runKnockoutDraw() {
    if (selected.length < 2) {
      flash("اختر فريقين على الأقل", true);
      return;
    }
    try {
      await callApi("/api/knockout/draw", "POST", { teamIds: selected, roundName });
      setSelected([]);
      await refresh();
      flash("تمت قرعة الدور الإقصائي");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function saveScore(m, scoreA, scoreB) {
    try {
      await callApi(`/api/matches/${m.id}`, "PUT", {
        scoreA: scoreA === "" ? null : Number(scoreA),
        scoreB: scoreB === "" ? null : Number(scoreB),
        played: scoreA !== "" && scoreB !== "",
      });
      await refresh();
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function setWinnerManually(m, winnerId) {
    try {
      await callApi(`/api/matches/${m.id}`, "PUT", { winner: winnerId });
      await refresh();
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function saveScorers(matchId, scorersA, scorersB) {
    try {
      await callApi(`/api/matches/${matchId}`, "PUT", { scorersA, scorersB });
      await refresh();
      flash("تم حفظ الهدافين");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function deleteMatch(id) {
    if (!confirm("حذف هذه المباراة؟")) return;
    try {
      await callApi(`/api/matches/${id}`, "DELETE");
      await refresh();
    } catch (e) {
      flash(e.message, true);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display text-2xl text-gold2 mb-3">قرعة دور إقصائي جديد</h2>
        <p className="text-white/50 text-sm mb-4">اختر الفرق المؤهلة لهذا الدور، ثم اضغط "إجراء القرعة" — سيتم تشكيل المباريات عشوائيًا بشكل زوجي.</p>
        <input value={roundName} onChange={(e) => setRoundName(e.target.value)} placeholder="اسم الدور (مثال: ربع النهائي)" className="w-full max-w-xs mb-4 rounded-lg bg-black/30 border border-white/10 px-4 py-2.5 outline-none focus:border-gold/50" />
        <div className="flex flex-wrap gap-2 mb-4">
          {data.teams.map((t) => (
            <button key={t.id} onClick={() => toggleTeam(t.id)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${selected.includes(t.id) ? "bg-gold/90 text-black border-gold" : "border-white/15 text-white/70 hover:bg-white/5"}`}>
              {t.name}
            </button>
          ))}
        </div>
        <button onClick={runKnockoutDraw} className="px-5 py-2.5 rounded-lg bg-gold/90 text-black font-semibold hover:bg-gold2 transition">
          إجراء القرعة ({selected.length} فريق مختار)
        </button>
      </div>

      {rounds.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-white/50">لا توجد أدوار إقصائية بعد.</div>
      ) : (
        rounds.map((roundLabel) => (
          <div key={roundLabel} className="glass-card rounded-2xl p-6">
            <h3 className="font-display text-2xl text-gold2 mb-4">{roundLabel}</h3>
            <div className="space-y-2">
              {knockoutMatches.filter((m) => m.round === roundLabel).map((m) => {
                const isTie = m.played && m.scoreA !== null && m.scoreA === m.scoreB;
                return (
                  <div key={m.id} className="rounded-lg border border-white/10 px-3 py-2">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex-1 truncate">{teamById[m.teamA]?.name || "—"}</span>
                      <ScoreInput match={m} side="A" onSave={saveScore} />
                      <span className="text-white/30">–</span>
                      <ScoreInput match={m} side="B" onSave={saveScore} />
                      <span className="flex-1 truncate text-left">{teamById[m.teamB]?.name || "—"}</span>
                      <button onClick={() => deleteMatch(m.id)} className="text-red-400/60 hover:text-red-400 text-xs">حذف</button>
                    </div>
                    {isTie && (
                      <div className="mt-2 text-xs text-amber-300/80 flex items-center gap-2">
                        تعادل — حدد الفائز يدويًا:
                        <button onClick={() => setWinnerManually(m, m.teamA)} className={`px-2 py-1 rounded border ${m.winner === m.teamA ? "bg-gold/90 text-black border-gold" : "border-white/20"}`}>{teamById[m.teamA]?.name}</button>
                        <button onClick={() => setWinnerManually(m, m.teamB)} className={`px-2 py-1 rounded border ${m.winner === m.teamB ? "bg-gold/90 text-black border-gold" : "border-white/20"}`}>{teamById[m.teamB]?.name}</button>
                      </div>
                    )}
                    {m.winner && !isTie && <p className="mt-1 text-xs text-green-300/70">المتأهل: {teamById[m.winner]?.name}</p>}
                    <ScorersPanel match={m} teamA={teamById[m.teamA]} teamB={teamById[m.teamB]} onSaveScorers={saveScorers} />
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ScoreInput({ match, side, onSave }) {
  const field = side === "A" ? "scoreA" : "scoreB";
  const [val, setVal] = useState(match[field] ?? "");
  return (
    <input
      type="number"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        const a = side === "A" ? val : match.scoreA ?? "";
        const b = side === "B" ? val : match.scoreB ?? "";
        onSave(match, a, b);
      }}
      className="w-14 text-center bg-black/20 border border-white/10 rounded px-1 py-1 outline-none focus:border-gold/50"
    />
  );
}

/* ---------------- الهدافون والجوائز الفردية ---------------- */
function AwardsTab({ data, refresh, flash }) {
  const scorers = computeTopScorers(data.teams, data.matches);
  const awards = data.settings?.awards || {};
  const [bestPlayer, setBestPlayer] = useState(awards.bestPlayer || "");
  const [bestGoalkeeper, setBestGoalkeeper] = useState(awards.bestGoalkeeper || "");
  const [bestYoungPlayer, setBestYoungPlayer] = useState(awards.bestYoungPlayer || "");

  async function saveAwards() {
    try {
      await callApi("/api/data", "PUT", {
        awards: { bestPlayer, bestGoalkeeper, bestYoungPlayer },
      });
      await refresh();
      flash("تم حفظ الجوائز الفردية");
    } catch (e) {
      flash(e.message, true);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display text-2xl text-gold2 mb-4">🏆 قائمة الهدافين</h2>
        <p className="text-white/50 text-sm mb-4">
          محسوبة تلقائيًا من الأهداف التي تسجّلها في تبويبي "مباريات المجموعات" و"خروج المغلوب"
          عبر زر "تسجيل الهدافين" أسفل كل مباراة.
        </p>
        {scorers.length === 0 ? (
          <p className="text-white/40 text-sm">لم تُسجَّل أي أهداف بعد.</p>
        ) : (
          <table className="w-full text-sm max-w-lg">
            <thead>
              <tr className="text-white/40 text-xs">
                <th className="text-right font-normal pb-2">#</th>
                <th className="text-right font-normal pb-2">اللاعب</th>
                <th className="text-right font-normal pb-2">الفريق</th>
                <th className="pb-2">أهداف</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((s, i) => (
                <tr key={`${s.name}-${s.teamId}`} className="border-t border-white/5">
                  <td className="py-2 text-white/40">{i + 1}</td>
                  <td className="py-2 font-semibold">{s.name}</td>
                  <td className="py-2 text-white/60">{s.teamName}</td>
                  <td className="py-2 text-center font-display text-lg text-gold2">{s.goals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6 max-w-lg">
        <h2 className="font-display text-2xl text-gold2 mb-4">🎖️ الجوائز الفردية</h2>
        <p className="text-white/50 text-sm mb-4">
          جوائز تُمنح يدويًا بقرارك (لا تُحسب تلقائيًا) — مثل جوائز نهاية الموسم.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">أفضل لاعب في الدوري</label>
            <input value={bestPlayer} onChange={(e) => setBestPlayer(e.target.value)} placeholder="اسم اللاعب" className="w-full rounded-lg bg-black/30 border border-white/10 px-4 py-2.5 outline-none focus:border-gold/50" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">أفضل حارس مرمى</label>
            <input value={bestGoalkeeper} onChange={(e) => setBestGoalkeeper(e.target.value)} placeholder="اسم الحارس" className="w-full rounded-lg bg-black/30 border border-white/10 px-4 py-2.5 outline-none focus:border-gold/50" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">أفضل لاعب شاب</label>
            <input value={bestYoungPlayer} onChange={(e) => setBestYoungPlayer(e.target.value)} placeholder="اسم اللاعب" className="w-full rounded-lg bg-black/30 border border-white/10 px-4 py-2.5 outline-none focus:border-gold/50" />
          </div>
          <button onClick={saveAwards} className="px-5 py-2.5 rounded-lg bg-gold/90 text-black font-semibold hover:bg-gold2 transition">
            حفظ الجوائز
          </button>
        </div>
      </div>
    </div>
  );
}
