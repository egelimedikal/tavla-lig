import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface LeaguePlayer {
  id: string;
  league_id: string;
  player_id: string;
}

interface Profile {
  id: string;
  user_id: string | null;
  name: string | null;
  phone?: string | null;
  avatar_url: string | null;
  must_change_password?: boolean;
}

interface Match {
  id: string;
  league_id: string;
  player1_id: string;
  player2_id: string;
  score1: number;
  score2: number;
  winner_id: string;
  match_date: string;
}

interface League {
  id: string;
  name: string;
  association_id: string | null;
  status: string;
  updated_at: string;
  current_year: number | null;
  active_season: string | null;
  match_length: number;
}

interface Association {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  current_year: number | null;
  active_season: string | null;
}

interface PlayerStats {
  playerId: string;
  player: Profile;
  played: number;
  won: number;
  lost: number;
  scored: number;
  conceded: number;
  average: number;
  points: number;
}

export function useSupabaseLeague() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [associations, setAssociations] = useState<Association[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [leaguePlayers, setLeaguePlayers] = useState<LeaguePlayer[]>([]);
  const [currentAssociationId, setCurrentAssociationId] = useState<string>('');
  const [currentLeagueId, setCurrentLeagueId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch associations
        const { data: associationsData } = await supabase
          .from('associations')
          .select('*')
          .order('name');
        
        if (associationsData && associationsData.length > 0) {
          setAssociations(associationsData);
          setCurrentAssociationId(associationsData[0].id);
        }

        // Fetch leagues
        const { data: leaguesData } = await supabase
          .from('leagues')
          .select('*');
        
        if (leaguesData) setLeagues(leaguesData);

        // Fetch all public profiles (using the public view for visibility)
        const { data: profilesData } = await supabase
          .from('profiles_public')
          .select('*');
        
        if (profilesData) {
          // Filter out any profiles with null id
          const validProfiles = profilesData.filter(p => p.id !== null) as Profile[];
          setPlayers(validProfiles);
        }

        // Fetch all matches
        const { data: matchesData } = await supabase
          .from('matches')
          .select('*')
          .order('match_date', { ascending: false });
        
        if (matchesData) setMatches(matchesData);

        // Fetch league players assignments
        const { data: leaguePlayersData } = await supabase
          .from('league_players')
          .select('*');
        
        if (leaguePlayersData) setLeaguePlayers(leaguePlayersData);
      } catch (error) {
        logger.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Set initial league when association changes
  useEffect(() => {
    if (currentAssociationId) {
      const associationLeagues = leagues.filter(l => l.association_id === currentAssociationId);
      if (associationLeagues.length > 0 && !associationLeagues.find(l => l.id === currentLeagueId)) {
        setCurrentLeagueId(associationLeagues[0].id);
      }
    }
  }, [currentAssociationId, leagues]);

  // Get current user's profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setCurrentUserProfile(null);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) setCurrentUserProfile(data);
    };

    fetchUserProfile();
  }, [user]);

  const currentAssociation = useMemo(() => 
    associations.find(a => a.id === currentAssociationId) || null,
    [associations, currentAssociationId]
  );

  const associationLeagues = useMemo(() => 
    leagues.filter(l => l.association_id === currentAssociationId),
    [leagues, currentAssociationId]
  );

  const currentLeague = useMemo(() => 
    leagues.find(l => l.id === currentLeagueId) || { id: currentLeagueId, name: '', association_id: null },
    [leagues, currentLeagueId]
  );

  const leagueMatches = useMemo(() => 
    matches.filter(m => m.league_id === currentLeagueId),
    [matches, currentLeagueId]
  );

  const calculateStats = useCallback((leagueId: string): PlayerStats[] => {
    // Don't calculate if players haven't loaded yet
    if (players.length === 0) {
      return [];
    }

    const leagueMatchesFiltered = matches.filter(m => m.league_id === leagueId);
    const statsMap = new Map<string, PlayerStats>();

    // Get players assigned to this league via league_players table
    const assignedPlayerIds = leaguePlayers
      .filter(lp => lp.league_id === leagueId)
      .map(lp => lp.player_id);

    // Also get unique players from matches (for backwards compatibility)
    const playerIdsFromMatches = new Set<string>();
    leagueMatchesFiltered.forEach(match => {
      playerIdsFromMatches.add(match.player1_id);
      playerIdsFromMatches.add(match.player2_id);
    });

    // Combine both: assigned players + players who have matches
    const allPlayerIds = new Set([...assignedPlayerIds, ...playerIdsFromMatches]);

    // Initialize stats for all players in this league
    allPlayerIds.forEach(playerId => {
      const player = players.find(p => p.id === playerId);
      // Create a placeholder profile if player not found
      const playerProfile: Profile = player || {
        id: playerId,
        user_id: null,
        name: 'Bilinmeyen Oyuncu',
        avatar_url: null,
      };
      
      statsMap.set(playerId, {
        playerId,
        player: playerProfile,
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
    leagueMatchesFiltered.forEach(match => {
      const stats1 = statsMap.get(match.player1_id);
      const stats2 = statsMap.get(match.player2_id);

      if (stats1) {
        stats1.played++;
        stats1.scored += match.score1;
        stats1.conceded += match.score2;
        if (match.winner_id === match.player1_id) {
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
        if (match.winner_id === match.player2_id) {
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
      // If neither player has played, sort alphabetically
      if (a.played === 0 && b.played === 0) {
        return (a.player.name || '').localeCompare(b.player.name || '', 'tr');
      }

      // 1. Total Points (descending)
      if (b.points !== a.points) return b.points - a.points;

      // 2. Head-to-head result
      const h2hMatch = leagueMatchesFiltered.find(
        m => (m.player1_id === a.playerId && m.player2_id === b.playerId) ||
             (m.player1_id === b.playerId && m.player2_id === a.playerId)
      );
      if (h2hMatch) {
        if (h2hMatch.winner_id === a.playerId) return -1;
        if (h2hMatch.winner_id === b.playerId) return 1;
      }

      // 3. Goal difference (descending)
      if (b.average !== a.average) return b.average - a.average;

      // 4. Fewer matches played = higher rank
      if (a.played !== b.played) return a.played - b.played;

      // 5. Alphabetical fallback
      return (a.player.name || '').localeCompare(b.player.name || '', 'tr');
    });

    return sortedStats;
  }, [matches, players, leaguePlayers]);

  const standings = useMemo(() => 
    calculateStats(currentLeagueId),
    [currentLeagueId, calculateStats, leaguePlayers, players]
  );

  const addMatch = useCallback(async (
    player1Id: string,
    player2Id: string,
    score1: number,
    score2: number,
    leagueId?: string
  ) => {
    const winnerId = score1 > score2 ? player1Id : player2Id;
    const targetLeagueId = leagueId || currentLeagueId;

    const { data, error } = await supabase
      .from('matches')
      .insert({
        league_id: targetLeagueId,
        player1_id: player1Id,
        player2_id: player2Id,
        score1,
        score2,
        winner_id: winnerId,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Hata!",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    if (data) {
      setMatches(prev => [data, ...prev]);
    }

    return data;
  }, [currentLeagueId, toast]);

  const getPlayerMatches = useCallback((playerId: string) => {
    return matches.filter(m => m.player1_id === playerId || m.player2_id === playerId);
  }, [matches]);

  const getPlayerById = useCallback((playerId: string): Profile | undefined => {
    return players.find(p => p.id === playerId);
  }, [players]);

  const refetchMatches = useCallback(async () => {
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: false });
    
    if (matchesData) setMatches(matchesData);
  }, []);

  const refetchProfiles = useCallback(async () => {
    const { data: profilesData } = await supabase
      .from('profiles_public')
      .select('*');
    
    if (profilesData) {
      const validProfiles = profilesData.filter(p => p.id !== null) as Profile[];
      setPlayers(validProfiles);
    }
    
    // Also update current user profile
    if (user) {
      const currentProfile = profilesData?.find(p => p.user_id === user.id);
      if (currentProfile) setCurrentUserProfile(currentProfile as Profile);
    }
    
    // Also refetch matches to ensure data is in sync
    await refetchMatches();
  }, [user, refetchMatches]);

  return {
    associations,
    currentAssociation,
    currentAssociationId,
    setCurrentAssociationId,
    associationLeagues,
    leagues,
    currentLeague,
    currentLeagueId,
    setCurrentLeagueId,
    standings,
    players,
    matches,
    leaguePlayers,
    loading,
    addMatch,
    getPlayerMatches,
    getPlayerById,
    currentUserProfile,
    refetchProfiles,
    refetchMatches,
    calculateStats,
  };
}
