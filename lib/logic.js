// يجمع أهداف كل لاعب من كل المباريات (مجموعات وإقصائي) بالاعتماد على قوائم
// لاعبي كل فريق المسجّلة مسبقًا، ومن سجل أحداث كل مباراة (events). يدعم أيضًا
// الصيغة القديمة الأبسط (scorersA/scorersB) حتى لا تضيع أهداف سُجّلت قبل هذا التحديث.
export function computeTopScorers(teams, matches) {
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const tally = {}; // key: playerId|teamId -> { name, teamId, teamName, goals, playerId }

  function playerName(teamId, playerId, fallbackName) {
    if (playerId) {
      const player = teamById[teamId]?.players?.find((p) => p.id === playerId);
      return player?.name?.trim() || null;
    }
    return fallbackName?.trim() || null;
  }

  function addGoal(teamId, playerId, fallbackName, count = 1) {
    const name = playerName(teamId, playerId, fallbackName);
    if (!name) return;
    const key = `${playerId || name}|${teamId}`;
    if (!tally[key]) {
      tally[key] = { name, teamId, teamName: teamById[teamId]?.name || "—", goals: 0, playerId: playerId || null };
    }
    tally[key].goals += count;
  }

  matches.forEach((m) => {
    if (m.events && m.events.length > 0) {
      m.events
        .filter((e) => e.type === "goal")
        .forEach((e) => {
          const teamId = e.side === "A" ? m.teamA : m.teamB;
          addGoal(teamId, e.playerId, e.name, 1);
        });
    } else {
      // توافق مع الصيغة القديمة
      (m.scorersA || []).forEach((s) => addGoal(m.teamA, s.playerId, s.name, Number(s.goals) || 0));
      (m.scorersB || []).forEach((s) => addGoal(m.teamB, s.playerId, s.name, Number(s.goals) || 0));
    }
  });

  return Object.values(tally)
    .filter((r) => r.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, "ar"));
}

// يرتب أحداث مباراة (أهداف وإنذارات) حسب الدقيقة، ويرفق اسم اللاعب واسم الفريق
export function matchEventsTimeline(match, teamA, teamB) {
  const events = match.events || [];
  const resolveName = (side, playerId, fallbackName) => {
    const team = side === "A" ? teamA : teamB;
    const player = team?.players?.find((p) => p.id === playerId);
    return player?.name || fallbackName || "لاعب";
  };
  return [...events]
    .sort((a, b) => (Number(a.minute) || 0) - (Number(b.minute) || 0))
    .map((e) => ({
      ...e,
      playerName: resolveName(e.side, e.playerId, e.name),
      teamName: e.side === "A" ? teamA?.name : teamB?.name,
    }));
}


export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// يتحقق هل هناك مباراة أخرى بنفس الملعب والتاريخ والوقت (تعارض مواعيد)
export function findVenueConflict(matches, match) {
  if (!match.venue?.trim() || !match.date || !match.time) return null;
  return matches.find(
    (m) =>
      m.id !== match.id &&
      m.venue?.trim() === match.venue.trim() &&
      m.date === match.date &&
      m.time === match.time
  ) || null;
}

// يحدد مرحلة الدوري الحالية بناءً على البيانات، لاستخدامها في تلوين الواجهة تدريجيًا
export function detectLeagueStage(data) {
  const knockoutMatches = (data.matches || []).filter((m) => m.stage === "knockout");
  if (data.settings?.championTeamId) return "champion";
  if (knockoutMatches.length === 0) return "groups";
  const rounds = [...new Set(knockoutMatches.map((m) => m.round))];
  const lastRound = rounds[rounds.length - 1] || "";
  const isFinalRound = /نهائي/.test(lastRound) && !/نصف|ربع/.test(lastRound);
  return isFinalRound ? "final" : "knockout";
}


