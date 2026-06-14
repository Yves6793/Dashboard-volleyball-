import React, { useState, useRef } from 'react';
import { Medal, Download, Trophy, Image as ImageIcon, X } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { Match, Team } from '../types';
import { resolveMatchTeams } from '../logic';

export const isImageLogo = (logo?: string): boolean => {
  if (!logo) return false;
  const l = logo.trim();
  return l.startsWith('http') || l.startsWith('data:') || l.includes('.') || l.includes('/') || l.length > 10;
};

export const normalizeTeamName = (name: string): string => {
  return name.trim().toLowerCase().replace(/_/g, ' ');
};

interface MatchCardProps {
  match: Match;
  teams?: Team[];
  showLogos?: boolean;
  matches?: Match[];
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, teams = [], showLogos = true, matches = [] }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [isDownloadingPoster, setIsDownloadingPoster] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  const isPlayoff = match.type !== 'POULE';

  // Dynamically resolve team names
  const resolved = resolveMatchTeams(match, matches, teams);

  // Find corresponding team objects with case-insensitive and space-trimmed matching using resolved names
  const t1Data = teams.find(t => normalizeTeamName(t.name) === normalizeTeamName(resolved.t1) && t.sexe === match.sexe);
  const t2Data = teams.find(t => normalizeTeamName(t.name) === normalizeTeamName(resolved.t2) && t.sexe === match.sexe);

  const logo1 = t1Data?.logo;
  const logo2 = t2Data?.logo;

  // Custom styling attributes depending on match types and export state
  let cardClass = "";

  if (isPlayoff) {
    if (match.type === 'FINAL') {
      cardClass = isExporting
        ? "bg-white border-4 border-amber-400 p-8 rounded-3xl"
        : "relative overflow-hidden bg-linear-to-br from-amber-500/10 via-white to-amber-500/5 border-2 border-amber-400 p-5 mb-4 rounded-2xl shadow-md border-l-[10px] border-amber-500 transition-all hover:shadow-lg";
    } else if (match.type === 'SEMI') {
      cardClass = isExporting
        ? "bg-white border-4 border-indigo-400 p-8 rounded-3xl"
        : "relative overflow-hidden bg-linear-to-br from-indigo-500/10 via-white to-indigo-500/5 border-2 border-indigo-400 p-5 mb-4 rounded-2xl shadow-sm border-l-[10px] border-[#1a237e] transition-all hover:shadow-md";
    } else if (match.type === 'THIRD_PLACE') {
      cardClass = isExporting
        ? "bg-white border-4 border-orange-400 p-8 rounded-3xl"
        : "relative overflow-hidden bg-linear-to-br from-orange-500/10 via-white to-orange-500/5 border-2 border-orange-300 p-5 mb-4 rounded-2xl shadow-sm border-l-[10px] border-orange-500 transition-all hover:shadow-md";
    } else {
      cardClass = isExporting
        ? "bg-white border-4 border-slate-400 p-8 rounded-3xl"
        : "relative overflow-hidden bg-slate-50/50 border-2 border-slate-300 p-5 mb-4 rounded-2xl shadow-xs border-l-[10px] border-slate-600 transition-all hover:shadow-sm";
    }
  } else {
    cardClass = isExporting
      ? "bg-white border-4 border-[#1a237e] p-8 rounded-3xl"
      : "relative bg-white border-l-[10px] border-[#1a237e] p-5 mb-4 rounded-xl shadow-xs border border-slate-100 transition-all hover:shadow-md";
  }

  const handleDownloadPoster = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloadingPoster) return;
    try {
      setIsDownloadingPoster(true);
      // Wait for React to render and stabilize
      await new Promise(resolve => setTimeout(resolve, 310));
      
      if (posterRef.current) {
        // Capture at perfect resolution preserving natural aspect ratios and margins on all screen sizes
        const dataUrl = await htmlToImage.toPng(posterRef.current, {
          quality: 1.0,
          backgroundColor: '#ffffff',
          pixelRatio: 2.0, // Stable pixelRatio avoids zoom in/out/crop bugs
          width: 440,
          height: 740,
          style: {
            transform: 'none',
            margin: '0',
            padding: '24px',
            boxSizing: 'border-box',
          }
        });
        
        const link = document.createElement('a');
        link.download = `Affiche_Officielle_JUB_${resolved.t1}_vs_${resolved.t2}_${match.date || 'Resultat'}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Exporting poster failed:', err);
      alert("L'exportation de l'affiche officielle a échoué. Veuillez réessayer. Sur certains appareils mobiles, ouvrez le lien dans un nouvel onglet.");
    } finally {
      setIsDownloadingPoster(false);
    }
  };

  let badgeEl = null;
  const isAller = match.id.toLowerCase().includes('aller') || (match.label || '').toLowerCase().includes('aller');
  const isRetour = match.id.toLowerCase().includes('retour') || (match.label || '').toLowerCase().includes('retour');

  if (isAller) {
    badgeEl = (
      <span className="bg-indigo-600 text-white font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-xs animate-pulse">
        🏠 MATCH ALLER
      </span>
    );
  } else if (isRetour) {
    badgeEl = (
      <span className="bg-emerald-600 text-white font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-xs">
        ✈️ MATCH RETOUR
      </span>
    );
  } else if (isPlayoff) {
    if (match.type === 'FINAL') {
      badgeEl = (
        <span className="bg-amber-500 text-white font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-xs">
          🏆 GRANDE FINALE
        </span>
      );
    } else if (match.type === 'SEMI') {
      badgeEl = (
        <span className="bg-[#1a237e] text-white font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-xs">
          🔥 DEMI-FINALE
        </span>
      );
    } else if (match.type === 'THIRD_PLACE') {
      badgeEl = (
        <span className="bg-orange-600 text-white font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-xs">
          🥉 PETITE FINALE
        </span>
      );
    } else {
      badgeEl = (
        <span className="bg-slate-700 text-white font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-xs">
          ⚡ QUART DE FINALE
        </span>
      );
    }
  }

  return (
    <div ref={cardRef} className={`${cardClass} transition-shadow relative bg-white`}>
      
      {/* Premium header visible ONLY in exports */}
      {isExporting && (
        <div translate="no" className="bg-gradient-to-r from-[#1a237e] to-[#3949ab] text-white p-6 rounded-2xl mb-6 text-center shadow-md notranslate">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <span className="text-2xl">🏆</span>
            <h2 className="text-sm font-black tracking-widest uppercase">JEUX UNIVERSITAIRES DU BÉNIN (JUB)</h2>
          </div>
          <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest">PHASE ZONE 1 • VOLLEY-BALL</p>
          <div className="text-[9px] text-blue-100 opacity-90 mt-2.5 font-bold tracking-widest border-t border-white/10 pt-2 w-fit mx-auto px-4 uppercase">
            {match.date ? new Date(match.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'DATE NON COMMUNIQUÉE'} à {match.time || '--:--'}
          </div>
        </div>
      )}

      {/* Normal Header of the Match Card */}
      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-wider">
        <div className="flex items-center gap-2">
          {badgeEl ? badgeEl : (
            <span className="bg-slate-100 px-2 py-0.5 rounded italic">
              {(match.label && !match.label.toUpperCase().includes('POULE')) ? match.label : (match.time || '--:--')}
            </span>
          )}
          {badgeEl && match.label && (
            <span className="bg-slate-100 font-bold text-slate-500 px-1.5 py-0.5 rounded text-[8px] tracking-wide">
              {match.time || '--:--'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full ${match.sexe === 'H' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
            {match.sexe === 'H' ? '♂️ Hommes' : '♀️ Dames'}
          </span>
          <span className="bg-slate-100 px-2 py-0.5 rounded-full">
            {match.poule === 'FINAL' || match.poule === 'DAME' ? 'Phase Finale' : `Poule ${match.poule}`}
          </span>
        </div>
      </div>

      {/* Unified opponents and score (Logo displayed inline if defined, else text only block) */}
      <div className={`flex items-center justify-between gap-1.5 md:gap-4 ${isExporting ? 'py-6 md:py-10' : 'py-3 md:py-8'}`}>
        
        {/* Team 1 Banner */}
        <div className="flex-1 min-w-0 text-center">
          <div className={`inline-flex items-center justify-center gap-1.5 sm:gap-3 w-full px-2 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 rounded-lg md:rounded-2xl bg-[#1a237e]/5 border border-indigo-100/50 font-extrabold text-[#1a237e] text-xs sm:text-sm md:text-2xl leading-tight shadow-3xs truncate ${isExporting ? 'bg-indigo-50/50 text-[#1a237e] text-xl border-indigo-100' : ''}`}>
            {logo1 && (
              <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex items-center justify-center shrink-0 overflow-hidden bg-white border border-indigo-100/60 rounded-full shadow-3xs p-0.5 select-none animate-fade-in">
                {isImageLogo(logo1) ? (
                  <img src={logo1} alt="" className="w-full h-full object-contain rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-[10px] sm:text-xs md:text-sm leading-none font-extrabold text-slate-800">{logo1}</span>
                )}
              </div>
            )}
            <span translate="no" className="notranslate truncate">{resolved.t1}</span>
          </div>
        </div>
        
        {/* Score Column with enlarged font size (example: 2-3) */}
        <div className="flex-none flex flex-col items-center px-1 sm:px-4">
          <div 
            translate="no" 
            className={`notranslate px-4 py-2 sm:px-8 sm:py-3.5 md:px-10 md:py-5 rounded-xl md:rounded-2xl font-black text-lg sm:text-2xl md:text-5xl tracking-normal shadow-md border ${
              match.done ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm font-extrabold' : 'bg-slate-50 text-slate-300 border-slate-200'
            }`}
          >
            {match.done ? match.score : 'VS'}
          </div>
        </div>

        {/* Team 2 Banner */}
        <div className="flex-1 min-w-0 text-center">
          <div className={`inline-flex items-center justify-center gap-1.5 sm:gap-3 w-full px-2 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 rounded-lg md:rounded-2xl bg-[#1a237e]/5 border border-indigo-100/50 font-extrabold text-[#1a237e] text-xs sm:text-sm md:text-2xl leading-tight shadow-3xs truncate ${isExporting ? 'bg-indigo-50/50 text-[#1a237e] text-xl border-indigo-100' : ''}`}>
            {logo2 && (
              <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex items-center justify-center shrink-0 overflow-hidden bg-white border border-indigo-100/60 rounded-full shadow-3xs p-0.5 select-none animate-fade-in">
                {isImageLogo(logo2) ? (
                  <img src={logo2} alt="" className="w-full h-full object-contain rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-[10px] sm:text-xs md:text-sm leading-none font-extrabold text-slate-800">{logo2}</span>
                )}
              </div>
            )}
            <span translate="no" className="notranslate truncate">{resolved.t2}</span>
          </div>
        </div>
      </div>

      {/* Sets and MVP details */}
      {match.done && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-center text-xs md:text-sm font-bold text-slate-400 mb-4 tracking-widest uppercase flex items-center justify-center gap-2">
            <div className="h-[1px] w-6 bg-slate-100"></div>
            Score des <span translate="no" className="notranslate">Sets</span>
            <div className="h-[1px] w-6 bg-slate-100"></div>
          </div>
          <div className="flex justify-center flex-wrap gap-1 md:gap-2 mb-6">
            {(match.sets_detail || '').split(',').map((set, idx) => (
              <div key={idx} className="bg-[#1a237e] text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs md:text-sm shadow-xs flex items-center gap-1">
                <span translate="no" className="notranslate text-[7px] sm:text-[9px] opacity-70 uppercase tracking-wider bg-white/10 px-1 py-0.5 rounded-sm shrink-0">S{idx+1}</span>
                <span translate="no" className="notranslate whitespace-nowrap tabular-nums">{set.trim()}</span>
              </div>
            ))}
          </div>
          {match.mvp && (
            <div className="flex justify-center mt-2">
              <div className="inline-flex flex-col items-center gap-1.5 bg-[#f1c40f]/20 text-[#856404] px-6 py-4 rounded-2xl md:rounded-[2rem] text-xs sm:text-sm md:text-lg font-black uppercase ring-2 md:ring-4 ring-[#f1c40f]/30 shadow-lg animate-in zoom-in-50 duration-300 text-center">
                <div className="flex items-center gap-2">
                  <Medal size={20} className="text-[#f1c40f] drop-shadow-sm" />
                  <span className="notranslate tracking-tight text-amber-950 font-black">🌟 MVP DU MATCH 🌟</span>
                </div>
                <div className="text-sm md:text-xl font-extrabold text-[#7b5c00] tracking-wide mt-1">
                  {match.mvp}
                </div>
                {(match.mvp_team || match.mvp_dossard) && (
                  <div className="text-sm md:text-base text-amber-950 border-t border-[#f1c40f]/40 pt-2.5 mt-3.5 font-black flex flex-wrap items-center justify-center gap-3">
                    {match.mvp_team && (
                      <span translate="no" className="notranslate bg-amber-500/30 px-4 py-1.5 rounded-full whitespace-nowrap">
                        🏃‍♂️ {match.mvp_team}
                      </span>
                    )}
                    {match.mvp_dossard && (
                      <span className="bg-amber-600/30 px-4 py-1.5 rounded-full whitespace-nowrap font-mono font-black">
                        👕 N°{match.mvp_dossard}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Signature Watermark visible ONLY in exports */}
      {isExporting && (
        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
            DASHBOARD OFFICIEL • JEUX UNIVERSITAIRES DU BÉNIN (JUB)
          </p>
        </div>
      )}

       {/* Action panel inside the card containing download and poster button */}
      {!isExporting && (
        <div className="hide-on-export flex flex-wrap justify-end items-center mt-3 pt-3 gap-2 border-t border-slate-50">
          <button
            type="button"
            onClick={() => setShowPosterModal(true)}
            className="inline-flex items-center gap-1.5 py-1.5 px-4 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-lg transition-all active:scale-95 text-[10px] font-black uppercase tracking-wider shadow-3xs cursor-pointer border border-indigo-100/60"
            title="Afficher l'affiche artistique et officielle pour partage"
          >
            <span className="text-xs">🎴</span>
            Générer / Voir l'Affiche
          </button>
        </div>
      )}

      {/* Hidden off-screen high-fidelity target solely used for pristine image generation */}
      <div 
        style={{ 
          position: 'fixed', 
          left: '-9999px', 
          top: '0', 
          zIndex: -9999,
          pointerEvents: 'none',
          visibility: 'visible',
          width: '440px',
          height: '740px'
        }}
      >
        {(() => {
          const logo1 = t1Data?.logo;
          const logo2 = t2Data?.logo;
          return (
            <div 
              ref={posterRef}
              className="relative bg-white text-center flex flex-col items-center justify-between select-none pointer-events-none"
              style={{
                width: '440px',
                height: '740px',
                padding: '24px',
                border: '14px solid #f1c40f',
                borderRadius: '40px',
                boxSizing: 'border-box'
              }}
            >
                {/* Yellow/Orange outer label decoration */}
                <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#f1c40f] hover:bg-amber-500 text-[#1a237e] uppercase font-black tracking-widest text-[8px] px-4 py-1.5 rounded-full shadow-xs leading-none">
                  SPORT UNIVERSITAIRE
                </span>

                {/* Top Blue Header Block */}
                <div translate="no" className="notranslate bg-[#1b2582] text-white p-6 rounded-[32px] w-full shadow-lg relative overflow-hidden mb-5 mt-2 flex flex-col items-center select-none">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl -mr-10 -mt-10 pointer-events-none"></div>
                  
                  <div className="flex items-center justify-center gap-4 w-full mb-3 mt-1 px-4 select-none">
                    <Trophy size={42} className="text-[#f1c40f] drop-shadow-md shrink-0 animate-bounce" />
                    <div className="text-left flex flex-col">
                      <span className="text-xs font-black leading-none text-white uppercase tracking-wider">
                        JEUX
                      </span>
                      <span className="text-xl font-black leading-tight text-white uppercase tracking-wider">
                        UNIVERSITAIRES
                      </span>
                      <span className="text-xs font-black leading-none text-white uppercase tracking-wider">
                        DU BÉNIN (JUB)
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-[11px] text-[#2ecc71] font-black uppercase tracking-widest text-center mt-2">
                    PHASE ZONE 1 • VOLLEY-BALL
                  </div>
                  <div className="h-[1.5px] w-2/3 bg-white/10 my-3"></div>
                  
                  <div className="text-[10px] text-blue-150 font-black tracking-widest uppercase bg-white/15 px-4 py-1 rounded-full border border-white/5">
                    {match.date ? new Date(match.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'DATE NON COMMUNIQUÉE'}
                    {match.time ? ` À ${match.time}` : ''}
                  </div>
                </div>

                {/* Category & Status Pills Row */}
                <div className="flex items-center justify-center gap-3 mb-2 w-full select-none flex-wrap">
                  <span className="bg-[#007afc] text-white font-black text-[11px] px-5 py-2.5 rounded-full uppercase tracking-wider shadow-3xs leading-none">
                    {match.sexe === 'H' ? '♂ HOMMES' : '♀ DAMES'}
                  </span>
                  <span className="bg-[#54759e] text-white font-black text-[11px] px-5 py-2.5 rounded-full uppercase tracking-wider shadow-3xs leading-none">
                    {match.poule === 'FINAL' || match.poule === 'DAME' ? 'PHASE FINALE' : `POULE ${match.poule}`}
                  </span>
                  {(() => {
                    const isAller = match.id.toLowerCase().includes('aller') || (match.label || '').toLowerCase().includes('aller');
                    const isRetour = match.id.toLowerCase().includes('retour') || (match.label || '').toLowerCase().includes('retour');
                    if (isAller) return <span className="bg-indigo-600 text-white font-black text-[11px] px-5 py-2.5 rounded-full uppercase tracking-wider shadow-3xs leading-none">MATCH ALLER</span>;
                    if (isRetour) return <span className="bg-emerald-600 text-white font-black text-[11px] px-5 py-2.5 rounded-full uppercase tracking-wider shadow-3xs leading-none">MATCH RETOUR</span>;
                    return null;
                  })()}
                </div>

                {/* Venue / Location badge under category pills */}
                <div className="mb-6 w-full select-none flex justify-center">
                  <span className="bg-slate-100 text-slate-700 font-extrabold text-[9px] px-5.5 py-1.5 rounded-full uppercase tracking-widest border border-slate-200/40 shadow-3xs">
                    TERRAIN VOLLEYBALL UP
                  </span>
                </div>

                {/* Opponents and Score Area */}
                <div className="flex items-center justify-between gap-2.5 w-full py-4 select-none relative px-1">
                  
                  {/* Left opponent */}
                  {logo1 ? (
                    <div className="flex-1 flex flex-col items-center min-w-0">
                      <div className="w-20 h-20 rounded-full bg-white border border-slate-200 p-1.5 flex items-center justify-center shadow-lg shrink-0 relative">
                        {isImageLogo(logo1) ? (
                          <img src={logo1} alt="" className="w-full h-full object-contain rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-2xl leading-none font-black text-[#1b2582] select-none">{logo1}</span>
                        )}
                      </div>
                      <span translate="no" className="notranslate text-xs font-extrabold text-[#1a237e] uppercase tracking-wider mt-2.5 text-center block truncate max-w-[120px]">
                        {resolved.t1}
                      </span>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center min-w-0">
                      <div className="w-full h-20 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center px-3 shadow-3xs">
                        <span translate="no" className="notranslate text-xs font-black text-[#1b2582] uppercase tracking-wider text-center leading-snug overflow-hidden line-clamp-2">
                          {resolved.t1}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Score Pill / VS */}
                  <div className="flex-none flex flex-col items-center justify-center">
                    <div className={`px-5 py-2 rounded-2xl font-black text-xl tracking-tight shadow-md border ${
                      match.done ? 'bg-[#e2f0d9] text-[#385723] border-[#c5e0b4] font-black' : 'bg-slate-50 text-slate-300 border-slate-200'
                    }`}>
                      {match.done ? match.score : 'VS'}
                    </div>
                  </div>

                  {/* Right opponent */}
                  {logo2 ? (
                    <div className="flex-1 flex flex-col items-center min-w-0">
                      <div className="w-20 h-20 rounded-full bg-white border border-slate-200 p-1.5 flex items-center justify-center shadow-lg shrink-0 relative">
                        {isImageLogo(logo2) ? (
                          <img src={logo2} alt="" className="w-full h-full object-contain rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-2xl leading-none font-black text-[#1b2582] select-none">{logo2}</span>
                        )}
                      </div>
                      <span translate="no" className="notranslate text-xs font-extrabold text-[#1a237e] uppercase tracking-wider mt-2.5 text-center block truncate max-w-[120px]">
                        {resolved.t2}
                      </span>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center min-w-0">
                      <div className="w-full h-20 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center px-3 shadow-3xs">
                        <span translate="no" className="notranslate text-xs font-black text-[#1b2582] uppercase tracking-wider text-center leading-snug overflow-hidden line-clamp-2">
                          {resolved.t2}
                        </span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Subtitle Sets or detail */}
                <div className="w-full mt-4 flex-1 flex flex-col justify-center select-none">
                  {match.done ? (
                    <div className="border-t border-slate-100 pt-4 w-full">
                      {match.sets_detail && (
                        <>
                          <div className="text-center text-xs font-black text-[#54759e] uppercase tracking-widest mb-4 flex items-center justify-center gap-4">
                            <div className="h-[1.5px] w-12 bg-slate-200"></div>
                            SCORE DES SETS
                            <div className="h-[1.5px] w-12 bg-slate-200"></div>
                          </div>
                          <div className="flex justify-center flex-wrap gap-1.5 mb-4">
                            {match.sets_detail.split(',').map((set, sIdx) => (
                              <div key={sIdx} className="bg-[#1b2582] text-white px-3 py-2 rounded-xl font-black text-[11px] shadow-sm flex items-center gap-1.5">
                                <span className="text-[7.5px] opacity-75 uppercase tracking-wider bg-white/10 px-1 py-0.5 rounded-sm shrink-0">S{sIdx+1}</span>
                                <span className="whitespace-nowrap font-mono font-black">{set.trim()}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {match.mvp && (
                        <div className="w-full bg-[#fdfaf2] border-2 border-[#f3d070] px-6 py-5 rounded-[32px] shadow-xs max-w-[320px] mx-auto select-none mt-4 flex flex-col items-center">
                          <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[#a16207]">
                            🏆 🌟 MVP DU MATCH 🌟
                          </div>
                          <div className="w-full h-[1.5px] bg-[#f3d070]/60 my-3"></div>
                          <h3 className="font-serif text-3xl font-bold text-slate-800 tracking-wide mb-3">
                            {match.mvp}
                          </h3>
                          <div className="flex flex-col gap-2 w-full items-center">
                            {match.mvp_team && (
                              <div className="bg-[#fbcfe8]/40 text-[#be185d] border border-[#fbcfe8] text-xs font-black py-1.5 px-5 rounded-full flex items-center justify-center gap-1">
                                🏃 {match.mvp_team}
                              </div>
                            )}
                            {match.mvp_dossard && (
                              <div className="bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd] text-xs font-black py-1.5 px-5 rounded-full flex items-center justify-center gap-1">
                                👕 N°{match.mvp_dossard}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center justify-center text-slate-300">
                      <span className="text-2xl opacity-40 mb-1 select-none">🏐</span>
                      <p className="text-[10px] font-black uppercase tracking-wider">Rencontre à suivre</p>
                    </div>
                  )}
                </div>

                {/* Subtitle Foot Signature */}
                <div className="mt-6 pt-4 border-t border-slate-100 w-full text-center">
                  <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase mb-0.5 select-none leading-none">
                    DASHBOARD OFFICIEL • JEUX UNIVERSITAIRES DU BÉNIN (JUB)
                  </p>
                </div>
              </div>
            );
          })()}
      </div>

      {/* Premium Poster Medal Modal Overlay */}
      {showPosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-md overflow-y-auto">
          <div className="relative max-w-md w-full bg-slate-950 p-4 sm:p-6 rounded-[32px] sm:rounded-[44px] shadow-2xl flex flex-col items-center border border-white/20 my-4 sm:my-8 animate-fade-in">
            
            {/* Modal Heading & Close button */}
            <div className="flex w-full justify-between items-center px-4 mb-4 select-none">
              <div className="text-left">
                <span className="text-[10px] font-black tracking-widest bg-yellow-400/20 text-yellow-400 px-3 py-1 rounded-full uppercase leading-none select-none">
                  AFFICHE OFFICIELLE JUB
                </span>
                <p className="text-white text-xs font-bold uppercase tracking-wider mt-1 select-none">Aperçu Avant-Match • Résultat</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPosterModal(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-95 cursor-pointer border-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Poster Responsive Preview Container which fits small screen beautifully */}
            <div className="w-full flex justify-center pb-2 select-none">
              {(() => {
                const logo1 = t1Data?.logo;
                const logo2 = t2Data?.logo;
                return (
                  <div 
                    className="relative bg-white text-center flex flex-col items-center justify-between select-none pointer-events-none w-full max-w-[340px] border-[10px] border-[#f1c40f] rounded-[32px] p-4.5"
                    style={{ minHeight: '520px' }}
                  >
                    {/* Yellow/Orange outer label decoration */}
                    <span className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-[#f1c40f] text-[#1a237e] uppercase font-black tracking-widest text-[6.5px] px-3 py-1 rounded-full shadow-3xs leading-none whitespace-nowrap scale-95">
                      SPORT UNIVERSITAIRE
                    </span>

                    {/* Top Blue Header Block */}
                    <div translate="no" className="notranslate bg-[#1b2582] text-white p-4 rounded-[24px] w-full shadow-md relative overflow-hidden mb-4 mt-1 flex flex-col items-center select-none">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-lg -mr-8 -mt-8 pointer-events-none"></div>
                      
                      <div className="flex items-center justify-center gap-2.5 w-full mb-2 mt-0.5 px-3 select-none">
                        <Trophy size={28} className="text-[#f1c40f] drop-shadow-sm shrink-0 animate-bounce" />
                        <div className="text-left flex flex-col">
                          <span className="text-[9px] font-black leading-none text-white uppercase tracking-wider">
                            JEUX
                          </span>
                          <span className="text-sm font-black leading-tight text-white uppercase tracking-wider">
                            UNIVERSITAIRES
                          </span>
                          <span className="text-[9px] font-black leading-none text-white uppercase tracking-wider">
                            DU BÉNIN (JUB)
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-[9px] text-[#2ecc71] font-black uppercase tracking-widest text-center mt-1">
                        PHASE ZONE 1 • VOLLEY-BALL
                      </div>
                      <div className="h-[1px] w-2/3 bg-white/10 my-2"></div>
                      
                      <div className="text-[8.5px] text-blue-150 font-black tracking-widest uppercase bg-white/15 px-3 py-0.5 rounded-full border border-white/5">
                        {match.date ? new Date(match.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'DATE NON COMMUNIQUÉE'}
                        {match.time ? ` À ${match.time}` : ''}
                      </div>
                    </div>

                    {/* Category & Status Pills Row */}
                    <div className="flex items-center justify-center gap-2 mb-1.5 w-full select-none flex-wrap">
                      <span className="bg-[#007afc] text-white font-black text-[9px] px-4 py-2 rounded-full uppercase tracking-wider shadow-3xs leading-none">
                        {match.sexe === 'H' ? '♂ HOMMES' : '♀ DAMES'}
                      </span>
                      <span className="bg-[#54759e] text-white font-black text-[9px] px-4 py-2 rounded-full uppercase tracking-wider shadow-3xs leading-none">
                        {match.poule === 'FINAL' || match.poule === 'DAME' ? 'PHASE FINALE' : `POULE ${match.poule}`}
                      </span>
                      {(() => {
                        const isAller = match.id.toLowerCase().includes('aller') || (match.label || '').toLowerCase().includes('aller');
                        const isRetour = match.id.toLowerCase().includes('retour') || (match.label || '').toLowerCase().includes('retour');
                        if (isAller) return <span className="bg-indigo-600 text-white font-black text-[9px] px-4 py-2 rounded-full uppercase tracking-wider shadow-3xs leading-none">MATCH ALLER</span>;
                        if (isRetour) return <span className="bg-emerald-600 text-white font-black text-[9px] px-4 py-2 rounded-full uppercase tracking-wider shadow-3xs leading-none">MATCH RETOUR</span>;
                        return null;
                      })()}
                    </div>

                    {/* Venue / Location badge under category pills */}
                    <div className="mb-4 w-full select-none flex justify-center">
                      <span className="bg-slate-100 text-slate-700 font-extrabold text-[8px] px-4 py-1 rounded-full uppercase tracking-widest border border-slate-200/40 shadow-3xs">
                        TERRAIN VOLLEYBALL UP
                      </span>
                    </div>

                    {/* Opponents and Score Area */}
                    <div className="flex items-center justify-between gap-1.5 w-full py-2.5 select-none relative px-0.5">
                      
                      {/* Left opponent */}
                      {logo1 ? (
                        <div className="flex-1 flex flex-col items-center min-w-0">
                          <div className="w-14 h-14 rounded-full bg-white border border-slate-200 p-1 flex items-center justify-center shadow-md shrink-0 relative">
                            {isImageLogo(logo1) ? (
                              <img src={logo1} alt="" className="w-full h-full object-contain rounded-full" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-lg leading-none font-black text-[#1b2582] select-none">{logo1}</span>
                            )}
                          </div>
                          <span translate="no" className="notranslate text-[10px] font-black text-[#1a237e] uppercase tracking-wider mt-1.5 text-center block truncate max-w-[90px]">
                            {resolved.t1}
                          </span>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center min-w-0">
                          <div className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center px-1 shadow-3xs">
                            <span translate="no" className="notranslate text-[10px] font-black text-[#1b2582] uppercase tracking-wider text-center leading-snug overflow-hidden line-clamp-2">
                              {resolved.t1}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Score Pill / VS */}
                      <div className="flex-none flex flex-col items-center justify-center">
                        <div className={`px-3 py-1 rounded-lg font-black text-sm tracking-tight shadow-sm border ${
                          match.done ? 'bg-[#e2f0d9] text-[#385723] border-[#c5e0b4] font-black' : 'bg-slate-50 text-slate-300 border-slate-200'
                        }`}>
                          {match.done ? match.score : 'VS'}
                        </div>
                      </div>

                      {/* Right opponent */}
                      {logo2 ? (
                        <div className="flex-1 flex flex-col items-center min-w-0">
                          <div className="w-14 h-14 rounded-full bg-white border border-slate-200 p-1 flex items-center justify-center shadow-md shrink-0 relative">
                            {isImageLogo(logo2) ? (
                              <img src={logo2} alt="" className="w-full h-full object-contain rounded-full" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-lg leading-none font-black text-[#1b2582] select-none">{logo2}</span>
                            )}
                          </div>
                          <span translate="no" className="notranslate text-[10px] font-black text-[#1a237e] uppercase tracking-wider mt-1.5 text-center block truncate max-w-[90px]">
                            {resolved.t2}
                          </span>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center min-w-0">
                          <div className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center px-1 shadow-3xs">
                            <span translate="no" className="notranslate text-[10px] font-black text-[#1b2582] uppercase tracking-wider text-center leading-snug overflow-hidden line-clamp-2">
                              {resolved.t2}
                            </span>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Subtitle Sets or detail */}
                    <div className="w-full mt-3 flex-1 flex flex-col justify-center select-none">
                      {match.done ? (
                        <div className="border-t border-slate-100 pt-3 w-full">
                          {match.sets_detail && (
                            <>
                              <div className="text-center text-[9px] font-black text-[#54759e] uppercase tracking-widest mb-2.5 flex items-center justify-center gap-2">
                                <div className="h-[1px] w-8 bg-slate-200"></div>
                                SCORE DES SETS
                                <div className="h-[1px] w-8 bg-slate-200"></div>
                              </div>
                              <div className="flex justify-center flex-wrap gap-1 mb-2">
                                {match.sets_detail.split(',').map((set, sIdx) => (
                                  <div key={sIdx} className="bg-[#1b2582] text-white px-2 py-1 rounded-lg font-black text-[9px] shadow-3xs flex items-center gap-1">
                                    <span className="text-[6px] opacity-75 uppercase tracking-wider bg-white/10 px-0.5 rounded-sm shrink-0">S{sIdx+1}</span>
                                    <span className="whitespace-nowrap font-mono font-black">{set.trim()}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}

                          {match.mvp && (
                            <div className="w-full bg-[#fdfaf2] border border-[#f3d070] px-4 py-3 rounded-2xl shadow-3xs max-w-[260px] mx-auto select-none mt-2 flex flex-col items-center">
                              <div className="flex items-center gap-1 text-[9px] font-black uppercase text-[#a16207]">
                                🏆 MVP DU MATCH
                              </div>
                              <div className="w-full h-[1px] bg-[#f3d070]/60 my-1.5"></div>
                              <h3 className="text-xs font-black text-slate-800 tracking-wide text-center uppercase mb-1 truncate max-w-full">
                                {match.mvp}
                              </h3>
                              <div className="flex gap-1 items-center justify-center flex-wrap">
                                {match.mvp_team && (
                                  <div className="bg-[#fbcfe8]/40 text-[#be185d] border border-[#fbcfe8] text-[8px] font-black py-0.5 px-2 rounded-full leading-none">
                                    🏃 {match.mvp_team}
                                  </div>
                                )}
                                {match.mvp_dossard && (
                                  <div className="bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd] text-[8px] font-black py-0.5 px-2 rounded-full leading-none">
                                    👕 N°{match.mvp_dossard}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-4 flex flex-col items-center justify-center text-slate-300">
                          <span className="text-lg opacity-40 mb-0.5 select-none">🏐</span>
                          <p className="text-[8px] font-black uppercase tracking-wider">Rencontre à suivre</p>
                        </div>
                      )}
                    </div>

                    {/* Subtitle Foot Signature */}
                    <div className="mt-4 pt-3 border-t border-slate-100 w-full text-center">
                      <p className="text-[7.5px] font-black text-slate-400 tracking-widest uppercase mb-0 select-none leading-none">
                        DASHBOARD OFFICIEL • JEUX UNIVERSITAIRES DU BÉNIN (JUB)
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Downloader Action Panel */}
            <div className="flex gap-2 w-full mt-4 bg-slate-900 p-3 rounded-2xl border border-white/5">
              <button
                type="button"
                onClick={() => setShowPosterModal(false)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer text-center outline-none border-0"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleDownloadPoster}
                disabled={isDownloadingPoster}
                className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer outline-none border-0"
              >
                <Download size={14} className={isDownloadingPoster ? "animate-bounce" : ""} />
                {isDownloadingPoster ? "Génération..." : "Télécharger l'Affiche (PNG)"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
