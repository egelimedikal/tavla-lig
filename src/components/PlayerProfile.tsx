import { useState } from 'react';
import { ArrowLeft, Trophy, Target, TrendingUp, Calendar, LogOut, Key, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { z } from 'zod';

const passwordSchema = z.string().min(4, 'Şifre en az 4 karakter olmalı');

interface Profile {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
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

interface PlayerProfileProps {
  player: Profile;
  stats: PlayerStats | undefined;
  matches: Match[];
  rank: number;
  getPlayerById: (id: string) => Profile | undefined;
  onBack: () => void;
  isOwnProfile?: boolean;
}

export function PlayerProfile({ player, stats, matches, rank, getPlayerById, onBack, isOwnProfile }: PlayerProfileProps) {
  const { signOut, updatePassword } = useAuth();
  const { toast } = useToast();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  const winRate = stats && stats.played > 0 
    ? Math.round((stats.won / stats.played) * 100) 
    : 0;

  const recentMatches = matches.slice(0, 5);

  const handleSignOut = async () => {
    await signOut();
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    
    try {
      passwordSchema.parse(newPassword);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setPasswordError(e.errors[0].message);
        return;
      }
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Şifreler eşleşmiyor');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        toast({
          title: 'Hata',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Başarılı',
          description: 'Şifreniz başarıyla değiştirildi.',
        });
        setShowPasswordDialog(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">Oyuncu Profili</h1>
          </div>
          {isOwnProfile && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPasswordDialog(true)}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
              >
                <Key className="w-5 h-5" />
              </button>
              <button
                onClick={handleSignOut}
                className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 text-primary"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
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
                {rank > 0 ? (
                  <>Sıralama: <span className="text-primary font-semibold">#{rank}</span></>
                ) : (
                  'Henüz sıralama yok'
                )}
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
                const isPlayer1 = match.player1_id === player.id;
                const opponent = getPlayerById(isPlayer1 ? match.player2_id : match.player1_id);
                const playerScore = isPlayer1 ? match.score1 : match.score2;
                const opponentScore = isPlayer1 ? match.score2 : match.score1;
                const isWin = match.winner_id === player.id;

                return (
                  <div key={match.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isWin ? 'bg-success' : 'bg-primary'}`} />
                      <div>
                        <p className="font-medium text-foreground">
                          vs {opponent?.name || 'Bilinmeyen'}
                        </p>
                        <p className="text-xs text-muted-foreground">{match.match_date}</p>
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

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Şifre Değiştir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Yeni Şifre</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Yeni Şifre (Tekrar)</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
            {passwordError && (
              <p className="text-sm text-primary">{passwordError}</p>
            )}
            <button
              onClick={handlePasswordChange}
              disabled={changingPassword || !newPassword || !confirmPassword}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {changingPassword ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Şifreyi Değiştir'
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