// يحسب ترتيب المجموعة بناءً على المباريات المسجلة
export function computeStandings(teams, matches, groupId) {
  const groupTeams = teams.filter((t) => t.group === groupId);
  const table = groupTeams.map((t) => ({
    ...t,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
  }));

  const byId = Object.fromEntries(table.map((t) => [t.id, t]));

  matches
    .filter((m) => m.stage === "group" && m.group === groupId && m.played)
    .forEach((m) => {
      const a = byId[m.teamA];
      const b = byId[m.teamB];
      if (!a || !b) return;
      a.played++;
      b.played++;
      a.gf += m.scoreA;
      a.ga += m.scoreB;
      b.gf += m.scoreB;
      b.ga += m.scoreA;
      if (m.scoreA > m.scoreB) {
        a.won++;
        a.points += 3;
        b.lost++;
      } else if (m.scoreA < m.scoreB) {
        b.won++;
        b.points += 3;
        a.lost++;
      } else {
        a.drawn++;
        b.drawn++;
        a.points += 1;
        b.points += 1;
      }
    });

  return Object.values(table).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    const gdX = x.gf - x.ga;
    const gdY = y.gf - y.ga;
    if (gdY !== gdX) return gdY - gdX;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return x.name.localeCompare(y.name, "ar");
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// قرعة المجموعات: توزيع الفرق عشوائيًا وبالتساوي على المجموعات الموجودة
export function drawGroups(teams, groups) {
  const groupIds = groups.map((g) => g.id);
  const shuffled = shuffle(teams);
  const assignment = {};
  shuffled.forEach((team, idx) => {
    assignment[team.id] = groupIds[idx % groupIds.length];
  });
  return assignment;
}

// توليد مباريات دوري كامل (ذهاب وإياب اختياري) لكل مجموعة
export function generateGroupMatches(teams, groupId, doubleRound = true) {
  const groupTeams = teams.filter((t) => t.group === groupId);
  const matches = [];
  for (let i = 0; i < groupTeams.length; i++) {
    for (let j = i + 1; j < groupTeams.length; j++) {
      matches.push({
        id: uid("m"),
        stage: "group",
        group: groupId,
        round: 1,
        teamA: groupTeams[i].id,
        teamB: groupTeams[j].id,
        scoreA: null,
        scoreB: null,
        played: false,
        date: "",
        time: "",
        events: [],
        notes: "",
        venue: "",
        motm: null,
        lineups: { A: { starting: [], subs: [] }, B: { starting: [], subs: [] } },
        clock: { running: false, accumulated: 0, startedAt: null },
      });
      if (doubleRound) {
        matches.push({
          id: uid("m"),
          stage: "group",
          group: groupId,
          round: 2,
          teamA: groupTeams[j].id,
          teamB: groupTeams[i].id,
          scoreA: null,
          scoreB: null,
          played: false,
          date: "",
          time: "",
          events: [],
          notes: "",
          venue: "",
          motm: null,
          lineups: { A: { starting: [], subs: [] }, B: { starting: [], subs: [] } },
          clock: { running: false, accumulated: 0, startedAt: null },
        });
      }
    }
  }
  return matches;
}

// قرعة الأدوار الإقصائية: تأخذ قائمة فرق مؤهلة وتنشئ دورًا جديدًا بشكل عشوائي
export function drawKnockoutRound(qualifiedTeamIds, roundName) {
  const shuffled = shuffle(qualifiedTeamIds);
  const matches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (!shuffled[i + 1]) break;
    matches.push({
      id: uid("m"),
      stage: "knockout",
      group: null,
      round: roundName,
      teamA: shuffled[i],
      teamB: shuffled[i + 1],
      scoreA: null,
      scoreB: null,
      played: false,
      date: "",
      time: "",
      winner: null,
      events: [],
      notes: "",
      venue: "",
      motm: null,
      lineups: { A: { starting: [], subs: [] }, B: { starting: [], subs: [] } },
      clock: { running: false, accumulated: 0, startedAt: null },
    });
  }
  return matches;
}

// كتاب الأرقام القياسية: يجمع إحصائيات من الموسم الحالي وكل المواسم المؤرشفة معًا
export function computeRecordsBook(data) {
  const seasons = [
    { label: data.settings?.season || "الموسم الحالي", teams: data.teams, matches: data.matches, championTeamId: data.settings?.championTeamId },
    ...(data.archives || []).map((a) => ({ label: a.label, teams: a.teams, matches: a.matches, championTeamId: a.settings?.championTeamId })),
  ];

  // أكثر هداف في تاريخ الدوري (تجميع بالاسم عبر كل المواسم)
  const scorerTally = {};
  seasons.forEach((s) => {
    computeTopScorers(s.teams, s.matches).forEach((sc) => {
      const key = sc.name;
      scorerTally[key] = (scorerTally[key] || 0) + sc.goals;
    });
  });
  const topScorerAllTime = Object.entries(scorerTally).sort((a, b) => b[1] - a[1])[0] || null;

  // أكبر فوز في تاريخ الدوري
  let biggestWin = null;
  seasons.forEach((s) => {
    const teamById = Object.fromEntries(s.teams.map((t) => [t.id, t]));
    s.matches
      .filter((m) => m.played && m.scoreA !== null && m.scoreB !== null)
      .forEach((m) => {
        const diff = Math.abs(m.scoreA - m.scoreB);
        if (!biggestWin || diff > biggestWin.diff) {
          const winner = m.scoreA > m.scoreB ? teamById[m.teamA] : teamById[m.teamB];
          const loser = m.scoreA > m.scoreB ? teamById[m.teamB] : teamById[m.teamA];
          biggestWin = {
            diff,
            season: s.label,
            winnerName: winner?.name || "—",
            loserName: loser?.name || "—",
            score: `${Math.max(m.scoreA, m.scoreB)}-${Math.min(m.scoreA, m.scoreB)}`,
          };
        }
      });
  });

  // أطول سلسلة انتصارات متتالية لأي فريق (داخل موسم واحد، مرتبة زمنيًا حسب الإضافة)
  let longestStreak = null;
  seasons.forEach((s) => {
    const teamById = Object.fromEntries(s.teams.map((t) => [t.id, t]));
    const byTeam = {};
    s.matches
      .filter((m) => m.played && m.scoreA !== null && m.scoreB !== null)
      .forEach((m) => {
        [m.teamA, m.teamB].forEach((tid) => {
          if (!byTeam[tid]) byTeam[tid] = [];
        });
        const aWon = m.scoreA > m.scoreB;
        const bWon = m.scoreB > m.scoreA;
        byTeam[m.teamA].push(aWon);
        byTeam[m.teamB].push(bWon);
      });
    Object.entries(byTeam).forEach(([tid, results]) => {
      let current = 0;
      let max = 0;
      results.forEach((won) => {
        current = won ? current + 1 : 0;
        max = Math.max(max, current);
      });
      if (!longestStreak || max > longestStreak.count) {
        longestStreak = { count: max, teamName: teamById[tid]?.name || "—", season: s.label };
      }
    });
  });

  // الفريق الأكثر تتويجًا + أول بطل
  const championCounts = {};
  let firstChampion = null;
  [...seasons].reverse().forEach((s) => {
    if (!s.championTeamId) return;
    const team = s.teams.find((t) => t.id === s.championTeamId);
    const name = team?.name;
    if (!name) return;
    championCounts[name] = (championCounts[name] || 0) + 1;
    if (!firstChampion) firstChampion = { name, season: s.label };
  });
  const mostTitles = Object.entries(championCounts).sort((a, b) => b[1] - a[1])[0] || null;

  return {
    topScorerAllTime: topScorerAllTime ? { name: topScorerAllTime[0], goals: topScorerAllTime[1] } : null,
    biggestWin,
    longestStreak,
    mostTitles: mostTitles ? { name: mostTitles[0], count: mostTitles[1] } : null,
    firstChampion,
    seasonsCount: seasons.length,
  };
}

