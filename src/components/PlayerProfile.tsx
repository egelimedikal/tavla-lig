import { Player, Match, PlayerStats } from '@/types/league';
import { ArrowLeft, Trophy, Target, TrendingUp, Calendar } from 'lucide-react';

interface PlayerProfileProps {
  player: Player;
  stats: PlayerStats | undefined;
  matches: Match[];
  rank: number;
  getPlayerById: (id: string) => Player | undefined;
  onBack: () => void;
}

export function PlayerProfile({ player, stats, matches, rank, getPlayerById, onBack }: PlayerProfileProps) {
  const winRate = stats && stats.played > 0 
    ? Math.round((stats.won / stats.played) * 100) 
    : 0;

  const recentMatches = matches.slice(-5).reverse();

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Oyuncu Profili</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="p-4 space-y-6">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
              {player.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{player.name}</h2>
              <p className="text-sm text-muted-foreground">
                Sıralama: <span className="text-primary font-semibold">#{rank}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-gold" />
              <span className="text-xs text-muted-foreground">Galibiyet Oranı</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{winRate}%</p>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Toplam Puan</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.points || 0}</p>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Averaj</span>
            </div>
            <p className={`text-2xl font-bold ${stats && stats.average > 0 ? 'text-success' : stats && stats.average < 0 ? 'text-primary' : 'text-foreground'}`}>
              {stats && stats.average > 0 ? `+${stats.average}` : stats?.average || 0}
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Maç Sayısı</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.played || 0}</p>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold mb-3">Performans Özeti</h3>
          <div className="flex gap-4">
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold text-success">{stats?.won || 0}</p>
              <p className="text-xs text-muted-foreground">Galibiyet</p>
            </div>
            <div className="w-px bg-border" />
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold text-primary">{stats?.lost || 0}</p>
              <p className="text-xs text-muted-foreground">Mağlubiyet</p>
            </div>
            <div className="w-px bg-border" />
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold text-foreground">{stats?.scored || 0}</p>
              <p className="text-xs text-muted-foreground">Attığı</p>
            </div>
            <div className="w-px bg-border" />
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold text-foreground">{stats?.conceded || 0}</p>
              <p className="text-xs text-muted-foreground">Yediği</p>
            </div>
          </div>
        </div>

        {/* Recent Matches */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Son Maçlar</h3>
          </div>
          
          {recentMatches.length > 0 ? (
            <div className="divide-y divide-border/50">
              {recentMatches.map(match => {
                const isPlayer1 = match.player1Id === player.id;
                const opponent = getPlayerById(isPlayer1 ? match.player2Id : match.player1Id);
                const playerScore = isPlayer1 ? match.score1 : match.score2;
                const opponentScore = isPlayer1 ? match.score2 : match.score1;
                const isWin = match.winnerId === player.id;

                return (
                  <div key={match.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isWin ? 'bg-success' : 'bg-primary'}`} />
                      <div>
                        <p className="font-medium text-foreground">
                          vs {opponent?.name || 'Bilinmeyen'}
                        </p>
                        <p className="text-xs text-muted-foreground">{match.date}</p>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${isWin ? 'text-success' : 'text-primary'}`}>
                      {playerScore} - {opponentScore}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p>Henüz maç oynanmamış</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
