"use client";
import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import Confetti from "../../components/Confetti";
import { useLeagueData, callApi } from "../../lib/useLeagueData";
import { computeStandings, computeTopScorers, findVenueConflict } from "../../lib/logic";

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
  { id: "players", label: "اللاعبون" },
  { id: "groups", label: "المجموعات والقرعة" },
  { id: "matches", label: "مباريات المجموعات" },
  { id: "knockout", label: "خروج المغلوب" },
  { id: "awards", label: "الهدافون والجوائز" },
  { id: "archive", label: "أرشيف المواسم" },
];

function Dashboard({ onLoggedOut }) {
  const { data, loading, error, refresh } = useLeagueData();
  const [tab, setTab] = useState("teams");
  const [msg, setMsg] = useState(null);
  const [celebrateTick, setCelebrateTick] = useState(0);

  function flash(text, isError = false) {
    setMsg({ text, isError });
    setTimeout(() => setMsg(null), 3500);
  }

  function celebrate() {
    setCelebrateTick((t) => t + 1);
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
      <Confetti trigger={celebrateTick} />
      <Nav leagueName={data.settings?.leagueName} />
      <main className="max-w-6xl mx-auto px-4 pb-24">
        <div className="flex items-center justify-between pt-8 pb-6">
          <h1 className="font-display text-4xl gold-text">لوحة التحكم</h1>
          <button onClick={handleLogout} className="text-sm px-4 py-2 rounded-lg border border-white/15 hover:bg-white/5 transition">
            تسجيل الخروج
          </button>
        </div>

        {msg && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm pop-in ${msg.isError ? "bg-red-500/15 text-red-300 border border-red-500/30" : "bg-green-500/15 text-green-300 border border-green-500/30"}`}>
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

        <div key={tab} className="tab-transition">
          {tab === "settings" && <SettingsTab data={data} refresh={refresh} flash={flash} />}
          {tab === "teams" && <TeamsTab data={data} refresh={refresh} flash={flash} />}
          {tab === "players" && <PlayersTab data={data} refresh={refresh} flash={flash} />}
          {tab === "groups" && <GroupsTab data={data} refresh={refresh} flash={flash} />}
          {tab === "matches" && <MatchesTab data={data} refresh={refresh} flash={flash} celebrate={celebrate} />}
          {tab === "knockout" && <KnockoutTab data={data} refresh={refresh} flash={flash} celebrate={celebrate} />}
          {tab === "awards" && <AwardsTab data={data} refresh={refresh} flash={flash} />}
          {tab === "archive" && <ArchiveTab data={data} refresh={refresh} flash={flash} />}
        </div>

        <div className="mt-14 pt-6 border-t border-white/10">
          <button
            onClick={async () => {
              if (!confirm("سيتم حذف كل الفرق والمجموعات والمباريات نهائيًا (سيبقى أرشيف المواسم السابقة كما هو). متأكد؟")) return;
              await callApi("/api/reset", "POST", {});
              await refresh();
              flash("تمت إعادة ضبط الدوري بالكامل");
            }}
            className="text-sm px-4 py-2 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10 transition"
          >
            إعادة ضبط الدوري بالكامل (حذف كل شيء عدا الأرشيف)
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
  const [championTeamId, setChampionTeamId] = useState(data.settings?.championTeamId || "");
  const [soundEnabled, setSoundEnabled] = useState(data.settings?.soundEnabled !== false);

  async function save() {
    try {
      await callApi("/api/data", "PUT", { leagueName, season });
      await refresh();
      flash("تم حفظ الإعدادات");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function saveChampion() {
    try {
      await callApi("/api/data", "PUT", { championTeamId: championTeamId || null });
      await refresh();
      flash(championTeamId ? "🏆 تم تتويج الفريق البطل! ستظهر صفحة الاحتفال للزوار" : "تم إلغاء تتويج البطل");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function toggleSound(val) {
    setSoundEnabled(val);
    try {
      await callApi("/api/data", "PUT", { soundEnabled: val });
      await refresh();
    } catch (e) {
      flash(e.message, true);
    }
  }

  return (
    <div className="space-y-6">
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

      <div className="glass-card rounded-2xl p-6 max-w-lg">
        <h2 className="font-display text-2xl text-gold2 mb-2">🏆 تتويج بطل الموسم</h2>
        <p className="text-white/50 text-sm mb-4">
          عند تحديد الفريق البطل، تظهر للزوار صفحة احتفالية خاصة أعلى الموقع. ألغِ الاختيار لإخفائها.
        </p>
        <div className="flex flex-wrap gap-3">
          <select value={championTeamId} onChange={(e) => setChampionTeamId(e.target.value)} className="flex-1 min-w-[180px] rounded-lg bg-black/30 border border-white/10 px-4 py-2.5 outline-none focus:border-gold/50">
            <option value="">— لا يوجد بطل بعد —</option>
            {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={saveChampion} className="px-5 py-2.5 rounded-lg bg-gold/90 text-black font-semibold hover:bg-gold2 transition">
            حفظ
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 max-w-lg">
        <h2 className="font-display text-2xl text-gold2 mb-2">🔊 الأصوات</h2>
        <p className="text-white/50 text-sm mb-4">صافرة ترحيبية خفيفة تُسمع مرة واحدة عند أول زيارة للموقع في كل جلسة تصفح.</p>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={soundEnabled} onChange={(e) => toggleSound(e.target.checked)} />
          تفعيل صافرة الترحيب للزوار
        </label>
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
function MatchesTab({ data, refresh, flash, celebrate }) {
  const teamById = Object.fromEntries(data.teams.map((t) => [t.id, t]));
  const groupMatches = data.matches.filter((m) => m.stage === "group");

  async function saveScore(m, scoreA, scoreB) {
    const played = scoreA !== "" && scoreB !== "";
    try {
      await callApi(`/api/matches/${m.id}`, "PUT", {
        scoreA: scoreA === "" ? null : Number(scoreA),
        scoreB: scoreB === "" ? null : Number(scoreB),
        played,
      });
      await refresh();
      if (played) celebrate?.();
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function saveDateTime(matchId, date, time, venue) {
    try {
      await callApi(`/api/matches/${matchId}`, "PUT", { date, time, venue });
      const conflict = findVenueConflict(data.matches, { id: matchId, date, time, venue });
      await refresh();
      if (conflict) {
        const a = teamById[conflict.teamA]?.name || "؟";
        const b = teamById[conflict.teamB]?.name || "؟";
        flash(`⚠️ تعارض مواعيد: نفس الملعب والوقت محجوز أيضًا لمباراة ${a} ضد ${b}`, true);
      }
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function saveEvents(matchId, events) {
    try {
      await callApi(`/api/matches/${matchId}`, "PUT", { events });
      await refresh();
      flash("تم حفظ أحداث المباراة");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function saveNotes(matchId, notes) {
    try {
      await callApi(`/api/matches/${matchId}`, "PUT", { notes });
      await refresh();
      flash("تم حفظ الملاحظات");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function saveMotm(matchId, motm) {
    try {
      await callApi(`/api/matches/${matchId}`, "PUT", { motm });
      await refresh();
      flash("تم تحديد أفضل لاعب في المباراة");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function saveLineups(matchId, lineups) {
    try {
      await callApi(`/api/matches/${matchId}`, "PUT", { lineups });
      await refresh();
      flash("تم حفظ التشكيلة");
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

  async function addManualMatch(groupId, teamAId, teamBId, resetFn) {
    if (!teamAId || !teamBId || teamAId === teamBId) {
      flash("اختر فريقين مختلفين", true);
      return;
    }
    try {
      await callApi("/api/matches", "POST", { stage: "group", group: groupId, teamA: teamAId, teamB: teamBId });
      resetFn();
      await refresh();
      flash("تمت إضافة المباراة يدويًا");
    } catch (e) {
      flash(e.message, true);
    }
  }

  if (data.groups.length === 0) {
    return <div className="glass-card rounded-2xl p-8 text-center text-white/50">أنشئ مجموعات أولًا من تبويب "المجموعات والقرعة" حتى تستطيع إضافة مباريات لها.</div>;
  }

  return (
    <div className="space-y-6">
      {data.groups.map((g) => {
        const matches = groupMatches.filter((m) => m.group === g.id);
        const groupTeams = data.teams.filter((t) => t.group === g.id);
        const table = computeStandings(data.teams, data.matches, g.id);
        return (
          <div key={g.id} className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl text-gold2">المجموعة {g.name}</h2>
              <ShareStandingsButton leagueName={data.settings?.leagueName} groupName={g.name} table={table} />
            </div>
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
                يُحدَّث هذا الجدول فورًا فور حفظ نتيجة أي مباراة أدناه.
              </p>
            </div>

            <div className="space-y-2 mb-4">
              {matches.length === 0 ? (
                <p className="text-white/30 text-sm">لا مباريات في هذه المجموعة بعد.</p>
              ) : (
                matches.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    teamA={teamById[m.teamA]}
                    teamB={teamById[m.teamB]}
                    onSave={saveScore}
                    onDelete={deleteMatch}
                    onSaveEvents={saveEvents}
                    onSaveNotes={saveNotes}
                    onSaveDateTime={saveDateTime}
                    onSaveMotm={saveMotm}
                    onSaveLineups={saveLineups}
                  />
                ))
              )}
            </div>

            <ManualMatchForm teams={groupTeams} onAdd={(a, b, reset) => addManualMatch(g.id, a, b, reset)} />
          </div>
        );
      })}
    </div>
  );
}

/* زر مشاركة الترتيب عبر واتساب */
function ShareStandingsButton({ leagueName, groupName, table }) {
  function share() {
    const lines = table
      .slice(0, 8)
      .map((t, i) => `${i + 1}. ${t.name} — ${t.points} نقطة`)
      .join("\n");
    const text = `📊 ترتيب المجموعة ${groupName} — ${leagueName || "الدوري"}\n\n${lines}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
  return (
    <button onClick={share} className="text-xs px-3 py-1.5 rounded-lg border border-green-500/40 text-green-300 hover:bg-green-500/10 transition flex items-center gap-1">
      📤 مشاركة عبر واتساب
    </button>
  );
}

/* نموذج إضافة مباراة يدويًا داخل مجموعة (تحكم كامل، بدل الاعتماد فقط على القرعة) */
function ManualMatchForm({ teams, onAdd }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  if (teams.length < 2) {
    return <p className="text-[11px] text-white/30">أضف فريقين على الأقل لهذه المجموعة لتتمكن من إضافة مباراة يدويًا.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
      <span className="text-xs text-white/50">إضافة مباراة يدويًا:</span>
      <select value={a} onChange={(e) => setA(e.target.value)} className="rounded-lg bg-black/30 border border-white/10 px-3 py-1.5 text-sm outline-none focus:border-gold/50">
        <option value="">الفريق الأول</option>
        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <span className="text-white/30 text-sm">ضد</span>
      <select value={b} onChange={(e) => setB(e.target.value)} className="rounded-lg bg-black/30 border border-white/10 px-3 py-1.5 text-sm outline-none focus:border-gold/50">
        <option value="">الفريق الثاني</option>
        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <button
        onClick={() => onAdd(a, b, () => { setA(""); setB(""); })}
        className="px-3 py-1.5 rounded-lg bg-gold/90 text-black text-sm font-semibold hover:bg-gold2 transition"
      >
        إضافة المباراة
      </button>
    </div>
  );
}

function MatchRow({ match, teamA, teamB, onSave, onDelete, onSaveEvents, onSaveNotes, onSaveDateTime, onSaveMotm, onSaveLineups }) {
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
      {onSaveDateTime && <MatchDateTimeInputs match={match} onSave={onSaveDateTime} />}
      {onSaveEvents && (
        <MatchDetailsPanel
          match={match}
          teamA={teamA}
          teamB={teamB}
          onSaveEvents={onSaveEvents}
          onSaveNotes={onSaveNotes}
          onSaveMotm={onSaveMotm}
          onSaveLineups={onSaveLineups}
        />
      )}
    </div>
  );
}

/* حقول التاريخ والوقت والملعب (مشتركة بين مباريات المجموعات وخروج المغلوب) */
function MatchDateTimeInputs({ match, onSave }) {
  const [date, setDate] = useState(match.date || "");
  const [time, setTime] = useState(match.time || "");
  const [venue, setVenue] = useState(match.venue || "");
  return (
    <div className="flex flex-wrap items-center gap-2 mt-1.5">
      <span className="text-[11px] text-white/40">📅</span>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        onBlur={() => onSave(match.id, date, time, venue)}
        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-gold/50 [color-scheme:dark]"
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        onBlur={() => onSave(match.id, date, time, venue)}
        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-gold/50 [color-scheme:dark]"
      />
      <span className="text-[11px] text-white/40">📍</span>
      <input
        value={venue}
        onChange={(e) => setVenue(e.target.value)}
        onBlur={() => onSave(match.id, date, time, venue)}
        placeholder="الملعب"
        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-gold/50 w-28"
      />
    </div>
  );
}

/* ---------------- تفاصيل المباراة: أهداف بالدقيقة + إنذارات + ملاحظات ---------------- */
function MatchDetailsPanel({ match, teamA, teamB, onSaveEvents, onSaveNotes, onSaveMotm, onSaveLineups }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState(match.events || []);
  const [notes, setNotes] = useState(match.notes || "");
  const [motm, setMotm] = useState(match.motm || null);
  const [lineups, setLineups] = useState(
    match.lineups || { A: { starting: [], subs: [] }, B: { starting: [], subs: [] } }
  );

  const playersA = teamA?.players || [];
  const playersB = teamB?.players || [];

  function addEvent(side, type) {
    const players = side === "A" ? playersA : playersB;
    setEvents([...events, { id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, side, type, playerId: players[0]?.id || "", minute: "" }]);
  }
  function updateEvent(idx, patch) {
    const list = [...events];
    list[idx] = { ...list[idx], ...patch };
    setEvents(list);
  }
  function removeEvent(idx) {
    setEvents(events.filter((_, i) => i !== idx));
  }
  function toggleLineup(side, group, playerId) {
    const current = lineups[side][group];
    const next = current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId];
    setLineups({ ...lineups, [side]: { ...lineups[side], [group]: next } });
  }
  function saveAll() {
    onSaveEvents(match.id, events);
    onSaveNotes(match.id, notes);
    onSaveMotm?.(match.id, motm);
    onSaveLineups?.(match.id, lineups);
  }

  const goalsCount = (match.events || []).filter((e) => e.type === "goal").length;
  const cardsCount = (match.events || []).filter((e) => e.type !== "goal").length;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[11px] text-gold2/70 hover:text-gold2 mt-1.5">
        📋 تفاصيل المباراة {goalsCount > 0 || cardsCount > 0 ? `(⚽ ${goalsCount} · 🟨 ${cardsCount})` : ""}
      </button>
    );
  }

  const sorted = [...events].sort((x, y) => (Number(x.minute) || 0) - (Number(y.minute) || 0));
  const allPlayersForMotm = [
    ...playersA.map((p) => ({ ...p, side: "A", teamName: teamA?.name })),
    ...playersB.map((p) => ({ ...p, side: "B", teamName: teamB?.name })),
  ];

  return (
    <div className="mt-2 bg-black/20 rounded-lg p-3 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <EventSide label={teamA?.name} side="A" players={playersA} events={sorted} allEvents={events} onAdd={addEvent} onChange={updateEvent} onRemove={removeEvent} />
        <EventSide label={teamB?.name} side="B" players={playersB} events={sorted} allEvents={events} onAdd={addEvent} onChange={updateEvent} onRemove={removeEvent} />
      </div>

      {allPlayersForMotm.length > 0 && (
        <div>
          <label className="block text-xs text-white/50 mb-1">⭐ أفضل لاعب في المباراة (Man of the Match)</label>
          <select
            value={motm ? `${motm.side}:${motm.playerId}` : ""}
            onChange={(e) => {
              if (!e.target.value) return setMotm(null);
              const [side, playerId] = e.target.value.split(":");
              setMotm({ side, playerId });
            }}
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-xs outline-none focus:border-gold/50"
          >
            <option value="">— بدون —</option>
            {allPlayersForMotm.map((p) => (
              <option key={`${p.side}:${p.id}`} value={`${p.side}:${p.id}`}>{p.name} ({p.teamName})</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs text-white/50 mb-1.5">🧩 التشكيلة (أساسي / احتياطي)</label>
        <div className="grid sm:grid-cols-2 gap-3">
          <LineupSide label={teamA?.name} players={playersA} lineup={lineups.A} onToggle={(g, id) => toggleLineup("A", g, id)} />
          <LineupSide label={teamB?.name} players={playersB} lineup={lineups.B} onToggle={(g, id) => toggleLineup("B", g, id)} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1">ملاحظات المباراة (اختياري)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="مثال: تأجلت المباراة نصف ساعة بسبب المطر..."
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-xs outline-none focus:border-gold/50 resize-none"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="text-xs px-3 py-1.5 rounded border border-white/15 text-white/60 hover:bg-white/5">إغلاق</button>
        <button onClick={() => { saveAll(); setOpen(false); }} className="text-xs px-3 py-1.5 rounded bg-gold/90 text-black font-semibold hover:bg-gold2">حفظ التفاصيل</button>
      </div>
    </div>
  );
}

/* اختيار الأساسيين والاحتياط لكل فريق في مباراة معينة */
function LineupSide({ label, players, lineup, onToggle }) {
  if (players.length === 0) {
    return (
      <div>
        <p className="text-xs text-white/50 mb-1">{label}</p>
        <p className="text-[11px] text-white/30">لا لاعبون مسجّلون.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
        {players.map((p) => {
          const isStarting = lineup.starting.includes(p.id);
          const isSub = lineup.subs.includes(p.id);
          return (
            <div key={p.id} className="flex items-center justify-between text-[11px] gap-2">
              <span className="truncate flex-1">{p.name}</span>
              <button
                onClick={() => onToggle("starting", p.id)}
                className={`px-1.5 py-0.5 rounded ${isStarting ? "bg-gold/90 text-black" : "border border-white/15 text-white/50"}`}
              >
                أساسي
              </button>
              <button
                onClick={() => onToggle("subs", p.id)}
                className={`px-1.5 py-0.5 rounded ${isSub ? "bg-ember/70 text-white" : "border border-white/15 text-white/50"}`}
              >
                احتياط
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventSide({ label, side, players, allEvents, onAdd, onChange, onRemove }) {
  const rows = allEvents
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.side === side);

  if (players.length === 0) {
    return (
      <div>
        <p className="text-xs text-white/50 mb-1">{label}</p>
        <p className="text-[11px] text-white/30">لا لاعبون مسجّلون — سجّلهم من تبويب "اللاعبون".</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <div className="space-y-1 mb-1.5">
        {rows.map(({ e, i }) => (
          <div key={e.id} className="flex items-center gap-1">
            <span className="w-5 text-center text-xs">{e.type === "goal" ? "⚽" : e.type === "yellow" ? "🟨" : "🟥"}</span>
            <select value={e.playerId} onChange={(ev) => onChange(i, { playerId: ev.target.value })} className="flex-1 bg-black/30 border border-white/10 rounded px-1.5 py-1 text-xs outline-none focus:border-gold/50">
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input
              type="number"
              min="1"
              max="130"
              value={e.minute}
              onChange={(ev) => onChange(i, { minute: ev.target.value })}
              placeholder="د"
              className="w-11 text-center bg-black/30 border border-white/10 rounded px-1 py-1 text-xs outline-none focus:border-gold/50"
            />
            <button onClick={() => onRemove(i)} className="text-red-400/60 hover:text-red-400 text-xs">×</button>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 text-[11px]">
        <button onClick={() => onAdd(side, "goal")} className="text-gold2/70 hover:text-gold2">+ ⚽ هدف</button>
        <button onClick={() => onAdd(side, "yellow")} className="text-yellow-300/70 hover:text-yellow-300">+ 🟨 إنذار</button>
        <button onClick={() => onAdd(side, "red")} className="text-red-400/70 hover:text-red-400">+ 🟥 طرد</button>
      </div>
    </div>
  );
}

/* ---------------- خروج المغلوب ---------------- */
function KnockoutTab({ data, refresh, flash, celebrate }) {
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
    const played = scoreA !== "" && scoreB !== "";
    try {
      await callApi(`/api/matches/${m.id}`, "PUT", {
        scoreA: scoreA === "" ? null : Number(scoreA),
        scoreB: scoreB === "" ? null : Number(scoreB),
        played,
      });
      await refresh();
      if (played) celebrate?.();
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function saveDateTime(matchId, date, time, venue) {
    try {
      await callApi(`/api/matches/${matchId}`, "PUT", { date, time, venue });
      const conflict = findVenueConflict(data.matches, { id: matchId, date, time, venue });
      await refresh();
      if (conflict) {
        const a = teamById[conflict.teamA]?.name || "؟";
        const b = teamById[conflict.teamB]?.name || "؟";
        flash(`⚠️ تعارض مواعيد: نفس الملعب والوقت محجوز أيضًا لمباراة ${a} ضد ${b}`, true);
      }
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

  async function saveEvents(matchId, events) {
    try {
      await callApi(`/api/matches/${matchId}`, "PUT", { events });
      await refresh();
      flash("تم حفظ أحداث المباراة");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function saveNotes(matchId, notes) {
    try {
      await callApi(`/api/matches/${matchId}`, "PUT", { notes });
      await refresh();
      flash("تم حفظ الملاحظات");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function saveMotm(matchId, motm) {
    try {
      await callApi(`/api/matches/${matchId}`, "PUT", { motm });
      await refresh();
      flash("تم تحديد أفضل لاعب في المباراة");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function saveLineups(matchId, lineups) {
    try {
      await callApi(`/api/matches/${matchId}`, "PUT", { lineups });
      await refresh();
      flash("تم حفظ التشكيلة");
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

  async function addManualKnockoutMatch(teamAId, teamBId, round, resetFn) {
    if (!teamAId || !teamBId || teamAId === teamBId) {
      flash("اختر فريقين مختلفين", true);
      return;
    }
    if (!round?.trim()) {
      flash("أدخل اسم الدور", true);
      return;
    }
    try {
      await callApi("/api/matches", "POST", { stage: "knockout", teamA: teamAId, teamB: teamBId, round: round.trim() });
      resetFn();
      await refresh();
      flash("تمت إضافة المباراة يدويًا");
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

      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display text-2xl text-gold2 mb-3">إضافة مباراة إقصائية يدويًا</h2>
        <p className="text-white/50 text-sm mb-4">تحكّم كامل: حدد أي فريقين مباشرة بدل الاعتماد على القرعة العشوائية.</p>
        <ManualKnockoutForm teams={data.teams} onAdd={addManualKnockoutMatch} />
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
                    <MatchDateTimeInputs match={m} onSave={saveDateTime} />
                    {isTie && (
                      <div className="mt-2 text-xs text-amber-300/80 flex items-center gap-2">
                        تعادل — حدد الفائز يدويًا:
                        <button onClick={() => setWinnerManually(m, m.teamA)} className={`px-2 py-1 rounded border ${m.winner === m.teamA ? "bg-gold/90 text-black border-gold" : "border-white/20"}`}>{teamById[m.teamA]?.name}</button>
                        <button onClick={() => setWinnerManually(m, m.teamB)} className={`px-2 py-1 rounded border ${m.winner === m.teamB ? "bg-gold/90 text-black border-gold" : "border-white/20"}`}>{teamById[m.teamB]?.name}</button>
                      </div>
                    )}
                    {m.winner && !isTie && <p className="mt-1 text-xs text-green-300/70">المتأهل: {teamById[m.winner]?.name}</p>}
                    <MatchDetailsPanel
                      match={m}
                      teamA={teamById[m.teamA]}
                      teamB={teamById[m.teamB]}
                      onSaveEvents={saveEvents}
                      onSaveNotes={saveNotes}
                      onSaveMotm={saveMotm}
                      onSaveLineups={saveLineups}
                    />
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

/* نموذج إضافة مباراة إقصائية يدويًا (تحكم كامل، بدل الاعتماد فقط على القرعة العشوائية) */
function ManualKnockoutForm({ teams, onAdd }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [round, setRound] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={a} onChange={(e) => setA(e.target.value)} className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-gold/50">
        <option value="">الفريق الأول</option>
        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <span className="text-white/30 text-sm">ضد</span>
      <select value={b} onChange={(e) => setB(e.target.value)} className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-gold/50">
        <option value="">الفريق الثاني</option>
        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <input value={round} onChange={(e) => setRound(e.target.value)} placeholder="اسم الدور" className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-gold/50 w-32" />
      <button
        onClick={() => onAdd(a, b, round, () => { setA(""); setB(""); setRound(""); })}
        className="px-3 py-2 rounded-lg bg-gold/90 text-black text-sm font-semibold hover:bg-gold2 transition"
      >
        إضافة المباراة
      </button>
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

/* ---------------- اللاعبون ---------------- */
function PlayersTab({ data, refresh, flash }) {
  const scorers = computeTopScorers(data.teams, data.matches);
  const goalsByPlayerId = Object.fromEntries(
    scorers.filter((s) => s.playerId).map((s) => [s.playerId, s.goals])
  );

  async function addPlayer(teamId, name, clearInput) {
    if (!name?.trim()) return;
    try {
      await callApi("/api/players", "POST", { teamId, name });
      clearInput();
      await refresh();
      flash("تمت إضافة اللاعب");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function removePlayer(teamId, playerId) {
    if (!confirm("حذف هذا اللاعب من القائمة؟")) return;
    try {
      await callApi(`/api/players/${teamId}/${playerId}`, "DELETE");
      await refresh();
      flash("تم حذف اللاعب");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function setCaptain(teamId, playerId) {
    try {
      await callApi(`/api/teams/${teamId}`, "PUT", { captainId: playerId || null });
      await refresh();
      flash("تم تحديد الكابتن");
    } catch (e) {
      flash(e.message, true);
    }
  }

  if (data.teams.length === 0) {
    return <div className="glass-card rounded-2xl p-8 text-center text-white/50">أضف فرقًا أولًا من تبويب "الفرق" حتى تستطيع تسجيل لاعبيها.</div>;
  }

  return (
    <div className="space-y-6">
      <p className="text-white/50 text-sm">
        سجّل هنا أسماء لاعبي كل فريق مرة واحدة — بعدها يمكنك اختيارهم مباشرة عند تسجيل
        الهدافين في أي مباراة، وستُحسب أهدافهم تلقائيًا في قائمة الهدافين.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {data.teams.map((t) => (
          <TeamPlayersCard
            key={t.id}
            team={t}
            goalsByPlayerId={goalsByPlayerId}
            onAdd={addPlayer}
            onRemove={removePlayer}
            onSetCaptain={setCaptain}
          />
        ))}
      </div>
    </div>
  );
}

function TeamPlayersCard({ team, goalsByPlayerId, onAdd, onRemove, onSetCaptain }) {
  const [name, setName] = useState("");
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-display text-xl text-gold2 mb-3">{team.name}</h3>
      {(team.players || []).length === 0 ? (
        <p className="text-white/30 text-xs mb-3">لا لاعبون مسجّلون بعد.</p>
      ) : (
        <ul className="space-y-1.5 mb-3">
          {team.players.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm rounded-lg border border-white/10 px-3 py-1.5">
              <span className="flex items-center gap-1.5">
                {p.name}
                {team.captainId === p.id && <span className="text-gold2 text-xs font-bold" title="كابتن الفريق">(C)</span>}
              </span>
              <span className="flex items-center gap-2">
                {goalsByPlayerId[p.id] > 0 && (
                  <span className="text-xs text-gold2 font-display text-base">⚽ {goalsByPlayerId[p.id]}</span>
                )}
                <button
                  onClick={() => onSetCaptain(team.id, team.captainId === p.id ? null : p.id)}
                  className={`text-xs ${team.captainId === p.id ? "text-gold2" : "text-white/30 hover:text-gold2"}`}
                  title="تعيين ككابتن"
                >
                  {team.captainId === p.id ? "★ كابتن" : "تعيين كابتن"}
                </button>
                <button onClick={() => onRemove(team.id, p.id)} className="text-red-400/60 hover:text-red-400 text-xs">حذف</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAdd(team.id, name, () => setName(""));
            }
          }}
          placeholder="اسم لاعب جديد"
          className="flex-1 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-gold/50"
        />
        <button
          onClick={() => onAdd(team.id, name, () => setName(""))}
          className="px-3 py-2 rounded-lg bg-gold/90 text-black text-sm font-semibold hover:bg-gold2 transition"
        >
          إضافة
        </button>
      </div>
    </div>
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
                <tr key={`${s.playerId || s.name}-${s.teamId}`} className="border-t border-white/5">
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

/* ---------------- أرشيف المواسم + جدول المواعيد + شهادة البطل ---------------- */
function ArchiveTab({ data, refresh, flash }) {
  const [label, setLabel] = useState(data.settings?.season || "");
  const teamById = Object.fromEntries(data.teams.map((t) => [t.id, t]));

  const scheduled = data.matches
    .filter((m) => m.date)
    .sort((a, b) => `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`));

  async function archiveSeason() {
    if (
      !confirm(
        "سيُحفظ الموسم الحالي بالكامل في الأرشيف، ثم تُمسح الفرق والمجموعات والمباريات لبدء موسم جديد. متابعة؟"
      )
    )
      return;
    try {
      await callApi("/api/season/archive", "POST", { label });
      await refresh();
      flash("تمت أرشفة الموسم بنجاح — يمكنك الآن بدء موسم جديد");
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function downloadCertificate() {
    const championId = data.settings?.championTeamId;
    if (!championId) {
      flash("حدد الفريق البطل أولًا من تبويب الإعدادات", true);
      return;
    }
    const champion = teamById[championId];
    const bestPlayer = data.settings?.awards?.bestPlayer || "";
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();

      doc.setFillColor(8, 10, 24);
      doc.rect(0, 0, w, h, "F");
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(1.2);
      doc.rect(8, 8, w - 16, h - 16);
      doc.setLineWidth(0.4);
      doc.rect(11, 11, w - 22, h - 22);

      doc.setTextColor(212, 175, 55);
      doc.setFontSize(14);
      doc.text(data.settings?.leagueName || "الدوري", w / 2, 30, { align: "center" });

      doc.setFontSize(28);
      doc.text("شهادة تتويج بطل الموسم", w / 2, 48, { align: "center" });

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text(`موسم ${data.settings?.season || ""}`, w / 2, 60, { align: "center" });

      doc.setTextColor(243, 214, 117);
      doc.setFontSize(34);
      doc.text(champion?.name || "", w / 2, 85, { align: "center" });

      if (bestPlayer) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.text(`أفضل لاعب في الموسم: ${bestPlayer}`, w / 2, 100, { align: "center" });
      }

      doc.setTextColor(150, 150, 170);
      doc.setFontSize(10);
      doc.text("تهانينا على هذا الإنجاز الاستثنائي", w / 2, h - 20, { align: "center" });

      doc.save(`شهادة-البطل-${champion?.name || "team"}.pdf`);
      flash("تم تحميل الشهادة");
    } catch (e) {
      flash("تعذر إنشاء ملف PDF: " + e.message, true);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display text-2xl text-gold2 mb-2">🗄️ أرشفة الموسم وبدء موسم جديد</h2>
        <p className="text-white/50 text-sm mb-4">
          يحفظ هذا كل بيانات الموسم الحالي (الفرق، المجموعات، النتائج) في الأرشيف بشكل دائم
          للرجوع إليها لاحقًا، ثم يمسح كل شيء لتبدأ موسمًا جديدًا من الصفر.
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="اسم الموسم (مثال: 2025-2026)"
            className="flex-1 min-w-[200px] rounded-lg bg-black/30 border border-white/10 px-4 py-2.5 outline-none focus:border-gold/50"
          />
          <button onClick={archiveSeason} className="px-5 py-2.5 rounded-lg bg-gold/90 text-black font-semibold hover:bg-gold2 transition">
            أرشفة وبدء موسم جديد
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display text-2xl text-gold2 mb-2">🏆 شهادة تكريم البطل</h2>
        <p className="text-white/50 text-sm mb-4">
          تُنشئ ملف PDF جاهزًا للتحميل والطباعة باسم الفريق البطل (حدده من تبويب الإعدادات أولًا).
        </p>
        <button onClick={downloadCertificate} className="px-5 py-2.5 rounded-lg bg-gold/90 text-black font-semibold hover:bg-gold2 transition">
          تحميل شهادة PDF
        </button>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display text-2xl text-gold2 mb-3">📍 جدول المواعيد والملاعب</h2>
        {scheduled.length === 0 ? (
          <p className="text-white/40 text-sm">لا توجد مباريات محدَّد لها تاريخ بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-white/40 text-xs">
                  <th className="text-right font-normal pb-2">التاريخ</th>
                  <th className="text-right font-normal pb-2">الوقت</th>
                  <th className="text-right font-normal pb-2">الملعب</th>
                  <th className="text-right font-normal pb-2">المباراة</th>
                </tr>
              </thead>
              <tbody>
                {scheduled.map((m) => {
                  const conflict = findVenueConflict(data.matches, m);
                  return (
                    <tr key={m.id} className="border-t border-white/5">
                      <td className="py-2">{m.date}</td>
                      <td className="py-2">{m.time || "—"}</td>
                      <td className="py-2">
                        {m.venue || "—"}
                        {conflict && <span className="text-red-400 text-xs mr-1">⚠️ تعارض</span>}
                      </td>
                      <td className="py-2">{teamById[m.teamA]?.name} × {teamById[m.teamB]?.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display text-2xl text-gold2 mb-3">
          المواسم المؤرشفة ({(data.archives || []).length})
        </h2>
        {(data.archives || []).length === 0 ? (
          <p className="text-white/40 text-sm">لا توجد مواسم مؤرشفة بعد.</p>
        ) : (
          <div className="space-y-2">
            {[...(data.archives || [])].reverse().map((a) => (
              <details key={a.id} className="rounded-lg border border-white/10 px-4 py-2">
                <summary className="cursor-pointer text-sm font-semibold text-gold2">
                  {a.label} — {a.teams.length} فرق ({new Date(a.archivedAt).toLocaleDateString("ar")})
                </summary>
                <div className="mt-2 text-xs text-white/60">
                  <FullTableCompact teams={[...a.teams].sort((x, y) => y.points - x.points)} />
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FullTableCompact({ teams }) {
  return (
    <table className="w-full">
      <tbody>
        {teams.map((t, i) => (
          <tr key={t.id} className="border-t border-white/5">
            <td className="py-1 pl-2 text-white/40">{i + 1}</td>
            <td className="py-1">{t.name}</td>
            <td className="py-1 text-center">{t.points} نقطة</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