/* ================= مولّد التعليق الحماسي التلقائي ================= */
// تعليق نصي بأسلوب حماسي عام (غير مقلِّد لأي شخص حقيقي بعينه) يُنشأ تلقائيًا
// من أحداث المباراة، ويمكن نطقه بصوت اصطناعي عادي في المتصفح.

const GOAL_TEMPLATES = [
  "⚽ هــــدف رائع!! {player} يهزّ الشباك في الدقيقة {minute}، و{team} تنفجر فرحًا!",
  "⚽ يا لها من لمسة ساحرة! {player} يسجل بثقة عالية في الدقيقة {minute} لصالح {team}!",
  "⚽ لا يُصدَّق!! {player} يمزّق الشباك في الدقيقة {minute}! جمهور {team} في نشوة كاملة!",
  "⚽ توقيع مميز من {player}! هدف في الدقيقة {minute} يمنح {team} الأمل من جديد!",
  "⚽ هدف عالمي المستوى من {player} في الدقيقة {minute}! {team} تقترب من الحسم!",
  "⚽ الملعب كله يهتف الآن! {player} يسجل لِـ {team} في الدقيقة {minute}!",
];

const YELLOW_TEMPLATES = [
  "🟨 إنذار للاعب {player} من {team} في الدقيقة {minute} — عليه أن يكون أكثر حذرًا الآن.",
  "🟨 الحكم يُشهر البطاقة الصفراء في وجه {player} ({team}) في الدقيقة {minute}.",
  "🟨 تدخل قوي يستحق الإنذار! {player} يدخل السجل الرسمي في الدقيقة {minute}.",
];

const RED_TEMPLATES = [
  "🟥 قرار حاسم من الحكم!! {player} من {team} يُطرد في الدقيقة {minute}! فريقه بعشرة لاعبين الآن!",
  "🟥 مفاجأة كبرى في الملعب! طرد مباشر لـ {player} من {team} في الدقيقة {minute}!",
  "🟥 لحظة قد تُغيّر مجرى المباراة بالكامل! {player} يغادر الملعب في الدقيقة {minute}!",
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < String(str).length; i++) {
    hash = (hash << 5) - hash + String(str).charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function pickTemplate(list, seed) {
  const idx = Math.abs(hashCode(seed)) % list.length;
  return list[idx];
}

// event يجب أن يكون من مخرجات matchEventsTimeline (يحمل playerName و teamName جاهزين)
export function generateCommentaryLine(event) {
  const templates = event.type === "goal" ? GOAL_TEMPLATES : event.type === "yellow" ? YELLOW_TEMPLATES : RED_TEMPLATES;
  const template = pickTemplate(templates, event.id || `${event.side}-${event.minute}-${event.type}`);
  return template
    .replaceAll("{player}", event.playerName || "لاعب")
    .replaceAll("{minute}", event.minute || "؟")
    .replaceAll("{team}", event.teamName || "الفريق");
}
