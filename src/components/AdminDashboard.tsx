import React, { useState, useMemo } from 'react';
import { Users, Plus, Play, Trash2, Edit2, X, Check, RotateCcw, ChevronDown, ChevronUp, Calendar, Award, Trophy, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Team, Match } from '../types';
import { sortTeams, resolveMatchTeams } from '../logic';
import { compareMatchesChronologically } from './VisitorDashboard';

const isImageLogo = (logo?: string): boolean => {
  if (!logo) return false;
  const l = logo.trim();
  return l.startsWith('http') || l.startsWith('data:') || l.includes('.') || l.includes('/') || l.length > 10;
};

interface AdminDashboardProps {
  teams: Team[];
  setTeams: (newTeams: Team[] | ((prev: Team[]) => Team[])) => Promise<void>;
  matches: Match[];
  setMatches: (newMatches: Match[] | ((prev: Match[]) => Match[])) => Promise<void>;
  onReset: () => void;
  deleteTeam: (id: string, name: string, sexe: string) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  onlineUsersCount?: number;
  onInitializeJUB?: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ teams, setTeams, matches, setMatches, onReset, deleteTeam, deleteMatch, onlineUsersCount, onInitializeJUB }) => {
  const [newClubName, setNewClubName] = useState('');
  const [newSexe, setNewSexe] = useState<'H' | 'F'>('H');
  const [newPoule, setNewPoule] = useState('A');
  const [newTeamLogo, setNewTeamLogo] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const POULES = ['A', 'B', 'C', 'D'];
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editingMatchIdx, setEditingMatchIdx] = useState<number | null>(null);
  const [matchForm, setMatchForm] = useState<Partial<Match>>({});

  const [expandSchedule, setExpandSchedule] = useState(true);
  const [expandResult, setExpandResult] = useState(true);
  const [expandMVP, setExpandMVP] = useState(true);

  // States for custom time picker matching the date picker layout request
  const [openCustomTimePicker, setOpenCustomTimePicker] = useState(false);
  const [tempHour, setTempHour] = useState('19');
  const [tempMinute, setTempMinute] = useState('00');

  const resolvedFormTeams = useMemo(() => {
    if (!matchForm || !matchForm.id) return { t1: '', t2: '' };
    return resolveMatchTeams(matchForm as Match, matches, teams);
  }, [matchForm, matches, teams]);

  const closeEdit = () => {
    setEditingMatchIdx(null);
    setExpandSchedule(true);
    setExpandResult(true);
    setExpandMVP(true);
  };

  const addTeam = async () => {
    if (!newClubName.trim()) return;
    const name = newClubName.trim();
    setIsSaving(true);
    
    try {
      if (editingTeamId) {
        const teamToEdit = teams.find(t => t.id === editingTeamId);
        if (!teamToEdit) {
            setIsSaving(false);
            return;
        }

        const updatedTeams = teams.map(t => 
          t.id === editingTeamId ? { ...t, name, sexe: newSexe, poule: newPoule, logo: newTeamLogo } : t
        );
        
        // Sync team name change in matches
        if (teamToEdit.name !== name) {
          const updatedMatches = matches.map(m => {
            if (m.sexe === teamToEdit.sexe) {
              let changed = false;
              let newT1 = m.t1;
              let newT2 = m.t2;
              if (m.t1 === teamToEdit.name) { newT1 = name; changed = true; }
              if (m.t2 === teamToEdit.name) { newT2 = name; changed = true; }
              if (changed) return { ...m, t1: newT1, t2: newT2 };
            }
            return m;
          });
          await setMatches(updatedMatches);
        }
        
        await setTeams(updatedTeams);
      } else {
        const id = `${name}_${newSexe}_${newPoule}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        const newTeam: Team = {
          id,
          name,
          sexe: newSexe,
          poule: newPoule,
          logo: newTeamLogo,
          mj: 0, mg: 0, mp: 0, sg: 0, sp: 0, pg: 0, pp: 0, pts: 0,
          createdAt: Date.now()
        };
        await setTeams([...teams, newTeam]);
      }
      // Reset form
      setNewClubName('');
      setNewSexe('H');
      setNewPoule('A');
      setNewTeamLogo('');
      setEditingTeamId(null);
    } catch (err) {
      console.error("Failed to add/edit team:", err);
      alert("Erreur lors de l'enregistrement de l'équipe.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditTeam = (team: Team) => {
    setNewClubName(team.name);
    setNewSexe(team.sexe);
    setNewPoule(team.poule);
    setNewTeamLogo(team.logo || '');
    setEditingTeamId(team.id);
  };

  const cancelEditTeam = () => {
    setNewClubName('');
    setNewSexe('H');
    setNewPoule('A');
    setNewTeamLogo('');
    setEditingTeamId(null);
  };

  const removeTeam = async (id: string, name: string) => {
    const team = teams.find(t => t.id === id);
    if (team) {
      await deleteTeam(id, team.name, team.sexe);
      setConfirmDeleteId(null);
    } else {
      alert("Équipe introuvable.");
    }
  };

  const generateMatchesForPoule = (poule: string) => {
    const newMatches = [...matches];
    // Sort teams by createdAt to ensure consistent and logical generation order
    const pouleTeams = teams
      .filter(t => t.poule === poule)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    
    pouleTeams.forEach((t1, i) => {
      pouleTeams.forEach((t2, j) => {
        if (i < j && t1.sexe === t2.sexe) {
          if (t1.sexe === 'F') {
            // Only women (Dames) play matches aller/retour!
            const idAller = `M_${t1.name}_${t2.name}_${t1.sexe}_${poule}_ALLER`.replace(/[^a-zA-Z0-9_-]/g, '_');
            const idRetour = `M_${t2.name}_${t1.name}_${t1.sexe}_${poule}_RETOUR`.replace(/[^a-zA-Z0-9_-]/g, '_');
            
            if (!newMatches.find(m => m.id === idAller)) {
              newMatches.push({
                id: idAller, t1: t1.name, t2: t2.name, sexe: t1.sexe, poule, type: 'POULE',
                label: 'ALLER',
                date: '', time: '', score: '', sets_detail: '', mvp: '', done: false, pg_t: 0, pp_t: 0
              });
            }
            if (!newMatches.find(m => m.id === idRetour)) {
              newMatches.push({
                id: idRetour, t1: t2.name, t2: t1.name, sexe: t1.sexe, poule, type: 'POULE',
                label: 'RETOUR',
                date: '', time: '', score: '', sets_detail: '', mvp: '', done: false, pg_t: 0, pp_t: 0
              });
            }
          } else {
            // Men (Hommes) only play single matches (no aller/retour)!
            const idMatch = `M_${t1.name}_${t2.name}_${t1.sexe}_${poule}`.replace(/[^a-zA-Z0-9_-]/g, '_');
            if (!newMatches.find(m => m.id === idMatch)) {
              newMatches.push({
                id: idMatch, t1: t1.name, t2: t2.name, sexe: t1.sexe, poule, type: 'POULE',
                label: 'PHASE POULE',
                date: '', time: '', score: '', sets_detail: '', mvp: '', done: false, pg_t: 0, pp_t: 0
              });
            }
          }
        }
      });
    });
    setMatches(newMatches);
  };

  const scheduledMatches = useMemo(() => matches.filter(m => m.date !== '').sort(compareMatchesChronologically), [matches]);
  const unscheduledMatches = useMemo(() => matches.filter(m => m.date === ''), [matches]);

  const openEdit = (idx: number) => {
    setEditingMatchIdx(idx);
    setMatchForm(matches[idx]);
  };

  const quickScores = ['3-0', '3-1', '3-2', '2-3', '1-3', '0-3'];

  const handleSetChange = (idx: number, val: string, side: 1 | 2) => {
    const currentSets = (matchForm.sets_detail || '').split(',').map(s => s.trim()).filter(Boolean);
    while (currentSets.length <= idx) currentSets.push('0-0');
    
    const parts = currentSets[idx].split('-');
    const p1 = parts[0] || '0';
    const p2 = parts[1] || '0';
    
    if (side === 1) currentSets[idx] = `${val}-${p2}`;
    else currentSets[idx] = `${p1}-${val}`;
    
    setMatchForm({ ...matchForm, sets_detail: currentSets.join(', ') });
  };

  const saveMatch = () => {
    if (editingMatchIdx === null) return;
    
    setMatches(prev => {
      const updated = [...prev];
      const current = { ...updated[editingMatchIdx], ...matchForm } as Match;
      
      // Clean up sets_detail (remove trailing commas/spaces)
      let cleanedSets = (current.sets_detail || '')
        .split(',')
        .map(s => s.trim())
        .filter(s => s && s.includes('-') && s !== '0-0')
        .join(', ');
      
      current.sets_detail = cleanedSets;
      
      // Calculate total points
      let p1 = 0, p2 = 0;
      if (cleanedSets) {
        cleanedSets.split(',').forEach(s => {
          const pts = s.trim().split('-').map(Number);
          if (pts.length === 2) {
            p1 += pts[0] || 0;
            p2 += pts[1] || 0;
          }
        });
      }
      
      current.pg_t = p1;
      current.pp_t = p2;
      
      // A match is "done" if it has a score in X-Y format
      current.done = !!(current.score && current.score.includes('-') && current.score.split('-').length === 2);

      updated[editingMatchIdx] = current;
      
      // Automatically check for next stages after state update
      setTimeout(() => checkAndGenerateFinals(updated), 0);
      
      return updated;
    });
    
    setEditingMatchIdx(null);
  };

  const checkAndGenerateFinals = (currentMatches: Match[]) => {
    const nextMatches = [...currentMatches];
    const sexes: ('H' | 'F')[] = ['H', 'F'];
    
    sexes.forEach(s => {
      // Consider a pool active only if it has at least 2 teams actually participating
      const activePoules = POULES.filter(p => teams.filter(t => t.poule === p && t.sexe === s).length >= 2);
      const allPouleMatchesDone = activePoules.every(p => {
        const pMatches = nextMatches.filter(m => m.sexe === s && m.poule === p && m.type === 'POULE');
        return pMatches.length > 0 && pMatches.every(m => m.done);
      });

      if (activePoules.length > 0 && allPouleMatchesDone) {
        const getRanked = (p: string) => {
          const pTeams = teams.filter(t => t.sexe === s && t.poule === p);
          return sortRankings(pTeams, nextMatches).slice(0, 2);
        };

        const ranks = activePoules.reduce((acc, p) => {
          acc[p] = getRanked(p);
          return acc;
        }, {} as Record<string, Team[]>);

        // --- PHASE GENERATION BASED ON POOL COUNT & JUB SPECIAL RULE ---
        
        // JUB Special Men's rule with 3 poules (A, B have 3 teams, C has 1 team FAST/NATITINGOU)
        if (s === 'H' && activePoules.length === 2 && teams.some(t => t.poule === 'C' && t.sexe === 'H')) {
          const teamC = teams.find(t => t.poule === 'C' && t.sexe === 'H');
          const tCName = teamC ? teamC.name : 'FAST/NATITINGOU';
          addStageMatch(nextMatches, `M_J5_2_SEMI1_H`, '1er Poule A', '1er Meilleur 2e', 'H', 'SEMI', '1/2 FINALE - MATCH 1');
          addStageMatch(nextMatches, `M_J5_3_SEMI2_H`, '1er Poule B', tCName, 'H', 'SEMI', '1/2 FINALE - MATCH 2');
        }
        // 4 POOLS -> QUARTERS (A1-D2, B1-C2, C1-B2, D1-A2)
        else if (activePoules.length === 4) {
          if (ranks.A?.length >= 2 && ranks.B?.length >= 2 && ranks.C?.length >= 2 && ranks.D?.length >= 2) {
            addStageMatch(nextMatches, `Q1_${s}`, ranks.A[0].name, ranks.D[1].name, s, 'QUARTER', '1/4 FINALE - MATCH 1');
            addStageMatch(nextMatches, `Q2_${s}`, ranks.B[0].name, ranks.C[1].name, s, 'QUARTER', '1/4 FINALE - MATCH 2');
            addStageMatch(nextMatches, `Q3_${s}`, ranks.C[0].name, ranks.B[1].name, s, 'QUARTER', '1/4 FINALE - MATCH 3');
            addStageMatch(nextMatches, `Q4_${s}`, ranks.D[0].name, ranks.A[1].name, s, 'QUARTER', '1/4 FINALE - MATCH 4');
          }
        } 
        // 2 POOLS -> SEMIS (A1-B2, B1-A2)
        else if (activePoules.length === 2) {
          const [p1, p2] = activePoules;
          if (ranks[p1]?.length >= 2 && ranks[p2]?.length >= 2) {
            addStageMatch(nextMatches, `S1_${s}`, ranks[p1][0].name, ranks[p2][1].name, s, 'SEMI', '1/2 FINALE - MATCH 1');
            addStageMatch(nextMatches, `S2_${s}`, ranks[p2][0].name, ranks[p1][1].name, s, 'SEMI', '1/2 FINALE - MATCH 2');
          }
        }
        // 1 POOL -> FINAL (1st vs 2nd)
        else if (activePoules.length === 1) {
          const p = activePoules[0];
          if (ranks[p].length >= 2) {
            addStageMatch(nextMatches, `FINAL_${s}`, ranks[p][0].name, ranks[p][1].name, s, 'FINAL', 'GRANDE FINALE');
            addStageMatch(nextMatches, `3RD_${s}`, ranks[p][2]?.name || '3è Qualifié', ranks[p][3]?.name || '4è Qualifié', s, 'THIRD_PLACE', 'PETITE FINALE (3è place)');
          }
        }

        // --- SUCCESSIVE STAGES ---

        // SEMIS from Quarters (Winner Q1 vs Q2, Winner Q3 vs Q4)
        if (activePoules.length === 4) {
          const q1 = nextMatches.find(m => m.id === `Q1_${s}`);
          const q2 = nextMatches.find(m => m.id === `Q2_${s}`);
          const q3 = nextMatches.find(m => m.id === `Q3_${s}`);
          const q4 = nextMatches.find(m => m.id === `Q4_${s}`);

          if (q1?.done && q2?.done) {
            const w1 = getMatchWinner(q1);
            const w2 = getMatchWinner(q2);
            if (w1 && w2) addStageMatch(nextMatches, `S1_${s}`, w1, w2, s, 'SEMI', '1/2 FINALE - MATCH 1');
          }
          if (q3?.done && q4?.done) {
            const w3 = getMatchWinner(q3);
            const w4 = getMatchWinner(q4);
            if (w3 && w4) addStageMatch(nextMatches, `S2_${s}`, w3, w4, s, 'SEMI', '1/2 FINALE - MATCH 2');
          }
        }

        // FINALS from Semis
        const s1 = nextMatches.find(m => m.sexe === s && m.type === 'SEMI' && (m.id.includes('SEMI1') || m.id.includes('S1')));
        const s2 = nextMatches.find(m => m.sexe === s && m.type === 'SEMI' && (m.id.includes('SEMI2') || m.id.includes('S2')));

        if (s1?.done && s2?.done) {
          const resolvedS1 = resolveMatchTeams(s1, nextMatches, teams);
          const resolvedS2 = resolveMatchTeams(s2, nextMatches, teams);

          const scores1 = s1.score.split('-').map(Number);
          const scores2 = s2.score.split('-').map(Number);

          const ws1 = scores1[0] > scores1[1] ? resolvedS1.t1 : resolvedS1.t2;
          const ws2 = scores2[0] > scores2[1] ? resolvedS2.t1 : resolvedS2.t2;
          const ls1 = scores1[0] > scores1[1] ? resolvedS1.t2 : resolvedS1.t1;
          const ls2 = scores2[0] > scores2[1] ? resolvedS2.t2 : resolvedS2.t1;
          
          const finalId = s === 'H' ? 'M_J6_1_FINAL_H' : `FINAL_${s}`;
          if (ws1 && ws2) addStageMatch(nextMatches, finalId, ws1, ws2, s, 'FINAL', 'GRANDE FINALE');
          
          // Fallback check to sync existing finals
          const existingFinal = nextMatches.find(m => m.id === finalId);
          if (existingFinal && !existingFinal.done) {
            existingFinal.t1 = ws1;
            existingFinal.t2 = ws2;
          }
        }
      }
    });

    setMatches(nextMatches);
  };

  // Helper for ranking within generation
  const sortRankings = (pTeams: Team[], currentMatches: Match[]) => {
    // Basic recalculation for generation logic
    const calc = pTeams.map(t => {
      let pts = 0, sg = 0, sp = 0, pg = 0, pp = 0;
      currentMatches.filter(m => m.type === 'POULE' && (m.t1 === t.name || m.t2 === t.name) && m.done && m.sexe === t.sexe).forEach(m => {
        const scores = m.score.split('-').map(Number);
        const isT1 = m.t1 === t.name;
        const [s1, s2] = isT1 ? scores : [scores[1], scores[0]];
        sg += s1; sp += s2;
        pg += isT1 ? m.pg_t : m.pp_t;
        pp += isT1 ? m.pp_t : m.pg_t;
        if (s1 > s2) pts += (s1 - s2 >= 2 ? 3 : 2);
        else pts += (s2 - s1 === 1 ? 1 : 0);
      });
      return { ...t, pts, sg, sp, pg, pp };
    });
    return sortTeams(calc);
  };

  const addStageMatch = (list: Match[], id: string, t1: string, t2: string, sexe: 'H' | 'F', type: Match['type'], label: string) => {
    if (!list.find(m => m.id === id)) {
      list.push({
        id, t1, t2, sexe, poule: 'FINAL', type, label,
        date: '', time: '', score: '', sets_detail: '', mvp: '',
        done: false, pg_t: 0, pp_t: 0
      });
    }
  };

  const getMatchWinner = (match: Match): string | null => {
    const scores = match.score.split('-').map(Number);
    return scores[0] > scores[1] ? match.t1 : match.t2;
  };

  const getMatchLoser = (match: Match): string | null => {
    const scores = match.score.split('-').map(Number);
    return scores[0] > scores[1] ? match.t2 : match.t1;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Team Management */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Users size={20} className="text-[#1a237e]" />
            Équipes & Clubs
          </h3>
          {editingTeamId && (
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
              Mode Modification
            </span>
          )}
        </div>
        
        <div className="flex flex-col gap-4 mb-8 bg-slate-50/55 p-4 sm:p-5 rounded-2xl border border-slate-100">
          <div className="text-[10px] font-black uppercase text-[#1a237e] tracking-wider px-1">
            Informations de l'Équipe
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <input 
              type="text" 
              placeholder="Nouveau nom du club..." 
              value={newClubName}
              onChange={(e) => setNewClubName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTeam()}
              className="flex-[2] px-4 py-3 bg-white border-2 border-slate-100 rounded-xl outline-none focus:border-[#2ecc71] font-semibold text-sm transition-all"
            />
            <div className="flex gap-2">
              <select 
                value={newSexe}
                onChange={(e) => {
                  const s = e.target.value as 'H' | 'F';
                  setNewSexe(s);
                  if (s === 'F') {
                    setNewPoule('DAME');
                  } else {
                    setNewPoule('A');
                  }
                }}
                className="flex-1 px-4 py-3 bg-white border-2 border-slate-100 rounded-xl outline-none font-bold text-sm text-slate-600 cursor-pointer"
              >
                <option value="H">Masc.</option>
                <option value="F">Fém.</option>
              </select>
              <select 
                value={newPoule}
                onChange={(e) => setNewPoule(e.target.value)}
                className="flex-1 px-4 py-3 bg-white border-2 border-slate-100 rounded-xl outline-none font-bold text-sm text-slate-600 cursor-pointer"
              >
                {newSexe === 'F' ? (
                  <option value="DAME">Poule Unique (DAME)</option>
                ) : (
                  POULES.map(p => <option key={p} value={p}>Poule {p}</option>)
                )}
              </select>
            </div>
            <button 
              onClick={addTeam}
              disabled={isSaving}
              className={`${editingTeamId ? 'bg-indigo-600 hover:bg-indigo-750' : 'bg-[#1a237e] hover:bg-indigo-950'} text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest min-w-[160px] cursor-pointer disabled:opacity-50`}
            >
              {isSaving ? 'Traitement...' : (editingTeamId ? <><Check size={16} /> Enregistrer</> : <><Plus size={16} /> Ajouter l'équipe</>)}
            </button>
            {editingTeamId && (
              <button 
                onClick={cancelEditTeam}
                className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center cursor-pointer"
                title="Annuler modification"
              >
                <RotateCcw size={20} />
              </button>
            )}
          </div>

          {/* Logo Selection Section */}
          <div className="border-t border-slate-200 pt-3">
            <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-1 mb-2">
              Logo de l'équipe (Optionnel • Emoji ou image importée)
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
              {/* Selected logo live preview */}
              <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-3xs">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl border border-slate-200 shadow-3xs p-1 overflow-hidden shrink-0">
                  {newTeamLogo ? (
                    isImageLogo(newTeamLogo) ? (
                      <img src={newTeamLogo} alt="Logo Preview" className="w-full h-full object-contain rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="select-none">{newTeamLogo}</span>
                    )
                  ) : (
                    <span className="text-slate-300 font-black text-xs uppercase leading-none select-none">Aucun</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] font-black text-slate-700 uppercase tracking-wide truncate">Logo de l'équipe</div>
                  {newTeamLogo ? (
                    <button
                      type="button"
                      onClick={() => setNewTeamLogo('')}
                      className="text-[9px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider"
                    >
                      Retirer ❌
                    </button>
                  ) : (
                    <div className="text-[9px] text-slate-400 italic">Non spécifié</div>
                  )}
                </div>
              </div>

              {/* Emoji presets selection */}
              <div className="lg:col-span-2">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Raccourcis Emojis Symboles</div>
                <div className="flex flex-wrap gap-1 p-1 px-1.5 bg-white rounded-xl border border-slate-200 max-h-[70px] overflow-y-auto custom-scrollbar">
                  {['🏐', '🏆', '⭐', '⚡', '🦁', '🦅', '🐆', '🐯', '🐺', '🦊', '🐊', '🪐', '☄️', '🟥', '🟦', '🟨', '🟩', '🟪', '🥇'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewTeamLogo(emoji)}
                      className={`text-base p-1.5 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer ${newTeamLogo === emoji ? 'bg-indigo-50 ring-2 ring-indigo-200' : ''}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image Input (File Selection) */}
              <div className="space-y-2">
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Importer fichier logo</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewTeamLogo(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9px] file:font-black file:uppercase file:tracking-wider file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {teams.slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).map((team) => (
            <div 
              key={team.id} 
              className={`group relative flex items-center gap-2.5 bg-white border-2 pl-4 pr-2 py-2.5 rounded-xl text-sm font-bold shadow-xs transition-all cursor-default ${editingTeamId === team.id ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-200' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}`}
            >
              {team.logo && (
                <div className="w-6 h-6 flex items-center justify-center shrink-0 overflow-hidden bg-white border border-slate-150 rounded-full shadow-3xs p-0.5 select-none animate-fade-in">
                  {isImageLogo(team.logo) ? (
                    <img src={team.logo} alt="" className="w-full h-full object-contain rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xs leading-none select-none">{team.logo}</span>
                  )}
                </div>
              )}
              <span className="text-[#1a237e]">{team.name}</span>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400 capitalize">
                {team.sexe}{team.poule}
              </span>
              <div className="flex items-center gap-1 ml-1">
                <button 
                  onClick={() => startEditTeam(team)}
                  className="p-1.5 text-slate-300 hover:text-indigo-500 rounded-lg hover:bg-white transition-all cursor-pointer"
                  title="Modifier"
                >
                  <Edit2 size={14} />
                </button>
                {confirmDeleteId === team.id ? (
                  <div className="flex items-center gap-1 bg-red-50 p-0.5 rounded-lg border border-red-100 shadow-sm animate-in fade-in zoom-in duration-200">
                    <button 
                      onClick={() => removeTeam(team.id, team.name)}
                      className="px-2 py-1 bg-red-600 text-white text-[10px] font-black uppercase hover:bg-red-700 rounded transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={10} />
                      Supprimer
                    </button>
                    <button 
                      onClick={() => setConfirmDeleteId(null)}
                      className="p-1 px-1.5 text-slate-400 hover:text-slate-600 font-bold text-[10px]"
                    >
                      ANNULER
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setConfirmDeleteId(team.id)}
                    className="p-1.5 text-slate-300 group-hover:text-red-500 rounded-lg hover:bg-white transition-all shadow-xs hover:shadow-sm cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {teams.length === 0 && (
            <p className="text-slate-400 text-sm font-medium italic py-2">Aucune équipe enregistrée</p>
          )}
        </div>
      </div>

      {/* Matches Management */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="mb-8">
          <h3 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Play size={20} className="text-[#1a237e]" />
            Génération des Matchs
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {(() => {
              // Get all pools from teams, and add standard POULES as fallback
              const existingPools = Array.from(new Set<string>(teams.map(t => t.poule as string))).filter(Boolean);
              const allPools: string[] = existingPools.length > 0 ? existingPools : POULES;
              return allPools.sort().map((p: string) => {
                const matchesExist = matches.some(m => m.poule === p && m.type === 'POULE');
                const label = p === 'DAME' ? 'Poule Dames' : `Poule ${p}`;
                return (
                  <button 
                    key={p}
                    onClick={() => generateMatchesForPoule(p)}
                    className={`px-4 py-3 border rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-xs cursor-pointer ${
                      matchesExist 
                        ? 'bg-indigo-50 border-indigo-200 text-[#1a237e] hover:bg-indigo-100 outline-none' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 outline-none'
                    }`}
                  >
                    Générer {label}
                  </button>
                );
              });
            })()}
          </div>
          <p className="mt-3 text-[10px] text-slate-400 font-medium italic">
            Les matchs de la phase finale se génèrent automatiquement une fois que tous les matchs de poule sont terminés.
          </p>
        </div>

        <div className="space-y-10">
          {scheduledMatches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="w-1.5 h-4 bg-[#2ecc71] rounded-full"></div>
                <h4 className="font-extrabold text-[#1a237e] uppercase text-[10px] tracking-wider">Matchs Planifiés</h4>
              </div>
              <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {scheduledMatches.map((m) => {
                  const idx = matches.findIndex(match => match.id === m.id);
                  const isPlayoff = m.type !== 'POULE';
                  const containerClass = isPlayoff
                    ? "group flex flex-col md:flex-row md:items-center justify-between p-4 border-2 border-dashed border-amber-300 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-400 transition-all rounded-2xl gap-4 shadow-3s relative overflow-hidden"
                    : "group flex flex-col md:flex-row md:items-center justify-between p-4 border border-slate-50 hover:border-indigo-100 hover:bg-slate-50 transition-all rounded-xl gap-4";
                  return (
                    <div 
                      key={m.id} 
                      className={containerClass}
                    >
                      {isPlayoff && (
                        <div className="absolute right-0 top-0 bg-amber-500 text-white font-black text-[7px] tracking-widest px-2 py-0.5 rounded-bl-lg uppercase shadow-xs">
                          ⚡ Éliminatoire
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${m.done ? 'bg-[#2ecc71] text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                          {m.done ? <Check size={18} /> : (idx + 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 flex items-center gap-2 truncate">
                            {resolveMatchTeams(m, matches, teams).t1} <span translate="no" className="notranslate text-[10px] text-slate-300 uppercase tracking-tighter shrink-0">vs</span> {resolveMatchTeams(m, matches, teams).t2}
                          </div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex flex-wrap gap-x-2 gap-y-1 mt-1">
                            <span className={m.type !== 'POULE' ? 'text-[#f1c40f]' : ''}>{m.type}</span>
                            <span>•</span>
                            <span>{m.sexe === 'H' ? '♂' : '♀'} {m.poule === 'FINAL' || m.poule === 'DAME' ? 'PHASE FINALE' : `POULE ${m.poule}`}</span>
                            {m.date && (
                              <>
                                <span>•</span>
                                <span className="text-slate-600 font-bold">{m.date} {m.time}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => openEdit(idx)}
                        className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm group-hover:bg-[#1a237e] transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
                      >
                        <Edit2 size={14} />
                        Saisir / Modifier
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {unscheduledMatches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="w-1.5 h-4 bg-slate-300 rounded-full"></div>
                <h4 className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider">À Planifier</h4>
              </div>
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {unscheduledMatches.map((m) => {
                  const idx = matches.findIndex(match => match.id === m.id);
                  const isPlayoff = m.type !== 'POULE';
                  const containerClass = isPlayoff
                    ? "group flex flex-col md:flex-row md:items-center justify-between p-4 border-2 border-dashed border-amber-300 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-400 transition-all rounded-2xl gap-4 shadow-3s relative overflow-hidden"
                    : "group flex flex-col md:flex-row md:items-center justify-between p-4 border border-slate-50 hover:border-indigo-100 hover:bg-slate-50 transition-all rounded-xl gap-4";
                  return (
                    <div 
                      key={m.id} 
                      className={containerClass}
                    >
                      {isPlayoff && (
                        <div className="absolute right-0 top-0 bg-amber-500 text-white font-black text-[7px] tracking-widest px-2 py-0.5 rounded-bl-lg uppercase shadow-xs">
                          ⚡ Éliminatoire
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${m.done ? 'bg-[#2ecc71] text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                          {m.done ? <Check size={18} /> : (idx + 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 flex items-center gap-2 truncate">
                            {resolveMatchTeams(m, matches, teams).t1} <span translate="no" className="notranslate text-[10px] text-slate-300 uppercase tracking-tighter shrink-0">vs</span> {resolveMatchTeams(m, matches, teams).t2}
                          </div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex flex-wrap gap-x-2 gap-y-1 mt-1">
                            <span className={m.type !== 'POULE' ? 'text-[#f1c40f]' : ''}>{m.type}</span>
                            <span>•</span>
                            <span>{m.sexe === 'H' ? '♂' : '♀'} {m.poule === 'FINAL' || m.poule === 'DAME' ? 'PHASE FINALE' : `POULE ${m.poule}`}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => openEdit(idx)}
                        className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm group-hover:bg-[#1a237e] transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
                      >
                        <Edit2 size={14} />
                        Planifier
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {matches.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm font-medium italic">
              Cliquez sur "Générer Poule" pour commencer
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100">
          <div className="flex flex-col items-center justify-center bg-red-50/40 p-4 rounded-2xl border border-red-100">
            {!confirmReset ? (
              <button 
                onClick={() => setConfirmReset(true)}
                className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-wider transition-all rounded-xl shadow-xs active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 size={12} />
                Effacer toute la compétition
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 animate-in slide-in-from-bottom-2 duration-300">
                <span className="text-red-600 font-black text-[9px] uppercase tracking-wider">Confirmer l'effacement irréversible ?</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setConfirmReset(false);
                      onReset();
                    }}
                    className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all"
                  >
                    Oui, tout supprimer
                  </button>
                  <button 
                    onClick={() => setConfirmReset(false)}
                    className="py-1.5 px-3 bg-slate-200 text-slate-600 hover:bg-slate-300 font-black text-[9px] uppercase tracking-widest rounded-lg transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
            <p className="text-[8px] text-red-400 font-bold uppercase tracking-wider text-center mt-2">
              Action définitive : supprime toutes les équipes et tous les matchs.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingMatchIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start p-6 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-[#1a237e] uppercase tracking-wide leading-tight">
                  {resolvedFormTeams.t1} <span translate="no" className="notranslate text-emerald-500 font-extrabold px-1">VS</span> {resolvedFormTeams.t2}
                </h3>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">
                  Saisie & Planification {matchForm.label ? `• Match ${matchForm.label}` : ''}
                </p>
              </div>
              <button 
                onClick={closeEdit}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-slate-50/30 scroll-smooth">
              
              {/* Section 1: Schedule (Date & Time) */}
              <div className="bg-white border border-slate-150-60 rounded-2xl shadow-3xs overflow-hidden transition-all duration-150">
                <button 
                  onClick={() => setExpandSchedule(!expandSchedule)}
                  className="w-full flex items-center justify-between p-4 font-black text-xs uppercase text-slate-700 tracking-wider text-left border-b border-slate-100 bg-white hover:bg-slate-50/50"
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-[#1a237e]" />
                    <span>📅 1. Date & Horaires</span>
                    {matchForm.date ? (
                      <span className="ml-1 text-[8px] bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full uppercase font-black">Saisi</span>
                    ) : (
                      <span className="ml-1 text-[8px] bg-slate-100 text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full uppercase font-black">À définir</span>
                    )}
                  </div>
                  {expandSchedule ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
                </button>
                <AnimatePresence initial={false}>
                  {expandSchedule && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 grid grid-cols-2 gap-3 bg-white">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-black text-[#1a237e] uppercase tracking-wider">Date</label>
                            {matchForm.date && (
                              <button 
                                type="button" 
                                onClick={() => setMatchForm({ ...matchForm, date: '' })}
                                className="text-red-500 hover:text-red-700 cursor-pointer active:scale-95 transition-all p-0.5 rounded-md hover:bg-red-50"
                                title="Vider la date"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                          <input 
                            type="date" 
                            value={matchForm.date || ''}
                            onChange={(e) => setMatchForm({ ...matchForm, date: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-[#2ecc71] font-bold text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-black text-[#1a237e] uppercase tracking-wider">Heure</label>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const currentVal = matchForm.time || '19:00';
                              const parts = currentVal.includes(':') ? currentVal.split(':') : ['19', '00'];
                              setTempHour(parts[0] || '19');
                              setTempMinute(parts[1] || '00');
                              setOpenCustomTimePicker(true);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 hover:border-[#1a237e]/40 rounded-xl outline-none transition-all cursor-pointer text-left flex items-center justify-between font-bold text-xs"
                          >
                            <span className={matchForm.time ? 'text-slate-800' : 'text-slate-400 font-normal'}>
                              {matchForm.time || 'À définir'}
                            </span>
                            <Clock size={12} className="text-[#1a237e]/60" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Section 2: Match Results / Scores */}
              <div className="bg-white border border-slate-150-60 rounded-2xl shadow-3xs overflow-hidden transition-all duration-150">
                <button 
                  onClick={() => setExpandResult(!expandResult)}
                  className="w-full flex items-center justify-between p-4 font-black text-xs uppercase text-slate-700 tracking-wider text-left border-b border-slate-100 bg-white hover:bg-slate-50/50"
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-[#1a237e]" />
                    <span>🏆 2. Score & Sets</span>
                    {matchForm.score ? (
                      <span className="ml-1 text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full uppercase font-black">{matchForm.score}</span>
                    ) : (
                      <span className="ml-1 text-[8px] bg-slate-100 text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full uppercase font-black">Non joué</span>
                    )}
                  </div>
                  {expandResult ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
                </button>
                <AnimatePresence initial={false}>
                  {expandResult && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-white space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-black text-[#1a237e] uppercase tracking-wider">Choix rapide score</label>
                            {(matchForm.score || matchForm.sets_detail) && (
                              <button 
                                type="button" 
                                onClick={() => setMatchForm({ ...matchForm, score: '', sets_detail: '' })}
                                className="text-red-500 hover:text-red-700 cursor-pointer active:scale-95 transition-all p-0.5 rounded-md hover:bg-red-50 flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider"
                                title="Vider le score et les sets"
                              >
                                <Trash2 size={11} />
                                <span>Score & Sets</span>
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {quickScores.map(qs => (
                              <button
                                key={qs}
                                type="button"
                                onClick={() => setMatchForm({ ...matchForm, score: qs })}
                                className={`px-2.5 py-1.5 rounded-lg font-bold text-[10px] transition-all uppercase ${matchForm.score === qs ? 'bg-[#2ecc71] text-white shadow-xs' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                              >
                                {qs}
                              </button>
                            ))}
                          </div>
                          <input 
                            type="text" 
                            placeholder="Score final (ex: 3-0)"
                            value={matchForm.score || ''}
                            onChange={(e) => setMatchForm({ ...matchForm, score: e.target.value })}
                            className="w-full mt-2 px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-[#2ecc71] font-black text-[#2ecc71] text-center text-sm tracking-widest"
                          />
                        </div>

                        <div className="space-y-2 border-t border-slate-50 pt-3">
                          <label className="text-[9px] font-black text-[#1a237e] uppercase tracking-wider px-1 block">Détails des Sets (Points)</label>
                          <div className="grid grid-cols-1 gap-1.5">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <div key={i} className="flex items-center gap-2 bg-slate-50/50 p-1.5 rounded-xl border border-slate-100">
                                <span className="w-6 h-6 rounded bg-slate-200/50 flex items-center justify-center font-bold text-[9px] text-slate-500 shrink-0">
                                  S{i+1}
                                </span>
                                <div className="flex-1 flex items-center gap-1.5">
                                  <input 
                                    type="number"
                                    placeholder="Equipe 1"
                                    className="w-full bg-white border border-slate-150 px-2 py-1 rounded-lg text-center font-bold text-[11px]"
                                    value={(matchForm.sets_detail || '').split(',')[i]?.split('-')[0]?.trim() || ''}
                                    onChange={(e) => handleSetChange(i, e.target.value, 1)}
                                  />
                                  <span className="text-slate-300 font-extrabold text-[10px]">-</span>
                                  <input 
                                    type="number"
                                    placeholder="Equipe 2"
                                    className="w-full bg-white border border-slate-150 px-2 py-1 rounded-lg text-center font-bold text-[11px]"
                                    value={(matchForm.sets_detail || '').split(',')[i]?.split('-')[1]?.trim() || ''}
                                    onChange={(e) => handleSetChange(i, e.target.value, 2)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-1 text-[9px] text-slate-400 font-bold bg-slate-50 p-2 rounded-lg border border-slate-100 truncate">
                            Format final: {matchForm.sets_detail || 'Aucun set saisi'}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Section 3: MVP Player */}
              <div className="bg-white border border-slate-150-60 rounded-2xl shadow-3xs overflow-hidden transition-all duration-150">
                <button 
                  onClick={() => setExpandMVP(!expandMVP)}
                  className="w-full flex items-center justify-between p-4 font-black text-xs uppercase text-slate-700 tracking-wider text-left border-b border-slate-100 bg-white hover:bg-slate-50/50"
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <Award size={14} className="text-[#1a237e]" />
                    <span>⭐ 3. Joueur MVP</span>
                    {matchForm.mvp ? (
                      <span className="ml-1 text-[8px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full uppercase font-black">Désigné</span>
                    ) : (
                      <span className="ml-1 text-[8px] bg-slate-100 text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full uppercase font-black">Aucun</span>
                    )}
                  </div>
                  {expandMVP ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
                </button>
                 <AnimatePresence initial={false}>
                  {expandMVP && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-white space-y-3">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[9px] font-black text-[#1a237e] uppercase tracking-wider">Nom du Joueur</label>
                          {(matchForm.mvp || matchForm.mvp_team || matchForm.mvp_dossard) && (
                            <button 
                              type="button" 
                              onClick={() => setMatchForm({ ...matchForm, mvp: '', mvp_team: '', mvp_dossard: '' })}
                              className="text-red-500 hover:text-red-700 cursor-pointer active:scale-95 transition-all p-0.5 rounded-md hover:bg-red-50 flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider"
                              title="Vider le MVP"
                            >
                              <Trash2 size={11} />
                              <span>Vider tout</span>
                            </button>
                          )}
                        </div>
                        <input 
                          type="text" 
                          placeholder="Nom complet du joueur désigné MVP..."
                          value={matchForm.mvp || ''}
                          onChange={(e) => setMatchForm({ ...matchForm, mvp: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-[#2ecc71] font-bold text-xs text-[#1a237e]"
                        />

                        {/* Équipe du MVP */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#1a237e] uppercase tracking-wider">Équipe du MVP</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setMatchForm({ ...matchForm, mvp_team: matchForm.mvp_team === matchForm.t1 ? '' : matchForm.t1 })}
                              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all truncate text-center cursor-pointer ${matchForm.mvp_team === matchForm.t1 ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-extrabold shadow-3xs' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'}`}
                            >
                              {resolvedFormTeams.t1}
                            </button>
                            <button
                              type="button"
                              onClick={() => setMatchForm({ ...matchForm, mvp_team: matchForm.mvp_team === matchForm.t2 ? '' : matchForm.t2 })}
                              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all truncate text-center cursor-pointer ${matchForm.mvp_team === matchForm.t2 ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-extrabold shadow-3xs' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'}`}
                            >
                              {resolvedFormTeams.t2}
                            </button>
                          </div>
                        </div>

                        {/* Numéro de dossard */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#1a237e] uppercase tracking-wider">Numéro de dossard</label>
                          <input 
                            type="text" 
                            placeholder="Ex: 10, 7, etc..."
                            value={matchForm.mvp_dossard || ''}
                            onChange={(e) => setMatchForm({ ...matchForm, mvp_dossard: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-[#2ecc71] font-bold text-xs text-[#1a237e]"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
              <button 
                onClick={closeEdit}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-bold uppercase text-[10px] tracking-wider active:scale-95 transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={saveMatch}
                className="flex-[2] py-3 bg-[#2ecc71] hover:bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md active:scale-95 transition-all"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Time Picker dialog replicating the date picker layout */}
      {openCustomTimePicker && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-[280px] rounded-3xl shadow-2xl p-5 border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="text-center">
              <span className="text-[9px] font-black text-[#1a237e]/60 uppercase tracking-widest leading-none">Sélection de l'Heure</span>
              <div className="text-3xl font-black text-[#1a237e] tracking-wide mt-1.5 font-mono">
                {tempHour.padStart(2, '0')}:{tempMinute.padStart(2, '0')}
              </div>
            </div>
            
            {/* Hour and Minute double selectors */}
            <div className="grid grid-cols-2 gap-3 h-40">
              <div className="flex flex-col border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 py-1 text-center bg-slate-100 border-b border-slate-200">Heures</div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 space-y-1 custom-scrollbar text-center">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const hStr = String(i).padStart(2, '0');
                    const isSelected = hStr === tempHour;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTempHour(hStr)}
                        className={`w-full py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${isSelected ? 'bg-[#1a237e] text-white font-extrabold' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        {hStr}h
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex flex-col border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 py-1 text-center bg-slate-100 border-b border-slate-200">Minutes</div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 space-y-1 custom-scrollbar text-center">
                  {Array.from({ length: 60 }).map((_, i) => {
                    const mStr = String(i).padStart(2, '0');
                    const isSelected = mStr === tempMinute;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTempMinute(mStr)}
                        className={`w-full py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${isSelected ? 'bg-[#1a237e] text-white font-extrabold' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        {mStr}m
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Vertically stacked actions matching the requested layout */}
            <div className="flex flex-col gap-2 mt-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-150-60">
              <button
                type="button"
                onClick={() => {
                  setMatchForm({ ...matchForm, time: `${tempHour.padStart(2, '0')}:${tempMinute.padStart(2, '0')}` });
                  setOpenCustomTimePicker(false);
                }}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all text-center cursor-pointer shadow-xs active:scale-95"
              >
                Définir
              </button>
              <button
                type="button"
                onClick={() => setOpenCustomTimePicker(false)}
                className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all text-center cursor-pointer active:scale-95"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatchForm({ ...matchForm, time: '' });
                  setOpenCustomTimePicker(false);
                }}
                className="w-full py-2.5 bg-red-100 hover:bg-red-200 text-red-600 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all text-center cursor-pointer active:scale-95"
              >
                Effacer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
