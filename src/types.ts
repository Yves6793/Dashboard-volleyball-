export interface Team {
  id: string;
  name: string;
  sexe: 'H' | 'F';
  poule: string;
  mj: number;
  mg: number;
  mp: number;
  sg: number;
  sp: number;
  pg: number;
  pp: number;
  pts: number;
  logo?: string;
  createdAt?: number;
}

export interface Match {
  id: string;
  t1: string;
  t2: string;
  sexe: 'H' | 'F';
  poule: string;
  type: 'POULE' | 'QUARTER' | 'SEMI' | 'FINAL' | 'THIRD_PLACE';
  label?: string;
  date: string;
  time: string;
  score: string;
  sets_detail: string;
  mvp: string;
  done: boolean;
  pg_t: number;
  pp_t: number;
  mvp_team?: string;
  mvp_dossard?: string;
}

export interface Presence {
  id: string;
  lastActive: number;
}
