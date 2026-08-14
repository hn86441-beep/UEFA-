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
    });
  }
  return matches;
}
