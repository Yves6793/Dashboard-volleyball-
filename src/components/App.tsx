import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Settings, Users } from 'lucide-react';
import { Team, Match } from '../types.ts';
import { calculateRankings } from '../logic.ts';
import { VisitorDashboard } from './VisitorDashboard.tsx';
import { AdminDashboard } from './AdminDashboard.tsx';
import { db, COLLECTIONS, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, writeBatch, deleteDoc, setDoc, getDocs, doc as fdDoc, getDocFromServer } from 'firebase/firestore';

// Configuration officielle Jeux Universitaires du Bénin (JUB) 2026 - Phase Zone 1 (Volley-ball)
export const OFFICIAL_JUB_TEAMS: Team[] = [
  // Hommes - Poule A
  { id: 'T_SAPIENTIA_H', name: 'SAPIENTIA', sexe: 'H', poule: 'A', mj: 0, mg: 0, mp: 0, sg: 0, sp: 0, pg: 0, pp: 0, pts: 0, logo: '🛡️', createdAt: 1718200000001 },
  { id: 'T_FA_UP_H', name: 'FA/UP', sexe: 'H', poule: 'A', mj: 0, mg: 0, mp: 0, sg: 0, sp: 0, pg: 0, pp: 0, pts: 0, logo: '⚡', createdAt: 1718200000002 },
  { id: 'T_LCS_H', name: 'LCS PARAKOU', sexe: 'H', poule: 'A', mj: 0, mg: 0, mp: 0, sg: 0, sp: 0, pg: 0, pp: 0, pts: 0, logo: '🦁', createdAt: 1718200000003 },
  // Hommes - Poule B
  { id: 'T_FDSP_H', name: 'FDSP/UP', sexe: 'H', poule: 'B', mj: 0, mg: 0, mp: 0, sg: 0, sp: 0, pg: 0, pp: 0, pts: 0, logo: '⚖️', createdAt: 1718200000004 },
  { id: 'T_FASEG_H', name: 'FASEG/UP', sexe: 'H', poule: 'B', mj: 0, mg: 0, mp: 0, sg: 0, sp: 0, pg: 0, pp: 0, pts: 0, logo: '📈', createdAt: 1718200000005 },
  { id: 'T_FLASH_H', name: 'FLASH/UP', sexe: 'H', poule: 'B', mj: 0, mg: 0, mp: 0, sg: 0, sp: 0, pg: 0, pp: 0, pts: 0, logo: '☄️', createdAt: 1718200000006 },
  // Hommes - Poule C ( FAST-NATITINGOU qualifiée d'office )
  { id: 'T_FAST_H', name: 'FAST/NATITINGOU', sexe: 'H', poule: 'C', mj: 0, mg: 0, mp: 0, sg: 0, sp: 0, pg: 0, pp: 0, pts: 0, logo: '🐆', createdAt: 1718200000007 },
  
  // Dames - Poule Unique "DAME"
  { id: 'T_FLASH_F', name: 'FLASH/UP', sexe: 'F', poule: 'DAME', mj: 0, mg: 0, mp: 0, sg: 0, sp: 0, pg: 0, pp: 0, pts: 0, logo: '⭐', createdAt: 1718200000101 },
  { id: 'T_LCS_F', name: 'LCS PARAKOU', sexe: 'F', poule: 'DAME', mj: 0, mg: 0, mp: 0, sg: 0, sp: 0, pg: 0, pp: 0, pts: 0, logo: '🏆', createdAt: 1718200000102 },
];

