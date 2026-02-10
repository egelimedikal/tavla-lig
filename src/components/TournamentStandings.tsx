import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trophy, History } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Profile {
  id: string;
  user_id: string | null;
  name: string | null;
  avatar_url: string | null;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  current_round: number;
  updated_at: string;
}

interface TournamentPlayer {
  id: string;
  tournament_id: string;
  player_id: string;
  initial_rights: number;
  losses: number;
  is_eliminated: boolean;
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

interface TournamentStandingsProps {
  players: Profile[];
  onPlayerClick: (playerId: string) => void;
}

export function TournamentStandings({ players, onPlayerClick }: TournamentStandingsProps) {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentPlayers, setTournamentPlayers] = useState<TournamentPlayer[]>([]);
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Find current user's profile ID
  const currentUserProfileId = useMemo(() => {
    if (!user) return null;
    return players.find(p => p.user_id === user.id)?.id || null;
  }, [user, players]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tRes, tpRes, tmRes] = await Promise.all([
          supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
          supabase.from('tournament_players').select('*'),
          supabase.from('tournament_matches').select('*').order('round_number'),
        ]);
        if (tRes.data) {
          const ts = tRes.data as Tournament[];
          setTournaments(ts);
          if (ts.length > 0) {
            const active = ts.find(t => t.status === 'active');
            setSelectedTournamentId(active ? active.id : ts[0].id);
          }
        }
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

  const getPlayerById = (id: string | null) => {
    if (!id) return null;
    return players.find(p => p.id === id) || null;
  };

  const currentPlayers = useMemo(() => 
    tournamentPlayers.filter(tp => tp.tournament_id === selectedTournamentId),
    [tournamentPlayers, selectedTournamentId]
  );

  const currentMatches = useMemo(() =>
    tournamentMatches.filter(tm => tm.tournament_id === selectedTournamentId),
    [tournamentMatches, selectedTournamentId]
  );

  const sortedPlayers = useMemo(() => {
    return [...currentPlayers].sort((a, b) => {
      if (a.is_eliminated !== b.is_eliminated) return a.is_eliminated ? 1 : -1;
      if (a.losses !== b.losses) return a.losses - b.losses;
      // H2H
      const h2h = currentMatches.find(m =>
        m.winner_id && (
          (m.player1_id === a.player_id && m.player2_id === b.player_id) ||
          (m.player1_id === b.player_id && m.player2_id === a.player_id)
        )
      );
      if (h2h?.winner_id === a.player_id) return -1;
      if (h2h?.winner_id === b.player_id) return 1;
      // Average
      const getAvg = (pid: string) => {
        let s = 0, c = 0;
        currentMatches.filter(m => m.winner_id && (m.player1_id === pid || m.player2_id === pid)).forEach(m => {
          if (m.player1_id === pid) { s += m.score1 || 0; c += m.score2 || 0; }
          else { s += m.score2 || 0; c += m.score1 || 0; }
        });
        return s - c;
      };
      const avgDiff = getAvg(b.player_id) - getAvg(a.player_id);
      if (avgDiff !== 0) return avgDiff;
      const nameA = getPlayerById(a.player_id)?.name || '';
      const nameB = getPlayerById(b.player_id)?.name || '';
      return nameA.localeCompare(nameB, 'tr');
    });
  }, [currentPlayers, currentMatches, players]);

