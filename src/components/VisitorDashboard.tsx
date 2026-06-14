import React, { useState, useMemo, useRef } from 'react';
import { Filter, Download, Calendar as CalendarIcon, Info, Trophy, Award, Users, X } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { Team, Match } from '../types';
import { sortTeams } from '../logic';
import { MatchCard } from './MatchCard';

export const isImageLogo = (logo?: string): boolean => {
  if (!logo) return false;
  const l = logo.trim();
  return l.startsWith('http') || l.startsWith('data:') || l.includes('.') || l.includes('/') || l.length > 10;
};

// Fonction utilitaire pour comparer les heures de manière robuste (par exemple "13h30", "15:00", "15h")
export const parseTimeValue = (timeStr: string): number => {
  if (!timeStr) return 9999; // Les matchs sans heure vont à la fin
  const cleaned = timeStr.trim().toLowerCase();
  const match = cleaned.match(/^(\d+)(?:[h:](\d+))?/);
  if (match) {
    const hours = parseInt(match[1], 10) || 0;
    const minutes = parseInt(match[2], 10) || 0;
    return hours * 60 + minutes;
  }
  return 9999;
};

// Fonction de comparaison chronologique globale
const TYPE_PRIORITY: Record<Match['type'], number> = {
  'POULE': 1,
  'QUARTER': 2,
  'SEMI': 3,
  'THIRD_PLACE': 4,
  'FINAL': 5
};

export const compareMatchesChronologically = (a: Match, b: Match): number => {
  // 1. Tri chronologique par date d'abord
  const dateA = a.date || '';
  const dateB = b.date || '';
  const dateCompare = dateA.localeCompare(dateB);
  if (dateCompare !== 0) return dateCompare;

  // 2. Si c'est le même jour, tri par heure
  const timeA = parseTimeValue(a.time);
  const timeB = parseTimeValue(b.time);
  if (timeA !== timeB) return timeA - timeB;

  // 3. Si c'est le même jour et la même heure, tri par phase pour l'ordre logique
  const priorityA = TYPE_PRIORITY[a.type] || 0;
  const priorityB = TYPE_PRIORITY[b.type] || 0;
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  // 4. En dernier recours, tri par ID unique pour la stabilité
  return a.id.localeCompare(b.id);
};

export const getLocalTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface VisitorDashboardProps {
  teams: Team[];
  matches: Match[];
}