export const OFFICIAL_JUB_MATCHES: Match[] = [
  // Jour 1 (13/06/2026)
  {
    id: 'M_J1_1_SAPIENTIA_LCS_H',
    t1: 'SAPIENTIA',
    t2: 'LCS PARAKOU',
    sexe: 'H',
    poule: 'A',
    type: 'POULE',
    label: 'PHASE POULE',
    date: '2026-06-13',
    time: '08:00',
    score: '',
    sets_detail: '',
    mvp: '',
    done: false,
    pg_t: 0,
    pp_t: 0
  },
  {
    id: 'M_J1_2_FDSP_FLASH_H',
    t1: 'FDSP/UP',
    t2: 'FLASH/UP',
    sexe: 'H',
    poule: 'B',
    type: 'POULE',
    label: 'PHASE POULE',
    date: '2026-06-13',
    time: '10:00',
    score: '',
    sets_detail: '',
    mvp: '',
    done: false,
    pg_t: 0,
    pp_t: 0
  },
  {
    id: 'M_J1_3_FA_LCS_H',
    t1: 'FA/UP',
    t2: 'LCS PARAKOU',
    sexe: 'H',
    poule: 'A',
    type: 'POULE',
    label: 'PHASE POULE',
    date: '2026-06-13',
    time: '14:00',
    score: '',
    sets_detail: '',
    mvp: '',
    done: false,
    pg_t: 0,
    pp_t: 0
  },
  
  // Jour 2 (14/06/2026)
  {
    id: 'M_J2_1_FASEG_FLASH_H',
    t1: 'FASEG/UP',
    t2: 'FLASH/UP',
    sexe: 'H',
    poule: 'B',
    type: 'POULE',
    label: 'PHASE POULE',
    date: '2026-06-14',
    time: '14:00',
    score: '',
    sets_detail: '',
    mvp: '',
    done: false,
    pg_t: 0,
    pp_t: 0
  },
  {
    id: 'M_J2_2_SAPIENTIA_FA_H',
    t1: 'SAPIENTIA',
    t2: 'FA/UP',
    sexe: 'H',
    poule: 'A',
    type: 'POULE',
    label: 'PHASE POULE',
    date: '2026-06-14',
    time: '15:00',
    score: '',
    sets_detail: '',
    mvp: '',
    done: false,
    pg_t: 0,
    pp_t: 0
  },
  
  // Jour 3 (15/06/2026)
  {
    id: 'M_J3_1_FDSP_FASEG_H',
    t1: 'FDSP/UP',
    t2: 'FASEG/UP',
    sexe: 'H',
    poule: 'B',
    type: 'POULE',
    label: 'PHASE POULE',
    date: '2026-06-15',
    time: '08:00',
    score: '',
    sets_detail: '',
    mvp: '',
    done: false,
    pg_t: 0,
    pp_t: 0
  },
  
  // Jour 4 (17/06/2026)
  {
    id: 'M_J4_1_LCS_FLASH_F_ALLER',
    t1: 'LCS PARAKOU',
    t2: 'FLASH/UP',
    sexe: 'F',
    poule: 'DAME',
    type: 'POULE',
    label: 'ALLER DAME',
    date: '2026-06-17',
    time: '08:00',
    score: '',
    sets_detail: '',
    mvp: '',
    done: false,
    pg_t: 0,
    pp_t: 0
  },
  
  // Jour 5 (18/06/2026)
  {
    id: 'M_J5_1_FLASH_LCS_F_RETOUR',
    t1: 'FLASH/UP',
    t2: 'LCS PARAKOU',
    sexe: 'F',
    poule: 'DAME',
    type: 'POULE',
    label: 'RETOUR DAME',
    date: '2026-06-18',
    time: '08:00',
    score: '',
    sets_detail: '',
    mvp: '',
    done: false,
    pg_t: 0,
    pp_t: 0
  },
  {
    id: 'M_J5_2_SEMI1_H',
    t1: '1er Poule A',
    t2: '1er Meilleur 2e',
    sexe: 'H',
    poule: 'FINAL',
    type: 'SEMI',
    label: '1/2 FINALE - MATCH 1',
    date: '2026-06-18',
    time: '14:00',
    score: '',
    sets_detail: '',
    mvp: '',
    done: false,
    pg_t: 0,
    pp_t: 0
  },
  {
    id: 'M_J5_3_SEMI2_H',
    t1: '1er Poule B',
    t2: 'FAST/NATITINGOU',
    sexe: 'H',
    poule: 'FINAL',
    type: 'SEMI',
    label: '1/2 FINALE - MATCH 2',
    date: '2026-06-18',
    time: '15:30',
    score: '',
    sets_detail: '',
    mvp: '',
    done: false,
    pg_t: 0,
    pp_t: 0
  },
  
  // Jour 6 (19/06/2026)
  {
    id: 'M_J6_1_FINAL_H',
    t1: 'VD1',
    t2: 'VD2',
    sexe: 'H',
    poule: 'FINAL',
    type: 'FINAL',
    label: 'GRANDE FINALE',
    date: '2026-06-19',
    time: '15:00',
    score: '',
    sets_detail: '',
    mvp: '',
    done: false,
    pg_t: 0,
    pp_t: 0
  }
];

