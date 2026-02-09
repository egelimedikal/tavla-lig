import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trophy } from 'lucide-react';
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

  // Find tournaments this player is in
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

      return {
        tournament,
        tp,
        matches,
        wins,
        losses,
        played,
        winRate,
        remainingRights: Math.max(0, 4 - tp.losses),
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
    }>;
  }, [playerId, tournaments, tournamentPlayers, tournamentMatches]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (playerTournaments.length === 0) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold px-1 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" />
        Turnuva İstatistikleri
      </h3>

      {playerTournaments.map(({ tournament, tp, matches, wins, losses, played, winRate, remainingRights }) => (
        <div key={tournament.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">{tournament.name}</h4>
            {tp.is_eliminated ? (
              <Badge variant="destructive" className="text-[9px]">ELENDİ</Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] border-success text-success">Aktif</Badge>
            )}
          </div>

          {/* Stats */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-2 font-medium text-muted-foreground">Kalan Hak</td>
                  <td className="px-4 py-2 font-bold text-foreground">{remainingRights}</td>
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
          </div>

          {/* Match History */}
          {matches.length > 0 && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
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
      ))}
    </div>
  );
}