export const VisitorDashboard: React.FC<VisitorDashboardProps> = ({ teams, matches }) => {
  const showLogos = true;
  const [activeTab, setActiveTab] = useState<'matches' | 'rankings' | 'podium'>('matches');
  const [filterDate, setFilterDate] = useState<string>(() => {
    return getLocalTodayString();
  });
  const [filterSexe, setFilterSexe] = useState<'H' | 'F'>('H');
  const [filterPoule, setFilterPoule] = useState<string>('A');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPodium, setIsExportingPodium] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const podiumRef = useRef<HTMLDivElement>(null);
  const matchesExportRef = useRef<HTMLDivElement>(null);
  const [isExportingMatches, setIsExportingMatches] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'today' | 'all' | 'played' | 'upcoming'>('today');

  const filterByTeam = (m: Match) => {
    if (!searchQuery) return true;
    const query = searchQuery.trim().toLowerCase();
    return m.t1.toLowerCase().includes(query) || m.t2.toLowerCase().includes(query);
  };

  const filteredMatches = useMemo(() => {
    let result = [];
    // Si une recherche est active, on ignore le filtre de date pour trouver tous les matchs de l'équipe
    if (searchQuery.trim()) {
      result = matches.filter(m => m.date !== '' && filterByTeam(m));
    } else {
      result = matches.filter(m => m.date !== '' && (!filterDate || m.date === filterDate));
    }
    
    // Filtre par statut (aujourd'hui, tous, joués ou à jouer)
    if (statusFilter === 'today') {
      const todayStr = getLocalTodayString();
      result = result.filter(m => m.date === todayStr);
    } else if (statusFilter === 'played') {
      result = result.filter(m => m.done === true);
    } else if (statusFilter === 'upcoming') {
      result = result.filter(m => m.done === false);
    }
    
    // Tri chronologique des rencontres par date puis par heure
    return result.sort(compareMatchesChronologically);
  }, [matches, filterDate, searchQuery, statusFilter]);

  const scheduledMatches = useMemo(() => {
    return matches.filter(m => m.date !== '' && filterByTeam(m)).sort(compareMatchesChronologically);
  }, [matches, searchQuery]);

  const matchesByDate = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    scheduledMatches.forEach(m => {
      if (!groups[m.date]) groups[m.date] = [];
      groups[m.date].push(m);
    });
    return groups;
  }, [scheduledMatches]);

  const groupMatchesByType = (list: Match[]) => {
    const order: Match['type'][] = ['POULE', 'QUARTER', 'SEMI', 'THIRD_PLACE', 'FINAL'];
    const labels: Record<Match['type'], string> = {
      'POULE': filterSexe === 'H' ? 'Phase Poule' : 'Phases de Poules',
      'QUARTER': 'Quarts de Finale',
      'SEMI': 'Demi-Finales',
      'THIRD_PLACE': 'Petites Finales (3è place)',
      'FINAL': 'Grandes Finales'
    };
    
    const groups: { type: Match['type']; label: string; matches: Match[] }[] = [];
    order.forEach(type => {
      const groupMatches = list.filter(m => m.type === type);
      if (groupMatches.length > 0) {
        groups.push({ type, label: labels[type], matches: groupMatches });
      }
    });
    return groups;
  };

  const dayMatchesGrouped = useMemo(() => groupMatchesByType(filteredMatches), [filteredMatches, filterSexe]);

  const finalMatches = useMemo(() => {
    const stageTypes: Match['type'][] = ['QUARTER', 'SEMI', 'THIRD_PLACE', 'FINAL'];
    // Only show final matches if they have a date (are programmed)
    return matches
      .filter(m => stageTypes.includes(m.type) && m.sexe === filterSexe && m.date !== '' && filterByTeam(m))
      .sort(compareMatchesChronologically);
  }, [matches, filterSexe, searchQuery]);

  const overallRankings = useMemo(() => {
    const sexTeams = teams.filter(t => t.sexe === filterSexe);
    
    // Start with global sorted list of all pool phase matches
    const sorted = sortTeams(sexTeams);
    
    // Find phase final matches to pinpoint real tournament results (playoffs)
    const finalMatch = matches.find(m => m.type === 'FINAL' && m.sexe === filterSexe && m.done);
    const thirdPlaceMatch = matches.find(m => m.type === 'THIRD_PLACE' && m.sexe === filterSexe && m.done);
    
    let championName: string | null = null;
    let secondName: string | null = null;
    let thirdName: string | null = null;
    let fourthName: string | null = null;

    if (finalMatch) {
      const scores = finalMatch.score.split('-').map(Number);
      if (scores.length === 2) {
        if (scores[0] > scores[1]) {
          championName = finalMatch.t1;
          secondName = finalMatch.t2;
        } else if (scores[1] > scores[0]) {
          championName = finalMatch.t2;
          secondName = finalMatch.t1;
        }
      }
    }

    if (thirdPlaceMatch) {
      const scores = thirdPlaceMatch.score.split('-').map(Number);
      if (scores.length === 2) {
        if (scores[0] > scores[1]) {
          thirdName = thirdPlaceMatch.t1;
          fourthName = thirdPlaceMatch.t2;
        } else if (scores[1] > scores[0]) {
          thirdName = thirdPlaceMatch.t2;
          fourthName = thirdPlaceMatch.t1;
        }
      }
    }

    // Re-order teams so that ultimate playoff winners override pool standings
    const orderedTeams: Team[] = [];
    const added = new Set<string>();

    if (championName) {
      const t = sexTeams.find(x => x.name === championName);
      if (t) { orderedTeams.push(t); added.add(championName); }
    }
    if (secondName) {
      const t = sexTeams.find(x => x.name === secondName);
      if (t) { orderedTeams.push(t); added.add(secondName); }
    }
    if (thirdName) {
      const t = sexTeams.find(x => x.name === thirdName);
      if (t) { orderedTeams.push(t); added.add(thirdName); }
    }
    if (fourthName) {
      const t = sexTeams.find(x => x.name === fourthName);
      if (t) { orderedTeams.push(t); added.add(fourthName); }
    }

    // Add remaining teams in the order of their general pool-sorting performance
    sorted.forEach(t => {
      if (!added.has(t.name)) {
        orderedTeams.push(t);
        added.add(t.name);
      }
    });

    return orderedTeams;
  }, [teams, matches, filterSexe]);

  const isTournamentCompleted = useMemo(() => {
    const categoryMatches = matches.filter(m => m.sexe === filterSexe);
    if (categoryMatches.length === 0) return false;
    
    if (filterSexe === 'F') {
      // Pour les dames, le tournoi est fini si tous les matchs du groupe (aller et retour) sont joués
      return categoryMatches.every(m => m.done);
    } else {
      // Le tournoi n'est réellement terminé que si la GRANDE FINALE de cette catégorie a été jouée et validée
      const finalMatch = categoryMatches.find(m => m.type === 'FINAL');
      return finalMatch ? finalMatch.done : false;
    }
  }, [matches, filterSexe]);

  const podium = useMemo(() => {
    return overallRankings.slice(0, 3);
  }, [overallRankings]);

  const handleDownloadMatchesImage = async () => {
    const element = matchesExportRef.current;
    if (!element) return;
    try {
      setIsExportingMatches(true);
      
      // Laisser un court délai à React pour afficher l'en-tête d'exportation
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1,
        backgroundColor: '#ffffff',
        pixelRatio: 2.2,
        width: width,
        height: height,
        style: {
          transform: 'none',
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: 'none',
          maxHeight: 'none',
        }
      });
      
      const link = document.createElement('a');
      let postfix = filterDate ? `_${filterDate}` : '_Tous_les_Matchs';
      if (statusFilter === 'upcoming') {
        postfix += '_A_Jouer';
      } else if (statusFilter === 'played') {
        postfix += '_Joues';
      }
      link.download = `Resultats_Matchs_JUB${postfix}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export of match results failed:', err);
      alert("L'exportation a échoué. Si vous êtes sur mobile, essayez d'ouvrir l'application dans un nouvel onglet.");
    } finally {
      setIsExportingMatches(false);
    }
  };

  const sortedRankings = useMemo(() => {
    if (filterPoule === 'G') {
      return overallRankings;
    }
    const pooled = teams.filter(t => t.sexe === filterSexe && t.poule === filterPoule);
    return sortTeams(pooled);
  }, [teams, filterSexe, filterPoule, overallRankings]);

  const handleDownload = async () => {
    const element = exportRef.current;
    if (!element) return;
    try {
      setIsExporting(true);
      
      const width = element.scrollWidth;
      const height = element.scrollHeight;
      
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1,
        backgroundColor: '#ffffff',
        pixelRatio: 2.5,
        width: width,
        height: height,
        style: {
          transform: 'none',
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: 'none',
          maxHeight: 'none',
        }
      });
      
      const link = document.createElement('a');
      link.download = `Classement_JUB_${filterSexe}_${filterPoule === 'G' ? 'General_Final' : filterPoule}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert("L'exportation a échoué. Si vous êtes sur mobile, essayez d'ouvrir l'application dans un nouvel onglet.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPodium = async () => {
    const element = podiumRef.current;
    if (!element) return;
    try {
      setIsExportingPodium(true);
      
      const width = element.scrollWidth;
      const height = element.scrollHeight;
      
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1,
        backgroundColor: '#1a237e',
        pixelRatio: 2.5,
        width: width,
        height: height,
        style: {
          transform: 'none',
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: 'none',
          maxHeight: 'none',
        }
      });
      
      const link = document.createElement('a');
      link.download = `Congratulations_Podium_JUB_${filterSexe}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export podium failed:', err);
      alert("L'exportation a échoué. Si vous êtes sur mobile, essayez d'ouvrir l'application dans un nouvel onglet.");
    } finally {
      setIsExportingPodium(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Sub-tab navigation */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-1">
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex-1 py-3.5 px-4 rounded-xl font-extrabold uppercase text-[11px] tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'matches'
              ? 'bg-[#2ecc71] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-[#1a237e]'
          }`}
        >
          <CalendarIcon size={15} />
          📅 Calendrier & Direct
        </button>
        <button
          onClick={() => setActiveTab('rankings')}
          className={`flex-1 py-3.5 px-4 rounded-xl font-extrabold uppercase text-[11px] tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'rankings'
              ? 'bg-[#2ecc71] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-[#1a237e]'
          }`}
        >
          <Trophy size={15} />
          📊 Tableaux des Classements
        </button>
        <button
          onClick={() => setActiveTab('podium')}
          className={`flex-1 py-3.5 px-4 rounded-xl font-extrabold uppercase text-[11px] tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'podium'
              ? 'bg-[#2ecc71] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-[#1a237e]'
          }`}
        >
          <Award size={15} />
          🏆 Podium & Vainqueurs
        </button>
      </div>

      {/* TAB SUB-VIEW: MATCHES (CALENDRIER & DIRECT) */}
      {activeTab === 'matches' && (
        <div className="space-y-8 animate-fade-in">
          {/* Filters & Search */}
          <div className="space-y-4">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-[#1a237e] rounded-lg">
                  <CalendarIcon size={20} />
                </div>
                <label className="font-bold text-[#1a237e] uppercase text-xs md:text-sm tracking-wide">Rencontres du jour</label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={filterDate || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilterDate(val);
                    if (val === getLocalTodayString()) {
                      setStatusFilter('today');
                    } else if (!val) {
                      setStatusFilter('all');
                    } else {
                      setStatusFilter('all');
                    }
                  }}
                  className="px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-[#2ecc71] transition-all text-sm font-semibold cursor-pointer"
                />
                {filterDate && (
                  <button 
                    onClick={() => {
                      setFilterDate('');
                      setStatusFilter('all');
                    }}
                    className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center animate-fade-in"
                    title="Afficher tous les matchs de toutes les dates"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-slate-50 text-slate-400 rounded-lg">
                <Filter size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Rechercher une équipe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent py-2 outline-none font-bold text-slate-700 placeholder:text-slate-300 text-sm"
              />
            </div>

            {/* Selection of Match Status */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Award size={18} />
                </div>
                <span className="font-bold text-[#1a237e] uppercase text-xs sm:text-sm tracking-wide">État des rencontres</span>
              </div>
              <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = getLocalTodayString();
                    setFilterDate(todayStr);
                    setStatusFilter('today');
                  }}
                  className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-extrabold text-[10px] md:text-xs uppercase transition-all tracking-wider ${
                    statusFilter === 'today'
                      ? 'bg-[#1a237e] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-850'
                  }`}
                >
                  📅 Aujourd'hui ({matches.filter(m => m.date === getLocalTodayString()).length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setFilterDate('');
                  }}
                  className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-extrabold text-[10px] md:text-xs uppercase transition-all tracking-wider ${
                    statusFilter === 'all'
                      ? 'bg-white text-[#1a237e] shadow-xs'
                      : 'text-slate-500 hover:text-slate-850'
                  }`}
                >
                  Tous ({matches.filter(m => m.date !== '').length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('played');
                    setFilterDate('');
                  }}
                  className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-extrabold text-[10px] md:text-xs uppercase transition-all tracking-wider ${
                    statusFilter === 'played'
                      ? 'bg-white text-[#2ecc71] shadow-xs'
                      : 'text-slate-500 hover:text-slate-850'
                  }`}
                >
                  Joués ({matches.filter(m => m.date !== '' && m.done === true).length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('upcoming');
                    setFilterDate('');
                  }}
                  className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-extrabold text-[10px] md:text-xs uppercase transition-all tracking-wider ${
                    statusFilter === 'upcoming'
                      ? 'bg-white text-amber-650 shadow-xs'
                      : 'text-slate-500 hover:text-slate-850'
                  }`}
                >
                  À Jouer ({matches.filter(m => m.date !== '' && m.done === false).length})
                </button>
              </div>
            </div>
          </div>

          {/* Matches List */}
          <div className="bg-white/45 p-1 rounded-2xl border border-slate-100">
            <div ref={matchesExportRef} className="bg-white p-3 sm:p-5 rounded-2xl">
              {/* Export Header */}
              {isExportingMatches && (
                <div translate="no" className="bg-gradient-to-r from-[#1a237e] to-[#2ecc71] text-white text-center py-6 rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-md mb-6 notranslate">
                  🏆 JEUX UNIVERSITAIRES DU BÉNIN (JUB) • ZONE 1 🏆
                  <div className="text-[10px] opacity-90 mt-2 font-bold tracking-widest border-t border-white/20 pt-2 w-fit mx-auto px-4">
                    {filterDate ? `MATCHS DU : ${filterDate}` : 'RESULTATS DES MATCHS'}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-6 px-2">
                <h3 className="font-black text-slate-800 uppercase text-sm tracking-wider flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-[#1a237e] rounded-full"></div>
                  {searchQuery.trim() ? 'Résultats de Recherche' : 'Calendrier & Résultats'}
                </h3>
                <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">
                  {filteredMatches.length} Matchs
                </span>
              </div>
              
              {dayMatchesGrouped.length > 0 ? (
                <div className="space-y-12">
                  {dayMatchesGrouped.map((group) => (
                    <div key={group.type} className="space-y-4">
                      <div className="flex items-center gap-4">
                         <div className="h-[2px] flex-1 bg-slate-100"></div>
                         <h4 className="flex-none font-extrabold text-[#1a237e]/40 uppercase text-[10px] tracking-widest px-4 border border-slate-100 py-1 rounded-full bg-slate-50">
                           {group.label}
                         </h4>
                         <div className="h-[2px] flex-1 bg-slate-100"></div>
                      </div>
                      <div className={group.type !== 'POULE' ? 'p-4 sm:p-6 bg-linear-to-br from-indigo-50/15 via-slate-50/5 to-amber-50/15 border border-indigo-100/60 rounded-3xl shadow-3xs relative overflow-hidden backdrop-blur-xs animate-in fade-in slide-in-from-bottom-2 duration-300' : ''}>
                        <div className="grid grid-cols-1 gap-4">
                          {group.matches.map(m => (
                            <MatchCard key={m.id} match={m} teams={teams} showLogos={showLogos} matches={matches} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                  <CalendarIcon size={40} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                    {searchQuery.trim() ? 'Aucune équipe trouvée' : 'Aucun match pour cette date'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Export Match Results Action Bar */}
          <div className="mt-8 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-3xs">
            <div className="text-left space-y-0.5">
              <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                📥 Publicité des Résultats
              </h4>
              <p className="text-[10px] text-amber-700/80 font-bold leading-none">
                Générez le calendrier dynamique et les scores filtrés sous forme d'image HD.
              </p>
            </div>
            <div className="w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadMatchesImage}
                disabled={isExportingMatches}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1a237e] hover:bg-[#3949ab] text-white font-black text-[11px] uppercase tracking-widest py-3 px-6 rounded-xl cursor-pointer active:scale-95 transition-all shadow-md"
                title="Télécharger les matchs affichés sous forme d'image PNG"
              >
                <Download size={14} className="text-white" />
                {isExportingMatches ? 'Génération en cours...' : 'Télécharger l\'Image (PNG)'}
              </button>
            </div>
          </div>

          {/* Full Schedule / Calendar Trigger */}
          {Object.keys(matchesByDate).length > 0 && (
            <div className="mt-12 text-center">
              <button 
                onClick={() => setShowFullSchedule(!showFullSchedule)}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <CalendarIcon size={18} />
                {showFullSchedule ? 'Masquer le calendrier complet' : 'Voir le calendrier complet du tournoi'}
              </button>
            </div>
          )}

          {/* Full Schedule Content */}
          {showFullSchedule && Object.keys(matchesByDate).length > 0 && (
            <div className="mt-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-6 bg-[#2ecc71] rounded-full"></div>
                <h3 className="font-black text-slate-800 uppercase text-sm tracking-wider">
                  Planning Intégral
                </h3>
              </div>
              <div className="space-y-12">
                {(Object.entries(matchesByDate) as [string, Match[]][]).sort(([a], [b]) => a.localeCompare(b)).map(([date, dateMatches]) => (
                  <div key={date} className="relative pl-8 border-l-2 border-slate-100 pb-2">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-4 border-[#2ecc71] rounded-full"></div>
                    <h4 className="font-black text-[#1a237e] uppercase text-[10px] mb-6 flex items-center gap-2 bg-slate-50 w-fit px-3 py-1 rounded-lg">
                      <CalendarIcon size={12} className="text-[#2ecc71]" />
                      {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                      {dateMatches.map(m => (
                        <MatchCard key={m.id} match={m} teams={teams} showLogos={showLogos} matches={matches} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Finals Container */}
          {finalMatches.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-0.5 flex-1 bg-linear-to-r from-transparent to-[#f1c40f]"></div>
                <h3 className="flex-none font-black text-[#1a237e] uppercase text-base tracking-widest flex items-center gap-2">
                  🏆 PHASES FINALES ({filterSexe === 'H' ? 'H' : 'F'})
                </h3>
                <div className="h-0.5 flex-1 bg-linear-to-r from-[#f1c40f] to-transparent"></div>
              </div>
              <div className="space-y-12">
                {groupMatchesByType(finalMatches).map((group) => (
                  <div key={group.type} className="space-y-4">
                    <div className="flex items-center gap-4">
                       <div className="h-[1px] flex-1 bg-slate-100"></div>
                       <h4 className="flex-none font-extrabold text-[#f1c40f] uppercase text-[10px] tracking-widest px-4 border border-[#f1c40f]/20 py-1 rounded-full bg-yellow-50/50">
                         {group.label}
                       </h4>
                       <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </div>
                    <div className="p-4 sm:p-6 bg-linear-to-br from-indigo-50/15 via-slate-50/5 to-amber-50/15 border border-indigo-100 rounded-3xl shadow-3xs relative overflow-hidden backdrop-blur-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="grid grid-cols-1 gap-4">
                        {group.matches.map(m => (
                          <MatchCard key={m.id} match={m} teams={teams} showLogos={showLogos} matches={matches} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB SUB-VIEW: RANKINGS (TABLE DES CLASSEMENTS) */}
      {activeTab === 'rankings' && (
        <div className="space-y-6 animate-fade-in animate-duration-300">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-[#1a237e] uppercase tracking-wide px-1">Genre</label>
                  <select 
                    value={filterSexe}
                    onChange={(e) => {
                      const s = e.target.value as 'H' | 'F';
                      setFilterSexe(s);
                      if (s === 'F') {
                        setFilterPoule('DAME');
                      } else {
                        setFilterPoule('A');
                      }
                    }}
                    className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-600 outline-none focus:border-[#2ecc71] text-sm"
                  >
                    <option value="H">♂️ Hommes</option>
                    <option value="F">♀️ Dames</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-[#1a237e] uppercase tracking-wide px-1">Poule / Groupe</label>
                  <select 
                    value={filterPoule}
                    onChange={(e) => setFilterPoule(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-600 outline-none focus:border-[#2ecc71] text-sm"
                  >
                    {filterSexe === 'F' ? (
                      <>
                        <option value="DAME">Poule Unique (DAME)</option>
                        <option value="G">📊 Classement Général</option>
                      </>
                    ) : (
                      <>
                        <option value="A">Poule A</option>
                        <option value="B">Poule B</option>
                        <option value="C">Poule C</option>
                        <option value="D">Poule D</option>
                        <option value="G">📊 Classement Général</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              {!(filterPoule === 'G' && !isTournamentCompleted) && (
                <div className="flex items-end self-stretch md:self-end animate-fade-in">
                  <button 
                    onClick={handleDownload}
                    disabled={isExporting}
                    className={`w-full md:w-auto py-3.5 px-6 bg-[#1a237e] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:shadow-lg hover:bg-indigo-900 transition-all flex items-center justify-center gap-2 active:scale-95 ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <Download size={16} className={isExporting ? 'animate-bounce' : ''} />
                    {isExporting ? 'Exportation...' : 'Exporter Tableau (PNG) 💾'}
                  </button>
                </div>
              )}
            </div>

            {filterPoule === 'G' && !isTournamentCompleted ? (
              <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl p-8 md:p-12 text-center max-w-xl mx-auto space-y-4 animate-fade-in my-6">
                <div className="h-16 w-16 bg-blue-50 text-[#1a237e] border border-blue-100 rounded-full flex items-center justify-center text-3xl mx-auto animate-pulse">
                  📊
                </div>
                <h3 className="text-[#1a237e] font-black uppercase text-sm tracking-widest">
                  Classement Général Suspendu
                </h3>
                <p className="text-slate-500 font-bold text-xs leading-relaxed">
                  Le classement général cumulé (de la première à la dernière équipe) n'est pas encore disponible. Il sera révélé et disponible dès que tous les matchs de la phase finale ({filterSexe === 'H' ? 'Hommes' : 'Dames'}) auront été terminés.
                </p>
                <div className="text-[10px] bg-slate-100/80 text-slate-500 py-2 px-4 rounded-xl inline-block font-extrabold border border-slate-200">
                  💡 Astuce : Sélectionnez une Poule (A, B, C, D) ci-dessus pour consulter les classements de groupes.
                </div>
              </div>
            ) : (
              <>
                {/* Mobile swipe indicator */}
                <div className="md:hidden flex items-center gap-2 bg-indigo-50 text-indigo-700 p-3 rounded-xl border border-indigo-100 text-xs font-bold mb-4">
                  <span>↔️</span>
                  <span>Faites défiler le tableau horizontalement pour tout voir sur mobile.</span>
                </div>

                {/* Table export contents */}
            <div className="overflow-x-auto">
              <div ref={exportRef} className="bg-white p-4 md:p-8 rounded-2xl min-w-[1020px]">
                {/* Visual Header within exported image */}
                <div translate="no" className="bg-gradient-to-r from-[#1a237e] to-[#2ecc71] text-white text-center py-6 rounded-2xl font-black uppercase text-base sm:text-lg tracking-[0.2em] shadow-md mb-6 notranslate">
                  🏆 JEUX UNIVERSITAIRES DU BÉNIN (JUB) • ZONE 1 🏆
                  <div className="text-[11px] opacity-90 mt-2 font-bold tracking-widest border-t border-white/20 pt-2 w-fit mx-auto px-4">
                    CLASSEMENT {filterSexe === 'H' ? 'HOMMES' : 'DAMES'} • {filterPoule === 'G' ? 'CLASSEMENT GÉNÉRAL' : `POULE ${filterPoule}`}
                  </div>
                </div>

                {/* Table Container wrapping the table with precise border colors & green top bar */}
                <div className="overflow-hidden rounded-t-2xl rounded-b-xl border border-slate-200/80 border-t-[5px] border-t-[#2ecc71] bg-white">
                  <table className="w-full text-sm text-center border-separate border-spacing-0">
                    <thead>
                      <tr className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">
                        <th className="py-4 px-2 bg-[#f5f8fc] border-b border-r border-slate-100/80">RANG</th>
                        <th className="py-4 px-6 bg-[#f5f8fc] border-b border-r border-slate-100/80 text-left">CLUB / ÉQUIPE</th>
                        {filterPoule === 'G' && (
                          <th className="py-4 px-4 bg-[#f5f8fc] border-b border-r border-slate-100/80">POULE</th>
                        )}
                        <th translate="no" className="notranslate py-4 px-3 bg-[#f5f8fc] border-b border-r border-slate-100/80">MJ</th>
                        <th translate="no" className="notranslate py-4 px-3 bg-[#f5f8fc] border-b border-r border-slate-100/80">MG</th>
                        <th translate="no" className="notranslate py-4 px-3 bg-[#f5f8fc] border-b border-r border-slate-100/80">MP</th>
                        <th className="py-4 px-3 bg-[#f5f8fc] border-b border-r border-slate-100/80 italic">SETS G.</th>
                        <th className="py-4 px-3 bg-[#f5f8fc] border-b border-r border-slate-100/80 italic">SETS P.</th>
                        <th className="py-4 px-3 bg-[#f5f8fc] border-b border-r border-slate-100/80">RATIO SETS</th>
                        <th translate="no" className="notranslate py-4 px-3 bg-[#f5f8fc] border-b border-r border-slate-100/80">PG</th>
                        <th translate="no" className="notranslate py-4 px-3 bg-[#f5f8fc] border-b border-r border-slate-100/80">PP</th>
                        <th className="py-4 px-3 bg-[#f5f8fc] border-b border-r border-slate-100/80">RATIO POINTS</th>
                        <th translate="no" className="notranslate py-4 px-5 bg-[#edf1f6] text-slate-800 text-xs font-black border-b border-slate-200">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRankings.length > 0 ? (
                        sortedRankings.map((team, idx) => {
                          const setRatioVal = team.mj === 0 ? "0.000" : (team.sp === 0 ? "MAX" : (team.sg / team.sp).toFixed(3));
                          const setRatioClass = team.mj === 0 ? "text-slate-400 font-normal" : (team.sp === 0 || (team.sg / team.sp) > 1 ? "text-[#2ecc71]" : ((team.sg / team.sp) < 1 ? "text-red-500" : "text-slate-800"));

                          const pointRatioVal = team.mj === 0 ? "0.005" : (team.pp === 0 ? "MAX" : (team.pg / team.pp).toFixed(3));
                          // Handle pointRatio decimal and comparison properly
                          const actualPointRatio = team.pp === 0 ? Infinity : team.pg / team.pp;
                          const pointRatioClass = team.mj === 0 ? "text-slate-400 font-normal" : (team.pp === 0 || actualPointRatio > 1 ? "text-[#2ecc71]" : (actualPointRatio < 1 ? "text-red-500" : "text-slate-800"));
                          const formattedPointRatioVal = team.mj === 0 ? "0.000" : (team.pp === 0 ? "MAX" : actualPointRatio.toFixed(3));

                          return (
                            <tr key={team.name} className="hover:bg-slate-50/40 transition-colors">
                              <td className="py-4 px-2 border-b border-r border-slate-100/80 font-bold text-slate-400 text-xs">
                                {idx + 1}
                              </td>
                              <td translate="no" className="notranslate py-3 px-6 border-b border-r border-slate-100/80 text-left font-black text-[#1a237e] text-sm">
                                <div className="flex items-center gap-2">
                                  {showLogos && team.logo && (
                                    <div className="w-6 h-6 flex items-center justify-center shrink-0 overflow-hidden bg-white border border-slate-200/60 rounded-full shadow-3xs p-0.5 select-none">
                                      {isImageLogo(team.logo) ? (
                                        <img src={team.logo} alt="" className="w-full h-full object-contain rounded-full" referrerPolicy="no-referrer" />
                                      ) : (
                                        <span className="text-xs leading-none select-none">{team.logo}</span>
                                      )}
                                    </div>
                                  )}
                                  <span>{team.name}</span>
                                </div>
                              </td>
                              {filterPoule === 'G' && (
                                <td className="py-3 px-4 border-b border-r border-slate-100/80 font-bold text-[#1a237e] text-xs">
                                  <span className="bg-indigo-50/80 border border-indigo-100/60 text-indigo-700 px-2.5 py-1 rounded-md font-bold whitespace-nowrap">
                                    Poule {team.poule}
                                  </span>
                                </td>
                              )}
                              <td className="py-3 px-3 border-b border-r border-slate-100/80 font-black text-slate-800 text-xs">{team.mj}</td>
                              <td className="py-3 px-3 border-b border-r border-slate-100/80 font-black text-slate-800 text-xs">{team.mg}</td>
                              <td className="py-3 px-3 border-b border-r border-slate-100/80 font-black text-slate-800 text-xs">{team.mp}</td>
                              <td className="py-3 px-3 border-b border-r border-slate-100/80 font-black text-slate-800 text-xs">{team.sg}</td>
                              <td className="py-3 px-3 border-b border-r border-slate-100/80 font-black text-slate-800 text-xs">{team.sp}</td>
                              <td className={`py-3 px-3 border-b border-r border-slate-100/80 font-black text-xs ${setRatioClass}`}>
                                {setRatioVal}
                              </td>
                              <td className="py-3 px-3 border-b border-r border-slate-100/80 font-black text-slate-800 text-xs">{team.pg}</td>
                              <td className="py-3 px-3 border-b border-r border-slate-100/80 font-black text-slate-800 text-xs">{team.pp}</td>
                              <td className={`py-3 px-3 border-b border-r border-slate-100/80 font-black text-xs ${pointRatioClass}`}>
                                {formattedPointRatioVal}
                              </td>
                              <td translate="no" className="notranslate py-3 px-5 border-b bg-[#f0f4f9] font-black text-lg text-slate-900 border-l border-l-slate-100">
                                {team.pts}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={filterPoule === 'G' ? 13 : 12} className="py-12 text-slate-400 font-medium italic">
                            Aucune donnée de classement disponible
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Info Bar with custom sage-green dashed border style from the screenshot */}
                <div className="mt-6 p-5 border-2 border-dashed border-[#2ecc71]/40 rounded-3xl bg-[#f1fcf8]/70 text-left flex items-start gap-3">
                  <Info size={18} className="text-[#2ecc71] shrink-0 mt-0.5" />
                  <div className="text-slate-800 text-[11px] leading-relaxed font-semibold">
                    <span className="font-extrabold uppercase mr-1">INFORMATION :</span> 
                    Barème : Victoire 3-0 ou 3-1 (+3 pts), Victoire 3-2 (+2 pts), Défaite 2-3 (+1 pt), Défaite 0-3 ou 1-3 (0 pt). Le classement priorise les Points, puis le Ratio de Sets, puis le Ratio de Points.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
          </div>
        </div>
      )}

      {/* TAB SUB-VIEW: PODIUM & CONGRATULATIONS */}
      {activeTab === 'podium' && (
        <div className="space-y-6 animate-fade-in animate-duration-300">
          {!isTournamentCompleted ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 animate-fade-in">
              <div className="h-16 w-16 bg-amber-50 text-amber-500 border border-amber-100 rounded-full flex items-center justify-center text-3xl mx-auto animate-pulse">
                🏆
              </div>
              <h3 className="text-[#1a237e] font-black uppercase text-sm tracking-wider">
                Podium & Vainqueurs non disponibles
              </h3>
              <p className="text-slate-500 font-bold text-xs leading-relaxed">
                Les compétitions de la phase finale ({filterSexe === 'H' ? 'Hommes' : 'Dames'}) ne sont pas encore terminées. Le podium et la carte de félicitations du vainqueur seront visibles dès que la grande finale aura été disputée et validée !
              </p>
              <div className="text-[10px] bg-slate-50 text-slate-400 py-1.5 px-3 rounded-full inline-block font-bold border border-slate-100">
                Statut : Phase finale en cours de jeu 🏐
              </div>
            </div>
          ) : podium.length > 0 ? (
            <div className="space-y-4">
              <div ref={podiumRef} className="bg-gradient-to-br from-[#1a237e] via-[#303f9f] to-[#1a237e] text-white p-6 md:p-8 rounded-3xl border border-blue-400/20 shadow-2xl relative overflow-hidden text-center">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -mr-20 -mt-20"></div>
                <div className="absolute left-0 bottom-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl -ml-20 -mb-20"></div>
                
                <div className="relative text-center max-w-2xl mx-auto space-y-4">
                  <div className="inline-flex items-center gap-1.5 bg-yellow-400/15 border border-yellow-400/30 text-yellow-300 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest leading-none">
                    ✨ Tournoi Officié avec Succès ✨
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight uppercase leading-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-amber-100 to-yellow-300 animate-pulse">
                    CONGRATULATIONS ! 👏🏆
                  </h2>
                  <p className="text-xs md:text-sm text-blue-100/90 leading-relaxed max-w-xl mx-auto font-medium">
                    Félicitations aux vainqueurs et un grand merci à l'ensemble des participants ! 👏 Les compétitions des <span translate="no" className="notranslate font-black text-amber-200">JEUX UNIVERSITAIRES DU BÉNIN (JUB)</span> se sont achevées avec brio. Merci d'avoir fait vibrer le volley-ball à l'Université de Parakou ! 🇧🇯🏐✨
                  </p>
                </div>

                <div className="relative mt-10 md:mt-12 max-w-lg mx-auto flex items-end justify-center gap-2 sm:gap-4 select-none">
                  {/* 2nd Place */}
                  {podium[1] ? (
                    <div className="flex-1 flex flex-col items-center">
                      {showLogos && podium[1].logo && (
                        <div className="w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden bg-white/10 rounded-full border border-white/20 mb-1.5 shadow-md">
                          {isImageLogo(podium[1].logo) ? (
                            <img src={podium[1].logo} alt="" className="w-full h-full object-contain rounded-full" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-xl leading-none">{podium[1].logo}</span>
                          )}
                        </div>
                      )}
                      <span translate="no" className="notranslate text-slate-300 font-extrabold text-xs sm:text-sm text-center mb-1 max-w-[120px] truncate">{podium[1].name}</span>
                      <div className="w-full bg-slate-100/10 border-t-2 border-slate-300/30 rounded-t-xl py-4 sm:py-6 text-center shadow-lg backdrop-blur-xs flex flex-col items-center gap-1 min-h-[90px] sm:min-h-[120px] justify-center">
                        <span className="text-xl sm:text-2xl">🥈</span>
                        <span className="font-black text-slate-300 text-[10px] sm:text-xs uppercase tracking-wider">2e Place</span>
                        <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-widest mt-1 font-bold">Vice-Champion</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-[90px]"></div>
                  )}

                  {/* 1st Place */}
                  {podium[0] ? (
                    <div className="flex-1 flex flex-col items-center z-10 block">
                      <span className="text-2xl sm:text-3xl animate-bounce mb-1">👑</span>
                      {showLogos && podium[0].logo && (
                        <div className="w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden bg-white/15 rounded-full border border-white/30 mb-1.5 shadow-lg animate-pulse">
                          {isImageLogo(podium[0].logo) ? (
                            <img src={podium[0].logo} alt="" className="w-full h-full object-contain rounded-full" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-2xl leading-none">{podium[0].logo}</span>
                          )}
                        </div>
                      )}
                      <span translate="no" className="notranslate text-yellow-330 font-black text-sm sm:text-base text-center mb-1 max-w-[140px] truncate">{podium[0].name}</span>
                      <div className="w-full bg-amber-500/20 border-t-4 border-yellow-450 rounded-t-2xl py-6 sm:py-10 text-center shadow-xl backdrop-blur-xs border border-yellow-400/20 flex flex-col items-center gap-1 min-h-[130px] sm:min-h-[170px] justify-center text-white">
                        <span className="text-3xl sm:text-4xl">🥇</span>
                        <span className="font-mono font-black text-yellow-300 text-xs sm:text-sm uppercase tracking-wider">CHAMPION</span>
                        <span className="text-[8px] sm:text-[10px] text-yellow-450 font-extrabold tracking-widest bg-yellow-400/10 px-2 py-0.5 rounded-full mt-1.5 uppercase">Vainqueur</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-[130px]"></div>
                  )}

                  {/* 3rd Place */}
                  {podium[2] ? (
                    <div className="flex-1 flex flex-col items-center">
                      {showLogos && podium[2].logo && (
                        <div className="w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden bg-white/10 rounded-full border border-white/20 mb-1.5 shadow-md">
                          {isImageLogo(podium[2].logo) ? (
                            <img src={podium[2].logo} alt="" className="w-full h-full object-contain rounded-full" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-xl leading-none">{podium[2].logo}</span>
                          )}
                        </div>
                      )}
                      <span translate="no" className="notranslate text-amber-500 font-extrabold text-xs sm:text-sm text-center mb-1 max-w-[120px] truncate">{podium[2].name}</span>
                      <div className="w-full bg-amber-700/10 border-t-2 border-amber-605/30 rounded-t-xl py-3 sm:py-5 text-center shadow-lg backdrop-blur-xs flex flex-col items-center gap-1 min-h-[80px] sm:min-h-[100px] justify-center">
                        <span className="text-xl sm:text-2xl">🥉</span>
                        <span className="font-black text-amber-600 text-[10px] sm:text-xs uppercase tracking-wider">3e Place</span>
                        <span className="text-[8px] sm:text-[9px] text-amber-500/80 uppercase tracking-widest mt-1 font-bold">Bronze</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-[80px]"></div>
                  )}
                </div>
              </div>
              <div className="flex justify-end px-2">
                <button
                  onClick={handleDownloadPodium}
                  disabled={isExportingPodium}
                  className={`flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-[#1a237e] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 ${isExportingPodium ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  <Download size={15} className={isExportingPodium ? 'animate-bounce' : ''} />
                  {isExportingPodium ? 'Téléchargement...' : 'Télécharger Félicitations & Podium (PNG) 🏆'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
              <Trophy size={48} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Aucune équipe disponible pour le podium</p>
              <p className="text-slate-300 text-xs mt-1">Le podium s'activera automatiquement dès le tournoi programmé.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