  // Track group border transitions with colors
  const groupBorderIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 1; i < sortedPlayers.length; i++) {
      const prev = sortedPlayers[i - 1];
      const curr = sortedPlayers[i];
      if (prev.losses !== curr.losses || prev.is_eliminated !== curr.is_eliminated) {
        indices.push(i);
      }
    }
    return indices;
  }, [sortedPlayers]);

  const getGroupBorder = (_index: number) => {
    return '';
  };

  const completedTournaments = useMemo(() =>
    tournaments
      .filter(t => t.status === 'completed')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [tournaments]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="px-4 text-center text-muted-foreground py-8">
        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Henüz turnuva oluşturulmamış</p>
      </div>
    );
  }

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId);

  return (
    <div className="animate-fade-in">
      {selectedTournament && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">{selectedTournament.name}</h2>
              </div>
              <p className="text-sm text-muted-foreground">Puan Tablosu</p>
            </div>
            {completedTournaments.length > 0 && (
              <Select
                value={completedTournaments.some(t => t.id === selectedTournamentId) ? selectedTournamentId || '' : ''}
                onValueChange={setSelectedTournamentId}
              >
                <SelectTrigger className="w-auto gap-1.5 h-8 text-xs px-3 bg-secondary/50 border-border/50">
                  <History className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Geçmiş Turnuvalar</span>
                </SelectTrigger>
                <SelectContent>
                  {completedTournaments.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name} ({format(new Date(t.updated_at), 'dd.MM.yyyy')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      )}

      {/* Standings Table */}
      <div className="px-2">
        {/* Champion highlight when tournament is completed or only 1 active player */}
        {(() => {
          const activePlayers = currentPlayers.filter(tp => !tp.is_eliminated);
          const isFinished = selectedTournament?.status === 'completed' || (activePlayers.length <= 1 && currentMatches.length > 0);
          const champion = isFinished && sortedPlayers.length > 0 ? sortedPlayers[0] : null;
          const championPlayer = champion ? getPlayerById(champion.player_id) : null;

          return isFinished && championPlayer ? (
            <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-yellow-500/20 border-2 border-yellow-500/40 rounded-xl text-center animate-fade-in">
              <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">{championPlayer.name}</p>
              <p className="text-sm text-yellow-500 font-semibold">🏆 Turnuva Şampiyonu</p>
            </div>
          ) : null;
        })()}

        <div className="bg-card rounded-xl overflow-hidden border border-border">
          <div className="grid grid-cols-[22px_minmax(0,1fr)_28px_28px_28px] gap-0 px-1 py-2 bg-secondary/50 text-[10px] font-semibold text-muted-foreground">
            <div className="text-center">#</div>
            <div className="pl-1">Oyuncu</div>
            <div className="text-center">G</div>
            <div className="text-center">M</div>
            <div className="text-center">Bye</div>
          </div>
          <div className="divide-y divide-white/15">
            {sortedPlayers.map((tp, index) => {
              const player = getPlayerById(tp.player_id);
              const wins = currentMatches.filter(m => m.winner_id === tp.player_id).length;
              const byeCount = currentMatches.filter(m => m.is_bye && m.player1_id === tp.player_id).length;
              const activePlayers = currentPlayers.filter(p => !p.is_eliminated);
              const isChampion = index === 0 && (selectedTournament?.status === 'completed' || (activePlayers.length <= 1 && currentMatches.length > 0));

              return (
                <button
                  key={tp.id}
                  onClick={() => onPlayerClick(tp.player_id)}
                  className={`w-full grid grid-cols-[22px_minmax(0,1fr)_28px_28px_28px] gap-0 px-1 py-2 text-xs hover:bg-secondary/30 transition-colors ${getGroupBorder(index)} ${tp.is_eliminated ? 'bg-destructive/10' : ''} ${isChampion ? 'bg-yellow-500/10 border-l-4 border-l-yellow-400' : ''}`}
                >
                  <div className="flex items-center justify-center text-muted-foreground">
                    {index === 0 ? <Trophy className="w-4 h-4 text-yellow-400" /> : index === 1 ? <Trophy className="w-4 h-4 text-gray-300" /> : index === 2 ? <Trophy className="w-4 h-4 text-amber-600" /> : index + 1}
                  </div>
                  <div className="flex items-center gap-1 text-left min-w-0 overflow-hidden pl-1">
                    {player?.avatar_url ? (
                      <img src={player.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium text-primary flex-shrink-0">
                        {player?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <span className={`font-medium truncate text-[11px] ${tp.is_eliminated ? 'text-destructive/70' : isChampion ? 'text-yellow-400 font-bold' : 'text-foreground'}`}>
                      {player?.name || 'Bilinmeyen'}
                    </span>
                  </div>
                  <div className="text-center text-success font-medium text-[11px]">{wins}</div>
                  <div className="text-center text-primary font-medium text-[11px]">{tp.losses}</div>
                  <div className="text-center font-medium text-[11px]">{byeCount}</div>
                </button>
              );
            })}
          </div>
          {sortedPlayers.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Bu turnuvada henüz oyuncu yok
            </div>
          )}
        </div>

        
      </div>

      {/* Match Results by Round */}
      {currentMatches.length > 0 && currentUserProfileId && (
        <div className="px-4 mt-6 space-y-4">
          <h3 className="font-semibold">Maç Sonuçlarım</h3>
          {(() => {
            const myMatches = currentMatches.filter(m =>
              m.player1_id === currentUserProfileId || m.player2_id === currentUserProfileId
            );
            if (myMatches.length === 0) return (
              <p className="text-sm text-muted-foreground text-center py-4">Henüz maçınız yok</p>
            );
            return Array.from(new Set(myMatches.map(m => m.round_number)))
            .sort((a, b) => b - a)
            .map(round => {
              const roundMatches = myMatches.filter(m => m.round_number === round);
              return (
                <div key={round} className="space-y-2">
                  <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                    <Badge variant="default" className="text-xs">{round}. Tur</Badge>
                  </h4>
                  <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border/50">
                    {roundMatches.map(match => {
                      const p1 = getPlayerById(match.player1_id);
                      const p2 = getPlayerById(match.player2_id);
                      return (
                        <div key={match.id} className="px-3 py-2 text-xs">
                          {match.is_bye ? (
                            <span>
                              <span className="font-medium">{p1?.name || 'Bilinmeyen'}</span>
                              <span className="text-success ml-2">BYE</span>
                            </span>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className={match.winner_id === match.player1_id ? 'font-bold' : 'text-muted-foreground'}>
                                {p1?.name || 'Bilinmeyen'}
                              </span>
                              <span className="font-medium">
                                {match.score1 !== null ? `${match.score1} - ${match.score2}` : 'vs'}
                              </span>
                              <span className={match.winner_id === match.player2_id ? 'font-bold' : 'text-muted-foreground'}>
                                {p2?.name || 'Bilinmeyen'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}