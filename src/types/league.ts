export interface Player {
  id: string;
  name: string;
  phone?: string;
  avatar?: string;
}

export interface Match {
  id: string;
  leagueId: string;
  player1Id: string;
  player2Id: string;
  score1: number;
  score2: number;
  date: string;
  winnerId: string;
}

export interface PlayerStats {
  playerId: string;
  player: Player;
  played: number; // O - Oynadığı
  won: number; // G - Galibiyet
  lost: number; // M - Mağlubiyet
  scored: number; // A - Attığı
  conceded: number; // Y - Yediği
  average: number; // Av - Averaj
  points: number; // Puan
}

export interface League {
  id: string;
  name: string;
  players: Player[];
  matches: Match[];
}

export type LeagueTab = 'super-a' | 'super-b' | 'lig1-a' | 'lig1-b';
