import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy } from 'lucide-react';
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
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentPlayers, setTournamentPlayers] = useState<TournamentPlayer[]>([]);
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
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
        if (tRes.data) {
          const ts = tRes.data as Tournament[];
          setTournaments(ts);
          if (ts.length > 0) setSelectedTournamentId(ts[0].id);
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

  const getLossRowColor = (_losses: number, _isEliminated: boolean) => {
    return '';
  };

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
      {/* Tournament Tabs */}
      {tournaments.length > 1 && (
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 px-4 py-3 min-w-max">
            {tournaments.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTournamentId(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  selectedTournamentId === t.id
                    ? 'bg-primary text-primary-foreground glow-primary'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedTournament && (
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">{selectedTournament.name}</h2>
          </div>
          <p className="text-sm text-muted-foreground">Tur: {selectedTournament.current_round} • Puan Tablosu</p>
        </div>
      )}

      {/* Standings Table */}
      <div className="px-2">
        <div className="bg-card rounded-xl overflow-hidden border border-border">
          <div className="grid grid-cols-[22px_1fr_32px_32px_32px] gap-0 px-1 py-2 bg-secondary/50 text-[10px] font-semibold text-muted-foreground">
            <div className="text-center">#</div>
            <div className="pl-1">Oyuncu</div>
            <div className="text-center">G</div>
            <div className="text-center">M</div>
            <div className="text-center">Bye</div>
          </div>
          <div className="divide-y divide-border">
            {sortedPlayers.map((tp, index) => {
              const player = getPlayerById(tp.player_id);
              const wins = currentMatches.filter(m => m.winner_id === tp.player_id).length;
              const byeCount = currentMatches.filter(m => m.is_bye && m.player1_id === tp.player_id).length;

              return (
                <button
                  key={tp.id}
                  onClick={() => onPlayerClick(tp.player_id)}
                  className={`w-full grid grid-cols-[22px_1fr_32px_32px_32px] gap-0 px-1 py-2 text-xs hover:bg-secondary/30 transition-colors ${getLossRowColor(tp.losses, tp.is_eliminated)}`}
                >
                  <div className="flex items-center justify-center text-muted-foreground">{index + 1}</div>
                  <div className="flex items-center gap-1 text-left min-w-0 overflow-hidden pl-1">
                    {player?.avatar_url ? (
                      <img src={player.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium text-primary flex-shrink-0">
                        {player?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <span className="font-medium text-foreground truncate text-[11px]">
                      {player?.name || 'Bilinmeyen'}
                      {tp.is_eliminated && <span className="ml-1 text-[9px] text-destructive font-bold">(ELENDİ)</span>}
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
      {currentMatches.length > 0 && (
        <div className="px-4 mt-6 space-y-4">
          <h3 className="font-semibold">Maç Sonuçları</h3>
          {Array.from(new Set(currentMatches.map(m => m.round_number)))
            .sort((a, b) => b - a)
            .map(round => {
              const roundMatches = currentMatches.filter(m => m.round_number === round);
              return (
                <div key={round} className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Tur {round}</h4>
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
            })}
        </div>
      )}
    </div>
  );
}