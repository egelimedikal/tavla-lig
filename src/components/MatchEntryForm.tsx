import { useState } from 'react';
import { Player } from '@/types/league';
import { X, Check, Minus, Plus } from 'lucide-react';

interface MatchEntryFormProps {
  players: Player[];
  currentPlayerId?: string;
  onSubmit: (player1Id: string, player2Id: string, score1: number, score2: number) => void;
  onClose: () => void;
}

export function MatchEntryForm({ players, currentPlayerId, onSubmit, onClose }: MatchEntryFormProps) {
  const [player1Id, setPlayer1Id] = useState(currentPlayerId || '');
  const [player2Id, setPlayer2Id] = useState('');
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);

  const availablePlayers = players.filter(p => p.id !== player1Id);

  const handleScoreChange = (player: 1 | 2, delta: number) => {
    if (player === 1) {
      setScore1(prev => Math.max(0, Math.min(9, prev + delta)));
    } else {
      setScore2(prev => Math.max(0, Math.min(9, prev + delta)));
    }
  };

  const handleSubmit = () => {
    if (player1Id && player2Id && (score1 !== score2)) {
      onSubmit(player1Id, player2Id, score1, score2);
      onClose();
    }
  };

  const isValid = player1Id && player2Id && score1 !== score2;
  const player1 = players.find(p => p.id === player1Id);
  const player2 = players.find(p => p.id === player2Id);

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

          {/* Player Selection */}
          <div className="space-y-4">
            {/* Player 1 */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Oyuncu 1</label>
              <select
                value={player1Id}
                onChange={(e) => setPlayer1Id(e.target.value)}
                className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Oyuncu seçin</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>{player.name}</option>
                ))}
              </select>
            </div>

            {/* VS Divider */}
            <div className="flex items-center justify-center">
              <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">VS</span>
            </div>

            {/* Player 2 */}
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
            </div>
          </div>

          {/* Score Entry */}
          {player1Id && player2Id && (
            <div className="space-y-4 animate-fade-in">
              <label className="text-sm text-muted-foreground text-center block">Skor (0-9)</label>
              
              <div className="flex items-center justify-center gap-6">
                {/* Player 1 Score */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                    {player1?.name.split(' ')[0]}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleScoreChange(1, -1)}
                      className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className={`text-4xl font-bold w-12 text-center ${score1 > score2 ? 'text-success' : 'text-foreground'}`}>
                      {score1}
                    </span>
                    <button
                      onClick={() => handleScoreChange(1, 1)}
                      className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <span className="text-2xl text-muted-foreground">-</span>

                {/* Player 2 Score */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                    {player2?.name.split(' ')[0]}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleScoreChange(2, -1)}
                      className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className={`text-4xl font-bold w-12 text-center ${score2 > score1 ? 'text-success' : 'text-foreground'}`}>
                      {score2}
                    </span>
                    <button
                      onClick={() => handleScoreChange(2, 1)}
                      className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {score1 === score2 && score1 > 0 && (
                <p className="text-xs text-warning text-center">Beraberlik olamaz, skorları değiştirin</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              isValid
                ? 'bg-primary text-primary-foreground glow-primary hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <Check className="w-5 h-5" />
            Maçı Kaydet
          </button>

          {/* Info */}
          <p className="text-xs text-center text-muted-foreground pb-4">
            Kazanan: 2 Puan • Kaybeden: 1 Puan
          </p>
        </div>
      </div>
    </div>
  );
}
