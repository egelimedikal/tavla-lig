import { useState } from 'react';
import { X, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Profile {
  id: string;
  user_id: string | null;
  name: string;
  phone?: string | null;
  avatar_url: string | null;
}

interface Match {
  player1_id: string;
  player2_id: string;
}

interface MatchEntryFormProps {
  players: Profile[];
  leagueMatches: Match[];
  currentPlayerId?: string;
  matchLength?: number;
  onSubmit: (player1Id: string, player2Id: string, score1: number, score2: number) => void;
  onClose: () => void;
}

function getPlayedOpponents(playerId: string, matches: Match[]): Set<string> {
  const opponents = new Set<string>();
  for (const m of matches) {
    if (m.player1_id === playerId) opponents.add(m.player2_id);
    if (m.player2_id === playerId) opponents.add(m.player1_id);
  }
  return opponents;
}

export function MatchEntryForm({ players, leagueMatches, currentPlayerId, matchLength = 9, onSubmit, onClose }: MatchEntryFormProps) {
  const [player1Id, setPlayer1Id] = useState(currentPlayerId || '');
  const [player2Id, setPlayer2Id] = useState('');
  const [score1, setScore1] = useState<number | null>(null);
  const [score2, setScore2] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const playedOpponents = player1Id ? getPlayedOpponents(player1Id, leagueMatches) : new Set<string>();
  const availablePlayers = players.filter(p => p.id !== player1Id && !playedOpponents.has(p.id));

  // Reset player2 if they become unavailable
  const handlePlayer1Change = (id: string) => {
    setPlayer1Id(id);
    setPlayer2Id('');
    setScore1(null);
    setScore2(null);
  };

  const handleSubmit = async () => {
    if (player1Id && player2Id && score1 !== null && score2 !== null && score1 !== score2 && Math.max(score1, score2) === matchLength) {
      setSubmitting(true);
      await onSubmit(player1Id, player2Id, score1, score2);
      setSubmitting(false);
      onClose();
    }
  };

  const s1 = score1 ?? -1;
  const s2 = score2 ?? -1;
  const maxScore = Math.max(s1, s2);
  const isValid = player1Id && player2Id && score1 !== null && score2 !== null && s1 !== s2 && maxScore === matchLength;
  const player1 = players.find(p => p.id === player1Id);
  const player2 = players.find(p => p.id === player2Id);

  const scoreOptions = Array.from({ length: matchLength + 1 }, (_, i) => i);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-x-4 bottom-0 top-auto bg-card rounded-t-2xl border border-border animate-slide-up">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Maç Sonucu Gir</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {players.length < 2 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Maç girişi için en az 2 oyuncu gerekli.</p>
              <p className="text-sm mt-2">Önce kayıt olun ve diğer oyuncuları bekleyin.</p>
            </div>
          ) : (
            <>
              {/* Player Selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Oyuncu 1</label>
                  <select
                    value={player1Id}
                    onChange={(e) => handlePlayer1Change(e.target.value)}
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Oyuncu seçin</option>
                    {players.map(player => (
                      <option key={player.id} value={player.id}>{player.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-center">
                  <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">VS</span>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Oyuncu 2 (Rakip)</label>
                  <select
                    value={player2Id}
                    onChange={(e) => setPlayer2Id(e.target.value)}
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={!player1Id}
                  >
                    <option value="">Rakip seçin</option>
                    {availablePlayers.map(player => (
                      <option key={player.id} value={player.id}>{player.name}</option>
                    ))}
                  </select>
                  {player1Id && availablePlayers.length === 0 && (
                    <p className="text-xs text-warning text-center">Bu oyuncunun tüm rakiplerle maçı girilmiş.</p>
                  )}
                </div>
              </div>

              {/* Score Entry with Select dropdowns */}
              {player1Id && player2Id && (
                <div className="space-y-4 animate-fade-in">
                  <label className="text-sm text-muted-foreground text-center block">Skor (0-{matchLength})</label>
                  
                  <div className="flex items-center justify-center gap-6">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                        {player1?.name.split(' ')[0]}
                      </span>
                      <Select
                        value={score1 !== null ? String(score1) : undefined}
                        onValueChange={(v) => setScore1(Number(v))}
                      >
                        <SelectTrigger className={`w-20 h-14 text-2xl font-bold justify-center ${score1 !== null && score2 !== null && s1 > s2 ? 'text-success' : ''}`}>
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {scoreOptions.map(n => (
                            <SelectItem key={n} value={String(n)} className="text-lg font-bold justify-center">
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <span className="text-2xl text-muted-foreground mt-6">-</span>

                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                        {player2?.name.split(' ')[0]}
                      </span>
                      <Select
                        value={score2 !== null ? String(score2) : undefined}
                        onValueChange={(v) => setScore2(Number(v))}
                      >
                        <SelectTrigger className={`w-20 h-14 text-2xl font-bold justify-center ${score1 !== null && score2 !== null && s2 > s1 ? 'text-success' : ''}`}>
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {scoreOptions.map(n => (
                            <SelectItem key={n} value={String(n)} className="text-lg font-bold justify-center">
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {score1 !== null && score2 !== null && s1 === s2 && s1 > 0 && (
                    <p className="text-xs text-warning text-center">Beraberlik olamaz, skorları değiştirin</p>
                  )}
                  {score1 !== null && score2 !== null && s1 !== s2 && maxScore !== matchLength && maxScore > 0 && (
                    <p className="text-xs text-warning text-center">Kazanan oyuncunun skoru {matchLength} olmalıdır</p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!isValid || submitting}
                className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  isValid && !submitting
                    ? 'bg-primary text-primary-foreground glow-primary hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <span className="animate-pulse">Kaydediliyor...</span>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Maçı Kaydet
                  </>
                )}
              </button>

              <p className="text-xs text-center text-muted-foreground pb-4">
                Kazanan: 2 Puan • Kaybeden: 1 Puan
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
