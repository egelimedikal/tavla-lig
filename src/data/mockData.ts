import { Player, Match, League } from '@/types/league';

export const mockPlayers: Player[] = [
  { id: '1', name: 'Ahmet Yılmaz', phone: '5551234567' },
  { id: '2', name: 'Mehmet Demir', phone: '5552345678' },
  { id: '3', name: 'Ali Kaya', phone: '5553456789' },
  { id: '4', name: 'Mustafa Çelik', phone: '5554567890' },
  { id: '5', name: 'Hasan Öztürk', phone: '5555678901' },
  { id: '6', name: 'Hüseyin Arslan', phone: '5556789012' },
  { id: '7', name: 'İbrahim Şahin', phone: '5557890123' },
  { id: '8', name: 'Osman Aydın', phone: '5558901234' },
  { id: '9', name: 'Yusuf Yıldız', phone: '5559012345' },
  { id: '10', name: 'Kemal Koç', phone: '5550123456' },
  { id: '11', name: 'Serkan Eren', phone: '5551111111' },
  { id: '12', name: 'Burak Aksoy', phone: '5552222222' },
];

export const mockMatches: Match[] = [
  { id: 'm1', leagueId: 'super-a', player1Id: '1', player2Id: '2', score1: 7, score2: 5, date: '2024-01-15', winnerId: '1' },
  { id: 'm2', leagueId: 'super-a', player1Id: '1', player2Id: '3', score1: 6, score2: 7, date: '2024-01-16', winnerId: '3' },
  { id: 'm3', leagueId: 'super-a', player1Id: '2', player2Id: '3', score1: 8, score2: 4, date: '2024-01-17', winnerId: '2' },
  { id: 'm4', leagueId: 'super-a', player1Id: '4', player2Id: '5', score1: 7, score2: 6, date: '2024-01-18', winnerId: '4' },
  { id: 'm5', leagueId: 'super-a', player1Id: '1', player2Id: '4', score1: 9, score2: 3, date: '2024-01-19', winnerId: '1' },
  { id: 'm6', leagueId: 'super-a', player1Id: '2', player2Id: '5', score1: 5, score2: 7, date: '2024-01-20', winnerId: '5' },
  { id: 'm7', leagueId: 'super-a', player1Id: '3', player2Id: '6', score1: 8, score2: 6, date: '2024-01-21', winnerId: '3' },
  { id: 'm8', leagueId: 'super-b', player1Id: '7', player2Id: '8', score1: 6, score2: 7, date: '2024-01-15', winnerId: '8' },
  { id: 'm9', leagueId: 'super-b', player1Id: '9', player2Id: '10', score1: 8, score2: 5, date: '2024-01-16', winnerId: '9' },
  { id: 'm10', leagueId: 'super-b', player1Id: '7', player2Id: '9', score1: 7, score2: 7, date: '2024-01-17', winnerId: '7' },
];

export const leagues: League[] = [
  {
    id: 'super-a',
    name: 'Süper Lig A',
    players: mockPlayers.slice(0, 6),
    matches: mockMatches.filter(m => m.leagueId === 'super-a'),
  },
  {
    id: 'super-b',
    name: 'Süper Lig B',
    players: mockPlayers.slice(6, 12),
    matches: mockMatches.filter(m => m.leagueId === 'super-b'),
  },
  {
    id: 'lig1-a',
    name: '1. Lig A',
    players: mockPlayers.slice(0, 6),
    matches: [],
  },
  {
    id: 'lig1-b',
    name: '1. Lig B',
    players: mockPlayers.slice(6, 12),
    matches: [],
  },
];
