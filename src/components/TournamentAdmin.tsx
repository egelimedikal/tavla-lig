import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Edit, Loader2, Swords, Trophy, Users, Shuffle } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Profile {
  id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
}

interface Tournament {
  id: string;
  name: string;
  association_id: string | null;
  status: string;
  current_round: number;
  created_at: string;
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

interface TournamentAdminProps {
  players: Profile[];
  associationId: string | null;
}

export function TournamentAdmin({ players, associationId }: TournamentAdminProps) {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentPlayers, setTournamentPlayers] = useState<TournamentPlayer[]>([]);
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentMatchLength, setNewTournamentMatchLength] = useState(9);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  
  // Player selection for tournament
  const [selectedPlayersForTournament, setSelectedPlayersForTournament] = useState<Map<string, number>>(new Map());
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  
  // Match editing
  const [editingMatch, setEditingMatch] = useState<TournamentMatch | null>(null);
  const [generatingMatches, setGeneratingMatches] = useState(false);

  useEffect(() => {
    fetchTournamentData();
  }, []);

  const fetchTournamentData = async () => {
    setLoading(true);
    try {
      const [tournamentsRes, playersRes, matchesRes] = await Promise.all([
        supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
        supabase.from('tournament_players').select('*'),
        supabase.from('tournament_matches').select('*').order('round_number', { ascending: true }),
      ]);
      if (tournamentsRes.data) setTournaments(tournamentsRes.data as Tournament[]);
      if (playersRes.data) setTournamentPlayers(playersRes.data as TournamentPlayer[]);
      if (matchesRes.data) setTournamentMatches(matchesRes.data as TournamentMatch[]);
    } catch (error) {
      logger.error('Error fetching tournament data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTournament = async () => {
    if (!newTournamentName.trim()) {
      toast({ title: "Hata", description: "Turnuva adı gerekli.", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from('tournaments')
      .insert({ name: newTournamentName, association_id: associationId, match_length: newTournamentMatchLength } as any)
      .select()
      .single();
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      return;
    }
    if (data) {
      setTournaments(prev => [data as Tournament, ...prev]);
      setNewTournamentName('');
      setNewTournamentMatchLength(9);
      setSelectedTournamentId(data.id);
      toast({ title: "Başarılı", description: "Turnuva oluşturuldu." });
    }
  };

  const deleteTournament = async (id: string) => {
    const { error } = await supabase.from('tournaments').delete().eq('id', id);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      return;
    }
    setTournaments(prev => prev.filter(t => t.id !== id));
    setTournamentPlayers(prev => prev.filter(tp => tp.tournament_id !== id));
    setTournamentMatches(prev => prev.filter(tm => tm.tournament_id !== id));
    if (selectedTournamentId === id) setSelectedTournamentId(null);
    toast({ title: "Başarılı", description: "Turnuva silindi." });
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayersForTournament(prev => {
      const next = new Map(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.set(playerId, 4); // default 4 rights
      }
      return next;
    });
  };

  const setPlayerRights = (playerId: string, rights: number) => {
    setSelectedPlayersForTournament(prev => {
      const next = new Map(prev);
      next.set(playerId, rights);
      return next;
    });
  };

  const addPlayersToTournament = async () => {
    if (!selectedTournamentId || selectedPlayersForTournament.size === 0) return;
    
    const existingPlayerIds = tournamentPlayers
      .filter(tp => tp.tournament_id === selectedTournamentId)
      .map(tp => tp.player_id);

    const newEntries = Array.from(selectedPlayersForTournament.entries())
      .filter(([pid]) => !existingPlayerIds.includes(pid))
      .map(([pid, rights]) => ({
        tournament_id: selectedTournamentId,
        player_id: pid,
        initial_rights: rights,
        losses: 4 - rights, // 4 hak = 0 mağlubiyet, 3 hak = 1, 2 hak = 2
        is_eliminated: false,
      }));

    if (newEntries.length === 0) {
      toast({ title: "Bilgi", description: "Seçili oyuncular zaten turnuvada." });
      return;
    }

    const { data, error } = await supabase
      .from('tournament_players')
      .insert(newEntries)
      .select();

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      return;
    }

    if (data) {
      setTournamentPlayers(prev => [...prev, ...(data as TournamentPlayer[])]);
      setSelectedPlayersForTournament(new Map());
      setShowAddPlayers(false);
      toast({ title: "Başarılı", description: `${data.length} oyuncu turnuvaya eklendi.` });
    }
  };

  const removePlayerFromTournament = async (tpId: string) => {
    const { error } = await supabase.from('tournament_players').delete().eq('id', tpId);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      return;
    }
    setTournamentPlayers(prev => prev.filter(tp => tp.id !== tpId));
    toast({ title: "Başarılı", description: "Oyuncu turnuvadan çıkarıldı." });
  };

  const generateMatchesForRound = async () => {
    if (!selectedTournamentId) return;
    setGeneratingMatches(true);

    try {
      const tournament = tournaments.find(t => t.id === selectedTournamentId);
      if (!tournament) return;

      const tPlayers = tournamentPlayers.filter(
        tp => tp.tournament_id === selectedTournamentId && !tp.is_eliminated
      );

      if (tPlayers.length < 2) {
        toast({ title: "Hata", description: "Yeterli aktif oyuncu yok.", variant: "destructive" });
        return;
      }

      const nextRound = tournament.current_round + 1;

      // Group players by loss count
      const groups = new Map<number, TournamentPlayer[]>();
      tPlayers.forEach(tp => {
        const group = groups.get(tp.losses) || [];
        group.push(tp);
        groups.set(tp.losses, group);
      });

      // Sort groups by loss count descending (most losses first = least rights)
      const sortedGroupKeys = Array.from(groups.keys()).sort((a, b) => b - a);
      
      const matchesToInsert: Array<{
        tournament_id: string;
        round_number: number;
        player1_id: string | null;
        player2_id: string | null;
        is_bye: boolean;
      }> = [];

      // Count previous byes per player for fairness
      const previousMatches = tournamentMatches.filter(m => m.tournament_id === selectedTournamentId);
      const byeCountMap = new Map<string, number>();
      previousMatches.forEach(m => {
        if (m.is_bye && m.player1_id) {
          byeCountMap.set(m.player1_id, (byeCountMap.get(m.player1_id) || 0) + 1);
        }
      });

      // Build set of previous matchups to avoid rematches
      const previousMatchups = new Set<string>();
      previousMatches.forEach(m => {
        if (!m.is_bye && m.player1_id && m.player2_id) {
          const key = [m.player1_id, m.player2_id].sort().join('-');
          previousMatchups.add(key);
        }
      });

      // Fisher-Yates shuffle helper using crypto-grade randomness
      const cryptoShuffle = <T,>(arr: T[]): T[] => {
        const result = [...arr];
        const randomValues = new Uint32Array(result.length);
        crypto.getRandomValues(randomValues);
        for (let i = result.length - 1; i > 0; i--) {
          const j = randomValues[i] % (i + 1);
          [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
      };

      // Determine if total active players is odd — if so, BYE goes to highest loss group
      const totalPlayers = tPlayers.length;
      let byeAssigned = false;

      if (totalPlayers % 2 !== 0) {
        // Find the group with most losses and pick the player with fewest previous byes
        for (const key of sortedGroupKeys) {
          const group = groups.get(key)!;
          if (group.length > 0) {
            // Sort by bye count ascending, then shuffle ties randomly
            const minByeCount = Math.min(...group.map(p => byeCountMap.get(p.player_id) || 0));
            const candidates = group.filter(p => (byeCountMap.get(p.player_id) || 0) === minByeCount);
            const shuffledCandidates = cryptoShuffle(candidates);
            const byePlayer = shuffledCandidates[0];
            const idx = group.indexOf(byePlayer);
            group.splice(idx, 1);
            matchesToInsert.push({
              tournament_id: selectedTournamentId,
              round_number: nextRound,
              player1_id: byePlayer.player_id,
              player2_id: null,
              is_bye: true,
            });
            byeAssigned = true;
            break;
          }
        }
      }

      // Now pair within groups (ascending order for carry-over logic)
      const ascGroupKeys = Array.from(groups.keys()).sort((a, b) => a - b);
      let carryOver: TournamentPlayer | null = null;

      for (let i = 0; i < ascGroupKeys.length; i++) {
        const key = ascGroupKeys[i];
        const group = [...(groups.get(key) || [])];
        
        // Add carry-over from previous group
        if (carryOver) {
          group.unshift(carryOver);
          carryOver = null;
        }

        // Shuffle the group with crypto-grade randomness
        const shuffled = cryptoShuffle(group);

        // Try to avoid rematches by swapping pairs
        const finalGroup = [...shuffled];
        for (let j = 0; j < finalGroup.length - 1; j += 2) {
          const matchKey = [finalGroup[j].player_id, finalGroup[j + 1].player_id].sort().join('-');
          if (previousMatchups.has(matchKey)) {
            // Try to find a swap partner further in the list
            let swapped = false;
            for (let s = j + 2; s < finalGroup.length; s++) {
              const altKey1 = [finalGroup[j].player_id, finalGroup[s].player_id].sort().join('-');
              // Check the displaced partner too
              const partnerIdx = s % 2 === 0 ? s + 1 : s - 1;
              if (partnerIdx < finalGroup.length && partnerIdx >= 0) {
                const altKey2 = [finalGroup[j + 1].player_id, finalGroup[partnerIdx === s ? j + 1 : partnerIdx].player_id].sort().join('-');
                if (!previousMatchups.has(altKey1)) {
                  [finalGroup[j + 1], finalGroup[s]] = [finalGroup[s], finalGroup[j + 1]];
                  swapped = true;
                  break;
                }
              } else if (!previousMatchups.has(altKey1)) {
                [finalGroup[j + 1], finalGroup[s]] = [finalGroup[s], finalGroup[j + 1]];
                swapped = true;
                break;
              }
            }
          }
        }

        // If odd number, carry over to next group
        if (finalGroup.length % 2 !== 0) {
          if (i < ascGroupKeys.length - 1) {
            carryOver = finalGroup.pop()!;
          } else {
            carryOver = finalGroup.pop()!;
          }
        }

        // Pair up remaining
        for (let j = 0; j < finalGroup.length; j += 2) {
          matchesToInsert.push({
            tournament_id: selectedTournamentId,
            round_number: nextRound,
            player1_id: finalGroup[j].player_id,
            player2_id: finalGroup[j + 1].player_id,
            is_bye: false,
          });
        }
      }

      // Handle if carry-over wasn't used (shouldn't happen but safety)
      if (carryOver) {
        matchesToInsert.push({
          tournament_id: selectedTournamentId,
          round_number: nextRound,
          player1_id: carryOver.player_id,
          player2_id: null,
          is_bye: true,
        });
      }

      const { data, error } = await supabase
        .from('tournament_matches')
        .insert(matchesToInsert)
        .select();

      if (error) {
        toast({ title: "Hata", description: error.message, variant: "destructive" });
        return;
      }

      // Update tournament round
      await supabase
        .from('tournaments')
        .update({ current_round: nextRound })
        .eq('id', selectedTournamentId);

      setTournaments(prev => prev.map(t => 
        t.id === selectedTournamentId ? { ...t, current_round: nextRound } : t
      ));

      if (data) {
        setTournamentMatches(prev => [...prev, ...(data as TournamentMatch[])]);
      }

      toast({ title: "Başarılı", description: `${nextRound}. tur eşleştirmeleri oluşturuldu.` });
    } finally {
      setGeneratingMatches(false);
    }
  };

  const getMatchLength = (tournamentId: string): number => {
    const t = tournaments.find(t => t.id === tournamentId);
    return (t as any)?.match_length ?? 9;
  };

  const validateTournamentScore = (score1: number | null, score2: number | null, matchLength: number): string | null => {
    if (score1 === null || score2 === null) return "Skorları girin.";
    if (score1 === score2) return "Beraberlik olamaz.";
    const winnerScore = Math.max(score1, score2);
    const loserScore = Math.min(score1, score2);
    if (winnerScore !== matchLength) return `Kazanan skoru ${matchLength} olmalıdır.`;
    if (loserScore >= matchLength) return `Kaybeden skoru ${matchLength}'dan küçük olmalıdır.`;
    if (loserScore < 0) return "Skor negatif olamaz.";
    return null;
  };

  const submitMatchScore = async (match: TournamentMatch) => {
    const matchLength = getMatchLength(match.tournament_id);
    const validationError = validateTournamentScore(match.score1, match.score2, matchLength);
    if (validationError) {
      toast({ title: "Hata", description: validationError, variant: "destructive" });
      return;
    }

    const winnerId = match.score1 > match.score2 ? match.player1_id : match.player2_id;
    const loserId = match.score1 > match.score2 ? match.player2_id : match.player1_id;

    const { error } = await supabase
      .from('tournament_matches')
      .update({ score1: match.score1, score2: match.score2, winner_id: winnerId })
      .eq('id', match.id);

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      return;
    }

    // Update loser's losses
    if (loserId) {
      const loserTP = tournamentPlayers.find(
        tp => tp.tournament_id === match.tournament_id && tp.player_id === loserId
      );
      if (loserTP) {
        const newLosses = loserTP.losses + 1;
        const isEliminated = newLosses >= 4;

        await supabase
          .from('tournament_players')
          .update({ losses: newLosses, is_eliminated: isEliminated })
          .eq('id', loserTP.id);

        setTournamentPlayers(prev => prev.map(tp =>
          tp.id === loserTP.id ? { ...tp, losses: newLosses, is_eliminated: isEliminated } : tp
        ));
      }
    }

    setTournamentMatches(prev => prev.map(m =>
      m.id === match.id ? { ...m, score1: match.score1, score2: match.score2, winner_id: winnerId } : m
    ));
    setEditingMatch(null);
    toast({ title: "Başarılı", description: "Skor kaydedildi." });
  };

  const updateMatchScore = async (match: TournamentMatch) => {
    const matchLength = getMatchLength(match.tournament_id);
    const validationError = validateTournamentScore(match.score1, match.score2, matchLength);
    if (validationError) {
      toast({ title: "Hata", description: validationError, variant: "destructive" });
      return;
    }

    const oldMatch = tournamentMatches.find(m => m.id === match.id);
    if (!oldMatch) return;

    const newWinnerId = match.score1 > match.score2 ? match.player1_id : match.player2_id;
    const newLoserId = match.score1 > match.score2 ? match.player2_id : match.player1_id;

    // If winner changed, revert old loser's loss and add to new loser
    if (oldMatch.winner_id && oldMatch.winner_id !== newWinnerId) {
      // Revert old loser (who was the non-winner)
      const oldLoserId = oldMatch.winner_id === oldMatch.player1_id ? oldMatch.player2_id : oldMatch.player1_id;
      if (oldLoserId) {
        const oldLoserTP = tournamentPlayers.find(
          tp => tp.tournament_id === match.tournament_id && tp.player_id === oldLoserId
        );
        if (oldLoserTP) {
          const revertedLosses = Math.max(0, oldLoserTP.losses - 1);
          // Calculate initial losses based on rights
          const initialLosses = 4 - oldLoserTP.initial_rights;
          const finalLosses = Math.max(initialLosses, revertedLosses);
          await supabase
            .from('tournament_players')
            .update({ losses: finalLosses, is_eliminated: finalLosses >= 4 })
            .eq('id', oldLoserTP.id);
          setTournamentPlayers(prev => prev.map(tp =>
            tp.id === oldLoserTP.id ? { ...tp, losses: finalLosses, is_eliminated: finalLosses >= 4 } : tp
          ));
        }
      }

      // Add loss to new loser
      if (newLoserId) {
        const newLoserTP = tournamentPlayers.find(
          tp => tp.tournament_id === match.tournament_id && tp.player_id === newLoserId
        );
        if (newLoserTP) {
          const newLosses = newLoserTP.losses + 1;
          await supabase
            .from('tournament_players')
            .update({ losses: newLosses, is_eliminated: newLosses >= 4 })
            .eq('id', newLoserTP.id);
          setTournamentPlayers(prev => prev.map(tp =>
            tp.id === newLoserTP.id ? { ...tp, losses: newLosses, is_eliminated: newLosses >= 4 } : tp
          ));
        }
      }
    }

    const { error } = await supabase
      .from('tournament_matches')
      .update({ score1: match.score1, score2: match.score2, winner_id: newWinnerId })
      .eq('id', match.id);

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      return;
    }

    setTournamentMatches(prev => prev.map(m =>
      m.id === match.id ? { ...m, score1: match.score1, score2: match.score2, winner_id: newWinnerId } : m
    ));
    setEditingMatch(null);
    toast({ title: "Başarılı", description: "Skor güncellendi." });
  };

  const getPlayerName = (playerId: string | null) => {
    if (!playerId) return 'BYE';
    return players.find(p => p.id === playerId)?.name || 'Bilinmeyen';
  };

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId);
  const currentTournamentPlayers = tournamentPlayers.filter(tp => tp.tournament_id === selectedTournamentId);
  const currentTournamentMatches = tournamentMatches.filter(tm => tm.tournament_id === selectedTournamentId);

  // Group matches by round
  const matchesByRound = new Map<number, TournamentMatch[]>();
  currentTournamentMatches.forEach(m => {
    const round = matchesByRound.get(m.round_number) || [];
    round.push(m);
    matchesByRound.set(m.round_number, round);
  });

  const getRemainingRights = (tp: TournamentPlayer) => {
    return Math.max(0, 4 - tp.losses);
  };

  const getGroupBorder = (index: number) => {
    if (index === 0) return 'border-t border-t-white/15';
    const prev = sortedPlayers[index - 1];
    const curr = sortedPlayers[index];
    if (prev.losses !== curr.losses || prev.is_eliminated !== curr.is_eliminated) {
      return 'border-t-2 border-t-white/40';
    }
    return 'border-t border-t-white/15';
  };

  // Sort tournament standings
  const sortedPlayers = [...currentTournamentPlayers].sort((a, b) => {
    // Eliminated at the bottom
    if (a.is_eliminated !== b.is_eliminated) return a.is_eliminated ? 1 : -1;
    // Fewer losses first
    if (a.losses !== b.losses) return a.losses - b.losses;
    // Head to head
    const h2h = currentTournamentMatches.find(m =>
      m.winner_id && (
        (m.player1_id === a.player_id && m.player2_id === b.player_id) ||
        (m.player1_id === b.player_id && m.player2_id === a.player_id)
      )
    );
    if (h2h?.winner_id === a.player_id) return -1;
    if (h2h?.winner_id === b.player_id) return 1;
    // General average
    const getAverage = (playerId: string) => {
      const pMatches = currentTournamentMatches.filter(m =>
        m.winner_id && (m.player1_id === playerId || m.player2_id === playerId)
      );
      let scored = 0, conceded = 0;
      pMatches.forEach(m => {
        if (m.player1_id === playerId) {
          scored += m.score1 || 0;
          conceded += m.score2 || 0;
        } else {
          scored += m.score2 || 0;
          conceded += m.score1 || 0;
        }
      });
      return scored - conceded;
    };
    const avgDiff = getAverage(b.player_id) - getAverage(a.player_id);
    if (avgDiff !== 0) return avgDiff;
    // Alphabetical
    return (getPlayerName(a.player_id)).localeCompare(getPlayerName(b.player_id), 'tr');
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Tournament */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Turnuva Yönetimi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <Label>Yeni Turnuva Oluştur</Label>
            <Input
              placeholder="Turnuva Adı"
              value={newTournamentName}
              onChange={e => setNewTournamentName(e.target.value)}
            />
            {newTournamentName.trim() && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Kaç Sayılık?</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 7, 9, 11, 13, 15, 17, 19, 21].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNewTournamentMatchLength(n)}
                        className={`w-9 h-8 rounded text-xs font-bold transition-colors ${
                          newTournamentMatchLength === n
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted-foreground/20 text-muted-foreground'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={createTournament} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Turnuva Oluştur
                </Button>
              </>
            )}
          </div>

          {/* Tournament List */}
          <div className="space-y-2">
            {tournaments.map(t => (
              <div
                key={t.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedTournamentId === t.id ? 'bg-primary/20 border border-primary/30' : 'bg-muted/30 hover:bg-muted/50'
                }`}
                onClick={() => setSelectedTournamentId(t.id)}
              >
                <div>
                  <p className="font-medium">{t.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={t.status === 'active' ? 'default' : 'secondary'}>
                      {t.status === 'active' ? 'Aktif' : 'Tamamlandı'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Tur: {t.current_round}</span>
                  </div>
                </div>
                <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); deleteTournament(t.id); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {tournaments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Henüz turnuva yok</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Tournament Management */}
      {selectedTournament && (
        <>
          {/* Players */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                {selectedTournament.name} - Oyuncular
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" onClick={() => { setShowAddPlayers(true); setSelectedPlayersForTournament(new Map()); }}>
                <Plus className="w-4 h-4 mr-2" />
                Oyuncu Ekle
              </Button>

              {/* Add Players Dialog */}
              <Dialog open={showAddPlayers} onOpenChange={setShowAddPlayers}>
                <DialogContent className="max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Turnuvaya Oyuncu Ekle</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 py-4 overflow-y-auto flex-1">
                    {players.map(p => {
                      const isSelected = selectedPlayersForTournament.has(p.id);
                      const alreadyInTournament = currentTournamentPlayers.some(tp => tp.player_id === p.id);
                      const currentRights = selectedPlayersForTournament.get(p.id) || 4;
                      return (
                        <div key={p.id} className={`flex items-center gap-2 p-2.5 rounded-lg ${alreadyInTournament ? 'bg-muted/30 opacity-50' : isSelected ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50'}`}>
                          <Checkbox
                            checked={isSelected}
                            disabled={alreadyInTournament}
                            onCheckedChange={() => togglePlayerSelection(p.id)}
                          />
                          <span className="flex-1 text-sm font-medium truncate">{p.name}</span>
                          {isSelected && (
                            <div className="flex gap-1">
                              {[4, 3, 2].map(r => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setPlayerRights(p.id, r)}
                                  className={`w-8 h-7 rounded text-xs font-bold transition-colors ${
                                    currentRights === r 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-muted hover:bg-muted-foreground/20 text-muted-foreground'
                                  }`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          )}
                          {alreadyInTournament && <Badge variant="outline" className="text-[10px]">Eklendi</Badge>}
                        </div>
                      );
                    })}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddPlayers(false)}>İptal</Button>
                    <Button onClick={addPlayersToTournament} disabled={selectedPlayersForTournament.size === 0}>
                      <Plus className="w-4 h-4 mr-2" />
                      Ekle ({selectedPlayersForTournament.size})
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Standings Table */}
              {sortedPlayers.length > 0 && (
                <div className="bg-card rounded-xl overflow-hidden border border-border">
                  <div className="grid grid-cols-[30px_1fr_40px_40px_40px] gap-0 px-3 py-2 bg-secondary/50 text-[10px] font-semibold text-muted-foreground">
                    <div className="text-center">#</div>
                    <div>Oyuncu</div>
                    <div className="text-center">G</div>
                    <div className="text-center">M</div>
                    <div className="text-center">Bye</div>
                  </div>
                  <div className="divide-y divide-border/50">
                    {sortedPlayers.map((tp, index) => {
                      const wins = currentTournamentMatches.filter(m => m.winner_id === tp.player_id).length;
                      const byeCount = currentTournamentMatches.filter(m => m.is_bye && m.player1_id === tp.player_id).length;
                      return (
                        <div
                          key={tp.id}
                          className={`grid grid-cols-[30px_1fr_40px_40px_40px] gap-0 px-3 py-2 text-xs items-center ${getGroupBorder(index)}`}
                        >
                          <div className="text-center text-muted-foreground font-medium">{index + 1}</div>
                          <div className="font-medium truncate">
                            {getPlayerName(tp.player_id)}
                            {tp.is_eliminated && <span className="ml-1 text-[9px] text-destructive font-bold">(ELENDİ)</span>}
                          </div>
                          <div className="text-center text-success">{wins}</div>
                          <div className="text-center text-primary">{tp.losses}</div>
                          <div className="text-center">{byeCount}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Remove players */}
              {currentTournamentPlayers.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Oyuncu Çıkar</Label>
                  {currentTournamentPlayers.map(tp => (
                    <div key={tp.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">{getPlayerName(tp.player_id)} ({tp.initial_rights} hak)</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePlayerFromTournament(tp.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Matches / Rounds */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Swords className="w-4 h-4" />
                Eşleştirmeler & Skorlar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={generateMatchesForRound} disabled={generatingMatches}>
                {generatingMatches ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shuffle className="w-4 h-4 mr-2" />}
                Eşleştirmeleri Başlat (Tur {selectedTournament.current_round + 1})
              </Button>

              {/* Rounds */}
              {Array.from(matchesByRound.entries())
                .sort(([a], [b]) => b - a)
                .map(([round, roundMatches]) => (
                <div key={round} className="space-y-2">
                  <h4 className="font-semibold text-sm">Tur {round}</h4>
                  <div className="space-y-2">
                    {roundMatches.map(match => (
                      <div key={match.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          {match.is_bye ? (
                            <p className="text-sm">
                              <span className="font-medium">{getPlayerName(match.player1_id)}</span>
                              <span className="text-success ml-2">BYE (Hükmen Galip)</span>
                            </p>
                          ) : (
                            <p className="text-sm">
                              <span className={match.winner_id === match.player1_id ? 'font-bold text-success' : ''}>
                                {getPlayerName(match.player1_id)}
                              </span>
                              <span className="mx-2 text-muted-foreground">
                                {match.score1 !== null ? `${match.score1} - ${match.score2}` : 'vs'}
                              </span>
                              <span className={match.winner_id === match.player2_id ? 'font-bold text-success' : ''}>
                                {getPlayerName(match.player2_id)}
                              </span>
                            </p>
                          )}
                        </div>
                        {!match.is_bye && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingMatch({ ...match })}
                              >
                                {match.score1 !== null ? <Edit className="w-3 h-3" /> : 'Skor Gir'}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{match.score1 !== null ? 'Skoru Düzenle' : 'Skor Gir'}</DialogTitle>
                              </DialogHeader>
                              {(() => {
                                const matchLength = getMatchLength(match.tournament_id);
                                const scoreOptions = Array.from({ length: matchLength + 1 }, (_, i) => i);
                                return (
                                  <>
                                    <div className="flex items-center gap-4 py-4">
                                      <div className="flex-1 text-center">
                                        <p className="text-sm mb-2 font-medium">{getPlayerName(editingMatch?.player1_id || null)}</p>
                                        <Select
                                          value={editingMatch?.score1?.toString() ?? ''}
                                          onValueChange={v => setEditingMatch(prev => prev ? { ...prev, score1: parseInt(v) } : null)}
                                        >
                                          <SelectTrigger className="text-center text-lg">
                                            <SelectValue placeholder="-" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {scoreOptions.map(n => (
                                              <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <span className="text-xl font-bold text-muted-foreground">-</span>
                                      <div className="flex-1 text-center">
                                        <p className="text-sm mb-2 font-medium">{getPlayerName(editingMatch?.player2_id || null)}</p>
                                        <Select
                                          value={editingMatch?.score2?.toString() ?? ''}
                                          onValueChange={v => setEditingMatch(prev => prev ? { ...prev, score2: parseInt(v) } : null)}
                                        >
                                          <SelectTrigger className="text-center text-lg">
                                            <SelectValue placeholder="-" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {scoreOptions.map(n => (
                                              <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <DialogClose asChild>
                                        <Button variant="outline">İptal</Button>
                                      </DialogClose>
                                      <Button onClick={() => {
                                        if (editingMatch) {
                                          const err = validateTournamentScore(editingMatch.score1, editingMatch.score2, matchLength);
                                          if (err) {
                                            toast({ title: "Hata", description: err, variant: "destructive" });
                                            return;
                                          }
                                          if (match.score1 !== null) {
                                            updateMatchScore(editingMatch);
                                          } else {
                                            submitMatchScore(editingMatch);
                                          }
                                        }
                                      }}>
                                        Kaydet
                                      </Button>
                                    </DialogFooter>
                                  </>
                                );
                              })()}
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {matchesByRound.size === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Henüz eşleştirme yapılmamış. Yukarıdaki butona tıklayarak ilk turu başlatın.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}