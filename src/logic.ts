import { Team, Match } from './types';

export const INITIAL_TEAMS: Team[] = [];
export const INITIAL_MATCHES: Match[] = [];

export function calculateRankings(teams: Team[], matches: Match[]): Team[] {
  // Deep copy teams
  const newTeams = teams.map(t => ({
    ...t,
    mj: 0, mg: 0, mp: 0, sg: 0, sp: 0, pg: 0, pp: 0, pts: 0
  }));

  matches.forEach(m => {
    if (!m.done || m.type !== 'POULE') return;
    
    const t1 = newTeams.find(t => t.name === m.t1 && t.sexe === m.sexe);
    const t2 = newTeams.find(t => t.name === m.t2 && t.sexe === m.sexe);
    
    if (!t1 || !t2) return;

    const scores = m.score.split('-').map(Number);
    if (scores.length !== 2) return;

    const [s1, s2] = scores;
    
    t1.mj++;
    t2.mj++;
    t1.sg += s1;
    t1.sp += s2;
    t2.sg += s2;
    t2.sp += s1;
    
    t1.pg += m.pg_t;
    t1.pp += m.pp_t;
    t2.pg += m.pp_t;
    t2.pp += m.pg_t;

    if (s1 > s2) {
      t1.mg++;
      t2.mp++;
      // Rules for points in volleyball (assumption based on original code)
      t1.pts += (s1 - s2 >= 2 ? 3 : 2);
      t2.pts += (s1 - s2 === 1 ? 1 : 0);
    } else {
      t2.mg++;
      t1.mp++;
      t2.pts += (s2 - s1 >= 2 ? 3 : 2);
      t1.pts += (s2 - s1 === 1 ? 1 : 0);
    }
  });

  return newTeams;
}

export function sortTeams(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    
    const ratioSetA = a.sp === 0 ? (a.sg > 0 ? Infinity : 0) : a.sg / a.sp;
    const ratioSetB = b.sp === 0 ? (b.sg > 0 ? Infinity : 0) : b.sg / b.sp;
    if (ratioSetB !== ratioSetA) return ratioSetB - ratioSetA;
    
    const ratioPointA = a.pp === 0 ? (a.pg > 0 ? Infinity : 0) : a.pg / a.pp;
    const ratioPointB = b.pp === 0 ? (b.pg > 0 ? Infinity : 0) : b.pg / b.pp;
    if (ratioPointB !== ratioPointA) return ratioPointB - ratioPointA;
    
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

export function getMatchWinner(match: Match): string | null {
  if (!match.done) return null;
  const scores = match.score.split('-').map(Number);
  if (scores.length !== 2) return null;
  if (scores[0] > scores[1]) return match.t1;
  if (scores[1] > scores[0]) return match.t2;
  return null;
}

export function getMatchLoser(match: Match): string | null {
  if (!match.done) return null;
  const scores = match.score.split('-').map(Number);
  if (scores.length !== 2) return null;
  if (scores[0] > scores[1]) return match.t2;
  if (scores[1] > scores[0]) return match.t1;
  return null;
}

export function resolveMatchTeams(match: Match, allMatches: Match[], allTeams: Team[]): { t1: string; t2: string } {
  if (!match) return { t1: '', t2: '' };
  
  if (match.sexe === 'F') {
    return { t1: match.t1, t2: match.t2 };
  }

  const updatedTeams = calculateRankings(allTeams, allMatches);

  let t1 = match.t1;
  let t2 = match.t2;

  const pouleAMatches = allMatches.filter(m => m.sexe === 'H' && m.poule === 'A' && m.type === 'POULE');
  const pouleACompleted = pouleAMatches.length > 0 && pouleAMatches.every(m => m.done);
  
  const pouleBMatches = allMatches.filter(m => m.sexe === 'H' && m.poule === 'B' && m.type === 'POULE');
  const pouleBCompleted = pouleBMatches.length > 0 && pouleBMatches.every(m => m.done);

  const getSortedPoule = (pName: string) => {
    const pTeams = updatedTeams.filter(t => t.sexe === 'H' && t.poule === pName);
    return sortTeams(pTeams);
  };

  // 1. Resolve 1er Poule A
  if (t1 === '1er Poule A' || t2 === '1er Poule A') {
    if (pouleACompleted) {
      const sortedA = getSortedPoule('A');
      if (sortedA.length > 0) {
        if (t1 === '1er Poule A') t1 = sortedA[0].name;
        if (t2 === '1er Poule A') t2 = sortedA[0].name;
      }
    }
  }

  // 2. Resolve 1er Poule B
  if (t1 === '1er Poule B' || t2 === '1er Poule B') {
    if (pouleBCompleted) {
      const sortedB = getSortedPoule('B');
      if (sortedB.length > 0) {
        if (t1 === '1er Poule B') t1 = sortedB[0].name;
        if (t2 === '1er Poule B') t2 = sortedB[0].name;
      }
    }
  }

  // 3. Resolve Meilleur 2e / 1er Meilleur 2e
  if (t1 === '1er Meilleur 2e' || t2 === '1er Meilleur 2e' || t1 === 'Meilleur 2e' || t2 === 'Meilleur 2e') {
    if (pouleACompleted && pouleBCompleted) {
      const sortedA = getSortedPoule('A');
      const sortedB = getSortedPoule('B');
      if (sortedA.length >= 2 && sortedB.length >= 2) {
        const secondA = sortedA[1];
        const secondB = sortedB[1];
        const sortedSeconds = sortTeams([secondA, secondB]);
        const bestSecondName = sortedSeconds[0].name;
        if (t1 === '1er Meilleur 2e' || t1 === 'Meilleur 2e') t1 = bestSecondName;
        if (t2 === '1er Meilleur 2e' || t2 === 'Meilleur 2e') t2 = bestSecondName;
      }
    }
  }

  // 4. Resolve VD1 and VD2 (Winners of Semis)
  if (t1 === 'VD1' || t2 === 'VD1') {
    const semi1 = allMatches.find(m => m.id === 'M_J5_2_SEMI1_H');
    if (semi1 && semi1.done) {
      const resolvedSemi1 = resolveMatchTeams(semi1, allMatches, allTeams);
      const scores = semi1.score.split('-').map(Number);
      if (scores.length === 2) {
        const winner = scores[0] > scores[1] ? resolvedSemi1.t1 : resolvedSemi1.t2;
        if (t1 === 'VD1') t1 = winner;
        if (t2 === 'VD1') t2 = winner;
      }
    }
  }

  if (t1 === 'VD2' || t2 === 'VD2') {
    const semi2 = allMatches.find(m => m.id === 'M_J5_3_SEMI2_H');
    if (semi2 && semi2.done) {
      const resolvedSemi2 = resolveMatchTeams(semi2, allMatches, allTeams);
      const scores = semi2.score.split('-').map(Number);
      if (scores.length === 2) {
        const winner = scores[0] > scores[1] ? resolvedSemi2.t1 : resolvedSemi2.t2;
        if (t1 === 'VD2') t1 = winner;
        if (t2 === 'VD2') t2 = winner;
      }
    }
  }

  return { t1, t2 };
}