export default function App() {
  const [view, setView] = useState<'visitor' | 'admin'>('visitor');
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAuthField, setShowAuthField] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [onlineUsersCount, setOnlineUsersCount] = useState<number>(1);

  // Global setting state for team logos showing/hiding
  const [showLogos, setShowLogos] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('jub_show_logos');
      return saved !== 'false'; // default to true
    } catch {
      return true;
    }
  });

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setErrorStatus(null);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Connection health check
  useEffect(() => {
    const checkConnection = async () => {
      if (!navigator.onLine) {
        console.log("Offline mode active, skipping connection health check");
        return;
      }
      try {
        console.log("Checking Firestore connection...");
        await getDocFromServer(fdDoc(db, '_health', 'check'));
        console.log("Firestore connection OK");
      } catch (err) {
        console.warn("Firestore health check status:", err);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('permission') || msg.includes('connectivity') || msg.includes('offline')) {
          if (navigator.onLine) {
            setErrorStatus("Erreur de connexion à la base de données. Veuillez vérifier votre connexion internet.");
          }
        }
      }
    };
    checkConnection();
  }, [isOffline]);

  // Sync with Firestore
  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, COLLECTIONS.TEAMS), (snapshot) => {
      console.log(`Received teams update: ${snapshot.size} teams`);
      const teamsData = snapshot.docs.map(doc => doc.data() as Team);
      setTeams(teamsData);
      setLoading(false);
      setErrorStatus(null);
    }, (error) => {
      console.error("Teams sync error:", error);
      setErrorStatus(`Erreur de synchronisation (Teams): ${error.message}`);
      setLoading(false);
    });

    const unsubMatches = onSnapshot(collection(db, COLLECTIONS.MATCHES), (snapshot) => {
      console.log(`Received matches update: ${snapshot.size} matches`);
      const matchesData = snapshot.docs.map(doc => doc.data() as Match);
      setMatches(matchesData);
    }, (error) => {
      console.error("Matches sync error:", error);
      setErrorStatus(`Erreur de synchronisation (Matches): ${error.message}`);
    });

    return () => {
      unsubTeams();
      unsubMatches();
    };
  }, []);

  // User presence heartbeat and active count listener
  useEffect(() => {
    if (isOffline) {
      setOnlineUsersCount(1);
      return;
    }
    
    const sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
    const docRef = doc(db, COLLECTIONS.PRESENCE, sessionId);

    const reportHeartbeat = async () => {
      try {
        await setDoc(docRef, { id: sessionId, lastActive: Date.now() });
      } catch (err) {
        console.error("Heartbeat sync failed:", err);
      }
    };

    reportHeartbeat();

    const intervalId = setInterval(reportHeartbeat, 20000);

    const unsubPresence = onSnapshot(collection(db, COLLECTIONS.PRESENCE), (snapshot) => {
      const now = Date.now();
      const cutoff = now - 60000;
      let activeCount = 0;
      
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data && typeof data.lastActive === 'number' && data.lastActive > cutoff) {
          activeCount++;
        }
      });
      setOnlineUsersCount(activeCount > 0 ? activeCount : 1);
    }, (error) => {
      console.error("Presence snapshot error:", error);
    });

    const handleUnload = () => {
      deleteDoc(docRef).catch(() => {});
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(intervalId);
      unsubPresence();
      window.removeEventListener('beforeunload', handleUnload);
      deleteDoc(docRef).catch(() => {});
    };
  }, [isOffline]);

  const updatedTeams = useMemo(() => {
    return calculateRankings(teams, matches);
  }, [teams, matches]);

  const handleAuth = () => {
    if (isAdminAuthenticated) {
      setView('admin');
      return;
    }
    setShowAuthField(!showAuthField);
    setAuthError(false);
  };

  const submitAuth = () => {
    if (authCode === "Admin1@" || authCode === "Admin2@") {
      setIsAdminAuthenticated(true);
      setView('admin');
      setShowAuthField(false);
      setAuthCode('');
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      console.log("Starting full reset...");
      const teamsSnapshot = await getDocs(collection(db, COLLECTIONS.TEAMS));
      const matchesSnapshot = await getDocs(collection(db, COLLECTIONS.MATCHES));

      if (teamsSnapshot.empty && matchesSnapshot.empty) {
        alert("Aucune donnée à supprimer.");
        setLoading(false);
        return;
      }

      const batch = writeBatch(db);
      let count = 0;

      teamsSnapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
        count++;
      });
      
      matchesSnapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
        count++;
      });
      
      await batch.commit();
      setTeams([]);
      setMatches([]);
      setLoading(false);
      alert(`Succès: ${count} éléments ont été réinitialisés.`);
    } catch (error) {
      setLoading(false);
      console.error("Reset failed:", error);
      alert("Erreur lors de la réinitialisation: " + (error instanceof Error ? error.message : "Erreur"));
    }
  };

  // Seeding officiel : Supprime tout et injecte les classes JUB 2026
  const handleInitializeJUB = async () => {
    setLoading(true);
    try {
      console.log("Starting JUB 2026 Initialization...");
      
      // 1. Suppression des anciennes équipes
      const teamsSnapshot = await getDocs(collection(db, COLLECTIONS.TEAMS));
      const matchesSnapshot = await getDocs(collection(db, COLLECTIONS.MATCHES));
      
      const batch1 = writeBatch(db);
      teamsSnapshot.forEach(docSnap => batch1.delete(docSnap.ref));
      matchesSnapshot.forEach(docSnap => batch1.delete(docSnap.ref));
      await batch1.commit();
      
      console.log("Deleted old database records. Planting official calendar...");
      
      // 2. Écritures par lots
      const batch2 = writeBatch(db);
      OFFICIAL_JUB_TEAMS.forEach(t => {
        batch2.set(doc(db, COLLECTIONS.TEAMS, t.id), t);
      });
      OFFICIAL_JUB_MATCHES.forEach(m => {
        batch2.set(doc(db, COLLECTIONS.MATCHES, m.id), m);
      });
      await batch2.commit();
      
      console.log("Database seeded with JUB 2026 successfully!");
      alert("Calendrier JUB 2026 initialisé ! Toutes les équipes et tous les matchs ont été créés avec les dates et heures officielles conformément au règlement (avec qualification d'office pour FAST/NATITINGOU et matches de phase de groupes).");
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("JUB 2026 Init failed:", error);
      alert("Erreur lors de l'initialisation : " + (error instanceof Error ? error.message : "Erreur inconnue"));
    }
  };

  const deleteTeamAndMatches = async (id: string, teamName: string, sexe: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, COLLECTIONS.TEAMS, id));
      
      const matchesSnapshot = await getDocs(collection(db, COLLECTIONS.MATCHES));
      matchesSnapshot.forEach(mDoc => {
        const m = mDoc.data() as Match;
        if ((m.t1 === teamName || m.t2 === teamName) && m.sexe === sexe) {
          batch.delete(mDoc.ref);
        }
      });
      
      await batch.commit();
      alert(`L'équipe ${teamName} et ses matchs ont été supprimés.`);
    } catch (error) {
      console.error("Delete team failed:", error);
      alert("Erreur : " + (error instanceof Error ? error.message : "Erreur"));
    }
  };

  const deleteMatch = async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.MATCHES, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `match/${id}`);
    }
  };

  const updateTeamsFirestore = async (newTeams: Team[] | ((prev: Team[]) => Team[])) => {
    const updated = typeof newTeams === 'function' ? newTeams(teams) : newTeams;
    try {
      const batch = writeBatch(db);
      updated.forEach(t => {
        if (!t.id) return;
        batch.set(doc(db, COLLECTIONS.TEAMS, t.id), t);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.TEAMS);
    }
  };

  const updateMatchesFirestore = async (newMatches: Match[] | ((prev: Match[]) => Match[])) => {
    const updated = typeof newMatches === 'function' ? newMatches(matches) : newMatches;
    try {
      const batch = writeBatch(db);
      updated.forEach(m => {
        batch.set(doc(db, COLLECTIONS.MATCHES, m.id), m);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.MATCHES);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1a237e] border-t-[#2ecc71] rounded-full animate-spin"></div>
          <p className="font-bold text-slate-400 uppercase text-xs tracking-widest">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      {/* Absolute Admin Top Sticky Bar if Authenticated */}
      {isAdminAuthenticated && (
        <div className="bg-[#1a237e] text-white p-3 flex flex-col items-center justify-center text-center gap-2.5 text-[11px] font-bold shadow-md border-b-2 border-emerald-500 sticky top-0 z-40 animate-fade-in w-full">
          <div className="flex items-center justify-center gap-2 w-full">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="tracking-wide uppercase font-black text-amber-300">Administrateur active</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
            <button 
              onClick={() => setView('visitor')}
              className={`px-3 py-1.5 rounded-lg transition-all font-black uppercase tracking-wider text-[10px] cursor-pointer ${view === 'visitor' ? 'bg-[#2ecc71] text-white shadow-sm' : 'bg-white/10 text-slate-100 hover:bg-white/20'}`}
            >
              👁️ Vue Visiteur
            </button>
            <button 
              onClick={() => setView('admin')}
              className={`px-3 py-1.5 rounded-lg transition-all font-black uppercase tracking-wider text-[10px] cursor-pointer ${view === 'admin' ? 'bg-[#2ecc71] text-white shadow-sm' : 'bg-white/10 text-slate-100 hover:bg-white/20'}`}
            >
              ⚙️ Vue Administration
            </button>
            <button 
              onClick={() => {
                setIsAdminAuthenticated(false);
                setView('visitor');
              }}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-750 transition-all font-black uppercase tracking-wider text-[10px] cursor-pointer"
            >
              Déconnexion 🚪
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#1a237e] text-white py-12 px-4 text-center border-b-[6px] border-[#2ecc71] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -mr-20 -mt-20 select-none pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl -ml-20 -mb-20 select-none pointer-events-none"></div>
        
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          translate="no"
          className="notranslate text-lg sm:text-2xl md:text-3xl font-black uppercase tracking-widest leading-tight"
        >
          🏆 JEUX UNIVERSITAIRES DU BÉNIN (JUB) 🏆
        </motion.h1>
        
        <p className="text-[#2ecc71] font-extrabold uppercase tracking-widest text-[11px] sm:text-xs md:text-sm mt-2">
          PHASE ZONE 1 • DISCIPLINE : VOLLEY-BALL
        </p>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mt-4">
          <p className="text-blue-200 font-bold opacity-90 text-[11px] sm:text-xs">Jeux Universitaires du Bénin (JUB) • Tableau de bord officiel</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-6">
        {/* Offline Banner */}
        {isOffline && (
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 text-amber-800 rounded-2xl font-bold flex items-center gap-3 shadow-3xs animate-pulse">
            <span className="text-base select-none">📶</span>
            <div className="text-xs sm:text-sm">
              <p className="font-extrabold uppercase tracking-wide">Mode hors ligne actif</p>
              <p className="opacity-85 font-medium mt-0.5">Vous utilisez l'application sans connexion internet. Les scores se synchroniseront automatiquement dès votre retour en ligne.</p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorStatus && (
          <div className="mb-6 p-4 bg-red-100 border-2 border-red-200 text-red-700 rounded-2xl font-bold flex flex-col gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
              <p className="text-sm">⚠️ {errorStatus}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="text-[10px] uppercase tracking-widest bg-red-600 text-white py-1 px-3 rounded-lg self-start hover:bg-red-750 transition-colors"
            >
              Réessayer / Actualiser
            </button>
          </div>
        )}

        {/* Dashboards Wrapper */}
        <AnimatePresence mode="wait">
          {view === 'visitor' ? (
            <motion.div
              key="visitor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <VisitorDashboard 
                teams={updatedTeams} 
                matches={matches} 
              />
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <AdminDashboard 
                teams={teams} 
                setTeams={updateTeamsFirestore} 
                matches={matches} 
                setMatches={updateMatchesFirestore}
                onReset={handleReset}
                deleteTeam={deleteTeamAndMatches}
                deleteMatch={deleteMatch}
                onlineUsersCount={onlineUsersCount}
                onInitializeJUB={handleInitializeJUB} // Passed seed callback
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Admin Authorization Overlays Dialog */}
      <AnimatePresence>
        {showAuthField && !isAdminAuthenticated && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative border border-slate-100"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-black text-[#1a237e] uppercase tracking-wide">
                    🔒 Secrétariat Admin
                  </h3>
                  <p className="text-[10px] font-extrabold text-[#2ecc71] uppercase tracking-widest mt-0.5">Saisie officielle</p>
                </div>
                <button 
                  onClick={() => setShowAuthField(false)}
                  className="px-2.5 py-1 text-slate-400 hover:text-slate-600 font-bold text-[10px] bg-slate-100 rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Mot de passe de supervision</label>
                  <input 
                    type="password" 
                    placeholder="Saisir le Code d'Accès..."
                    value={authCode}
                    onChange={(e) => {
                      setAuthCode(e.target.value);
                      if (authError) setAuthError(false);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && submitAuth()}
                    className={`w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 font-bold transition-all text-sm ${
                      authError
                        ? 'border-red-400 text-red-700 bg-red-50 focus:border-red-600'
                        : 'border-slate-100 focus:border-[#2ecc71] text-slate-800'
                    }`}
                    autoFocus
                  />
                </div>
                
                {authError && (
                  <p className="text-red-600 text-[10px] sm:text-xs font-black uppercase tracking-wider px-1">
                    ⚠️ Code d'accès administrateur incorrect.
                  </p>
                )}
                
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => {
                      setShowAuthField(false);
                      setAuthCode('');
                      setAuthError(false);
                    }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={submitAuth}
                    className="flex-[2] py-3 bg-[#1a237e] hover:bg-indigo-950 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Se Connecter
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-16 text-center text-slate-400 text-xs py-12 border-t border-slate-200 bg-white flex flex-col items-center justify-center gap-3">
        <p>&copy; {new Date().getFullYear()} Jeux Universitaires du Bénin (JUB) • Zone 1. Tous droits réservés.</p>
        <button 
          onClick={handleAuth}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-950 transition-colors cursor-pointer flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-lg hover:border-slate-300 border border-slate-200/50"
        >
          🔐 ESPACE SECRÉTARIAT ADMINISTRATEUR
        </button>
      </footer>
    </div>
  );
}
