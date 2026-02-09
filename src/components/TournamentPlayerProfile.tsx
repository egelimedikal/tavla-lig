import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';

interface Profile {
  id: string;
  user_id: string | null;
  name: string | null;
  avatar_url: string | null;
}

interface TournamentMatch {
  id: string;
  tournament_id: string;
  round_number: number;
  player1_id: string | null;
  player2_id: string | null;
  score1: number | null;
  score2: number | null;
  winner_id: string | null;
  is_bye: boolean;
  match_date: string;
}

interface TournamentPlayer {
  id: string;
  tournament_id: string;
  player_id: string;
  initial_rights: number;
  losses: number;
  is_eliminated: boolean;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  current_round: number;
  created_at: string;
}

interface TournamentPlayerProfileProps {
  playerId: string;
  getPlayerById: (id: string) => Profile | undefined;
}

export function TournamentPlayerProfile({ playerId, getPlayerById }: TournamentPlayerProfileProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentPlayers, setTournamentPlayers] = useState<TournamentPlayer[]>([]);
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tRes, tpRes, tmRes] = await Promise.all([
          supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
          supabase.from('tournament_players').select('*'),
          supabase.from('tournament_matches').select('*').order('round_number'),
        ]);
        if (tRes.data) setTournaments(tRes.data as Tournament[]);
        if (tpRes.data) setTournamentPlayers(tpRes.data as TournamentPlayer[]);
        if (tmRes.data) setTournamentMatches(tmRes.data as TournamentMatch[]);
      } catch (error) {
        logger.error('Error fetching tournament data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate rank for a player in a tournament
  const getPlayerRank = (tournamentId: string, targetPlayerId: string): number => {
    const tPlayers = tournamentPlayers.filter(tp => tp.tournament_id === tournamentId);
    const tMatches = tournamentMatches.filter(tm => tm.tournament_id === tournamentId);

    const sorted = [...tPlayers].sort((a, b) => {
      if (a.is_eliminated !== b.is_eliminated) return a.is_eliminated ? 1 : -1;
      if (a.losses !== b.losses) return a.losses - b.losses;
      // H2H
      const h2h = tMatches.find(m =>
        m.winner_id && (
          (m.player1_id === a.player_id && m.player2_id === b.player_id) ||
          (m.player1_id === b.player_id && m.player2_id === a.player_id)
        )
      );
      if (h2h?.winner_id === a.player_id) return -1;
      if (h2h?.winner_id === b.player_id) return 1;
      // Score diff
      const getAvg = (pid: string) => {
        let s = 0, c = 0;
        tMatches.filter(m => m.winner_id && (m.player1_id === pid || m.player2_id === pid)).forEach(m => {
          if (m.player1_id === pid) { s += m.score1 || 0; c += m.score2 || 0; }
          else { s += m.score2 || 0; c += m.score1 || 0; }
        });
        return s - c;
      };
      return getAvg(b.player_id) - getAvg(a.player_id);
    });

    const idx = sorted.findIndex(tp => tp.player_id === targetPlayerId);
    return idx >= 0 ? idx + 1 : 0;
  };

  const toggleTournament = (id: string) => {
    setExpandedTournaments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const playerTournaments = useMemo(() => {
    const tpEntries = tournamentPlayers.filter(tp => tp.player_id === playerId);
    return tpEntries.map(tp => {
      const tournament = tournaments.find(t => t.id === tp.tournament_id);
      if (!tournament) return null;
      
      const matches = tournamentMatches.filter(
        m => m.tournament_id === tp.tournament_id && 
        (m.player1_id === playerId || m.player2_id === playerId)
      );
      
      const wins = matches.filter(m => m.winner_id === playerId).length;
      const losses = tp.losses;
      const played = matches.filter(m => m.winner_id !== null).length;
      const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
      const rank = getPlayerRank(tp.tournament_id, playerId);

      return {
        tournament,
        tp,
        matches,
        wins,
        losses,
        played,
        winRate,
        remainingRights: Math.max(0, 4 - tp.losses),
        rank,
      };
    }).filter(Boolean) as Array<{
      tournament: Tournament;
      tp: TournamentPlayer;
      matches: TournamentMatch[];
      wins: number;
      losses: number;
      played: number;
      winRate: number;
      remainingRights: number;
      rank: number;
    }>;
  }, [playerId, tournaments, tournamentPlayers, tournamentMatches]);

  const overallStats = useMemo(() => {
    const totalPlayed = playerTournaments.reduce((sum, t) => sum + t.played, 0);
    const totalWins = playerTournaments.reduce((sum, t) => sum + t.wins, 0);
    const totalLosses = totalPlayed - totalWins;
    const overallWinRate = totalPlayed > 0 ? Math.round((totalWins / totalPlayed) * 100) : 0;
    return { totalPlayed, totalWins, totalLosses, overallWinRate };
  }, [playerTournaments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (playerTournaments.length === 0) return null;


  return (
    <div className="space-y-4">
      <h3 className="font-semibold px-1 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" />
        Turnuva İstatistikleri
      </h3>

      {/* Overall Stats */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground">Katıldığı Turnuva</td>
              <td className="px-4 py-3 text-foreground">{playerTournaments.length}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground">Oynanan Maç</td>
              <td className="px-4 py-3 text-foreground">{overallStats.totalPlayed}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground">Galibiyet</td>
              <td className="px-4 py-3 text-success font-medium">{overallStats.totalWins}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground">Mağlubiyet</td>
              <td className="px-4 py-3 text-primary font-medium">{overallStats.totalLosses}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground">Galibiyet Oranı</td>
              <td className="px-4 py-3">
                {overallStats.totalPlayed > 0 ? (
                  <span className={overallStats.overallWinRate >= 50 ? 'text-success font-semibold' : 'text-primary font-semibold'}>
                    %{overallStats.overallWinRate}
                  </span>
                ) : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {playerTournaments.map(({ tournament, tp, matches, wins, losses, played, winRate, remainingRights, rank }, index) => {
        const isExpanded = expandedTournaments.has(tournament.id);
        const totalPlayers = tournamentPlayers.filter(p => p.tournament_id === tournament.id).length;
        const tournamentNumber = playerTournaments.length - index;

        return (
          <div key={tournament.id} className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Collapsible Header */}
            <button
              onClick={() => toggleTournament(tournament.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary">{tournamentNumber}.</span>
                <span className="font-medium text-sm text-foreground">{tournament.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(tournament.created_at).toLocaleDateString('tr-TR')}
                </span>
                {tournament.status === 'completed' && (
                  <Badge variant="secondary" className="text-[9px]">Tamamlandı</Badge>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-border">
                {/* Stats */}
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="px-4 py-2 font-medium text-muted-foreground">Sıralama</td>
                      <td className="px-4 py-2 font-bold text-primary">{rank}/{totalPlayers}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-muted-foreground">Oynanan</td>
                      <td className="px-4 py-2 text-foreground">{played}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-muted-foreground">Galibiyet</td>
                      <td className="px-4 py-2 text-success font-medium">{wins}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-muted-foreground">Mağlubiyet</td>
                      <td className="px-4 py-2 text-primary font-medium">{losses}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-muted-foreground">Galibiyet Oranı</td>
                      <td className="px-4 py-2">
                        {played > 0 ? (
                          <span className={winRate >= 50 ? 'text-success font-semibold' : 'text-primary font-semibold'}>
                            %{winRate}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Match History */}
                {matches.length > 0 && (
                  <div className="border-t border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">Tur</th>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">Rakip</th>
                          <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">Skor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {matches
                          .sort((a, b) => b.round_number - a.round_number)
                          .map(match => {
                          const isPlayer1 = match.player1_id === playerId;
                          const opponentId = isPlayer1 ? match.player2_id : match.player1_id;
                          const opponent = opponentId ? getPlayerById(opponentId) : null;
                          const playerWon = match.winner_id === playerId;

                          return (
                            <tr key={match.id}>
                              <td className="px-3 py-2 text-muted-foreground text-xs">{match.round_number}</td>
                              <td className="px-3 py-2 text-xs">
                                {match.is_bye ? (
                                  <span className="text-success">BYE</span>
                                ) : (
                                  <span className={playerWon ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                                    {opponent?.name || 'Bilinmeyen'}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center text-xs font-medium">
                                {match.is_bye ? (
                                  <span className="text-success">Hükmen</span>
                                ) : match.score1 !== null ? (
                                  `${isPlayer1 ? match.score1 : match.score2} - ${isPlayer1 ? match.score2 : match.score1}`
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}