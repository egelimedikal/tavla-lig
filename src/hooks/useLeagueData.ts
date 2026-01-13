import { useState, useCallback, useMemo } from 'react';
import { leagues as initialLeagues, mockPlayers } from '@/data/mockData';
import { League, Match, Player, PlayerStats, LeagueTab } from '@/types/league';

export function useLeagueData() {
  const [leagues, setLeagues] = useState<League[]>(initialLeagues);
  const [currentLeagueId, setCurrentLeagueId] = useState<LeagueTab>('super-a');

  const currentLeague = useMemo(() => 
    leagues.find(l => l.id === currentLeagueId) || leagues[0],
    [leagues, currentLeagueId]
  );

  const calculateStats = useCallback((league: League): PlayerStats[] => {
    const statsMap = new Map<string, PlayerStats>();

    // Initialize stats for all players
    league.players.forEach(player => {
      statsMap.set(player.id, {
        playerId: player.id,
        player,
        played: 0,
        won: 0,
        lost: 0,
        scored: 0,
        conceded: 0,
        average: 0,
        points: 0,
      });
    });

    // Calculate stats from matches
    league.matches.forEach(match => {
      const stats1 = statsMap.get(match.player1Id);
      const stats2 = statsMap.get(match.player2Id);

      if (stats1) {
        stats1.played++;
        stats1.scored += match.score1;
        stats1.conceded += match.score2;
        if (match.winnerId === match.player1Id) {
          stats1.won++;
          stats1.points += 2;
        } else {
          stats1.lost++;
          stats1.points += 1;
        }
        stats1.average = stats1.scored - stats1.conceded;
      }

      if (stats2) {
        stats2.played++;
        stats2.scored += match.score2;
        stats2.conceded += match.score1;
        if (match.winnerId === match.player2Id) {
          stats2.won++;
          stats2.points += 2;
        } else {
          stats2.lost++;
          stats2.points += 1;
        }
        stats2.average = stats2.scored - stats2.conceded;
      }
    });

    // Sort with tiebreakers
    const sortedStats = Array.from(statsMap.values()).sort((a, b) => {
      // 1. Total Points (descending)
      if (b.points !== a.points) return b.points - a.points;

      // 2. Head-to-head result
      const h2hMatch = league.matches.find(
        m => (m.player1Id === a.playerId && m.player2Id === b.playerId) ||
             (m.player1Id === b.playerId && m.player2Id === a.playerId)
      );
      if (h2hMatch) {
        if (h2hMatch.winnerId === a.playerId) return -1;
        if (h2hMatch.winnerId === b.playerId) return 1;
      }

      // 3. Goal difference (descending)
      return b.average - a.average;
    });

    return sortedStats;
  }, []);

  const standings = useMemo(() => 
    calculateStats(currentLeague),
    [currentLeague, calculateStats]
  );

  const addMatch = useCallback((
    player1Id: string,
    player2Id: string,
    score1: number,
    score2: number
  ) => {
    const newMatch: Match = {
      id: `m${Date.now()}`,
      leagueId: currentLeagueId,
      player1Id,
      player2Id,
      score1,
      score2,
      date: new Date().toISOString().split('T')[0],
      winnerId: score1 > score2 ? player1Id : player2Id,
    };

    setLeagues(prev => prev.map(league => {
      if (league.id === currentLeagueId) {
        return {
          ...league,
          matches: [...league.matches, newMatch],
        };
      }
      return league;
    }));

    return newMatch;
  }, [currentLeagueId]);

  const getPlayerMatches = useCallback((playerId: string) => {
    return leagues.flatMap(league => 
      league.matches.filter(m => m.player1Id === playerId || m.player2Id === playerId)
    );
  }, [leagues]);

  const getPlayerById = useCallback((playerId: string): Player | undefined => {
    return mockPlayers.find(p => p.id === playerId);
  }, []);

  return {
    leagues,
    currentLeague,
    currentLeagueId,
    setCurrentLeagueId,
    standings,
    addMatch,
    getPlayerMatches,
    getPlayerById,
  };
}
