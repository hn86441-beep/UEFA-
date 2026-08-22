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
        events: [],
        notes: "",
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
          events: [],
          notes: "",
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
      winner: null,
      events: [],
      notes: "",
    });
  }
  return matches;
}
