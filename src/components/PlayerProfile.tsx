import { useState, useRef, useMemo } from 'react';
import { ArrowLeft, Trophy, LogOut, Key, Loader2, Camera, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
}

interface Association {
  id: string;
  name: string;
  current_year: number | null;
  active_season: string | null;
}

interface LeaguePlayer {
  id: string;
  league_id: string;
  player_id: string;
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

interface LeagueStats {
  league: League;
  association: Association | null;
  played: number;
  won: number;
  lost: number;
  matches: Match[];
  remainingOpponents: Profile[];
}

interface PlayerProfileProps {
  player: Profile;
  stats: PlayerStats | undefined;
  matches: Match[];
  allMatches: Match[];
  leagues: League[];
  associations: Association[];
  leaguePlayers: LeaguePlayer[];
  rank: number;
  getPlayerById: (id: string) => Profile | undefined;
  onBack: () => void;
  isOwnProfile?: boolean;
  onProfileUpdate?: () => void;
  addMatch: (player1Id: string, player2Id: string, score1: number, score2: number) => Promise<Match | null>;
}

export function PlayerProfile({ 
  player, 
  stats, 
  matches, 
  allMatches,
  leagues,
  associations,
  leaguePlayers,
  rank, 
  getPlayerById, 
  onBack, 
  isOwnProfile,
  onProfileUpdate,
  addMatch
}: PlayerProfileProps) {
  const { signOut, updatePassword, user } = useAuth();
  const { toast } = useToast();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [expandedLeagues, setExpandedLeagues] = useState<Set<string>>(new Set());
  const [scoreEntryMatch, setScoreEntryMatch] = useState<{ leagueId: string; opponentId: string } | null>(null);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [submittingMatch, setSubmittingMatch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const winRate = stats && stats.played > 0 
    ? Math.round((stats.won / stats.played) * 100) 
    : 0;

  // Calculate stats per league for this player
  const leagueStats = useMemo((): LeagueStats[] => {
    const playerMatches = allMatches.filter(m => m.player1_id === player.id || m.player2_id === player.id);
    const leagueMap = new Map<string, LeagueStats>();
    
    // Get all leagues the player is assigned to
    const playerLeagueIds = leaguePlayers
      .filter(lp => lp.player_id === player.id)
      .map(lp => lp.league_id);
    
    // Initialize leagues player is assigned to
    playerLeagueIds.forEach(leagueId => {
      const league = leagues.find(l => l.id === leagueId);
      if (!league) return;
      
      const association = associations.find(a => a.id === league.association_id) || null;
      
      // Get all players in this league
      const leaguePlayerIds = leaguePlayers
        .filter(lp => lp.league_id === leagueId && lp.player_id !== player.id)
        .map(lp => lp.player_id);
      
      // Get played opponent IDs from matches
      const playedOpponentIds = new Set<string>();
      playerMatches
        .filter(m => m.league_id === leagueId)
        .forEach(m => {
          const opponentId = m.player1_id === player.id ? m.player2_id : m.player1_id;
          playedOpponentIds.add(opponentId);
        });
      
      // Calculate remaining opponents
      const remainingOpponents = leaguePlayerIds
        .filter(id => !playedOpponentIds.has(id))
        .map(id => getPlayerById(id))
        .filter((p): p is Profile => p !== undefined);
      
      leagueMap.set(leagueId, {
        league,
        association,
        played: 0,
        won: 0,
        lost: 0,
        matches: [],
        remainingOpponents,
      });
    });
    
    // Add matches data
    playerMatches.forEach(match => {
      const league = leagues.find(l => l.id === match.league_id);
      if (!league) return;
      
      if (!leagueMap.has(match.league_id)) {
        const association = associations.find(a => a.id === league.association_id) || null;
        leagueMap.set(match.league_id, {
          league,
          association,
          played: 0,
          won: 0,
          lost: 0,
          matches: [],
          remainingOpponents: [],
        });
      }
      
      const leagueStat = leagueMap.get(match.league_id)!;
      leagueStat.played++;
      leagueStat.matches.push(match);
      if (match.winner_id === player.id) {
        leagueStat.won++;
      } else {
        leagueStat.lost++;
      }
    });
    
    // Sort matches by date (newest first)
    leagueMap.forEach(stat => {
      stat.matches.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
    });
    
    return Array.from(leagueMap.values());
  }, [allMatches, player.id, leagues, associations, leaguePlayers, getPlayerById]);

  // Get current active season from associations
  const currentSeason = useMemo(() => {
    const activeAssociations = associations.filter(a => a.current_year || a.active_season);
    if (activeAssociations.length > 0) {
      const a = activeAssociations[0];
      return {
        year: a.current_year,
        season: a.active_season,
      };
    }
    return null;
  }, [associations]);

  // Total stats across all leagues
  const totalStats = useMemo(() => {
    return leagueStats.reduce((acc, ls) => ({
      played: acc.played + ls.played,
      won: acc.won + ls.won,
      lost: acc.lost + ls.lost,
    }), { played: 0, won: 0, lost: 0 });
  }, [leagueStats]);

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

  const handleAvatarClick = () => {
    if (isOwnProfile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Hata',
        description: 'Sadece resim dosyaları yükleyebilirsiniz.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Hata',
        description: 'Dosya boyutu 2MB\'dan küçük olmalıdır.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', player.id);

      if (updateError) throw updateError;

      toast({
        title: 'Başarılı',
        description: 'Profil fotoğrafınız güncellendi.',
      });

      onProfileUpdate?.();
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: 'Hata',
        description: error.message || 'Fotoğraf yüklenirken hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleLeagueExpand = (leagueId: string) => {
    setExpandedLeagues(prev => {
      const next = new Set(prev);
      if (next.has(leagueId)) {
        next.delete(leagueId);
      } else {
        next.add(leagueId);
      }
      return next;
    });
  };

  const handleScoreSubmit = async (leagueId: string, opponentId: string) => {
    if (score1 === score2) {
      toast({
        title: 'Hata',
        description: 'Skorlar eşit olamaz!',
        variant: 'destructive',
      });
      return;
    }
    
    setSubmittingMatch(true);
    try {
      const result = await addMatch(player.id, opponentId, score1, score2);
      if (result) {
        const winner = score1 > score2 ? player.name : getPlayerById(opponentId)?.name;
        toast({
          title: 'Maç Kaydedildi! ⚔️',
          description: `${winner} maçı kazandı (${score1}-${score2})`,
        });
        setScoreEntryMatch(null);
        setScore1(0);
        setScore2(0);
        onProfileUpdate?.();
      }
    } finally {
      setSubmittingMatch(false);
    }
  };

  const openScoreEntry = (leagueId: string, opponentId: string) => {
    setScoreEntryMatch({ leagueId, opponentId });
    setScore1(0);
    setScore2(0);
  };

  const formatMatchDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
            <div 
              className={`relative w-16 h-16 rounded-full overflow-hidden ${isOwnProfile ? 'cursor-pointer' : ''}`}
              onClick={handleAvatarClick}
            >
              {player.avatar_url ? (
                <img 
                  src={player.avatar_url} 
                  alt={player.name || 'Oyuncu'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                  {player.name?.charAt(0) || '?'}
                </div>
              )}
              {isOwnProfile && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  {uploadingAvatar ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{player.name || 'Bilinmeyen Oyuncu'}</h2>
              <p className="text-sm text-muted-foreground">
                {rank > 0 ? (
                  <>Sıralama: <span className="text-primary font-semibold">#{rank}</span></>
                ) : (
                  'Henüz sıralama yok'
                )}
              </p>
              {currentSeason && (
                <p className="text-xs text-muted-foreground mt-1">
                  {currentSeason.year && <span className="text-primary font-medium">{currentSeason.year}</span>}
                  {currentSeason.year && currentSeason.season && ' - '}
                  {currentSeason.season}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold mb-3">Genel İstatistikler</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">{totalStats.played}</p>
              <p className="text-xs text-muted-foreground">Toplam Maç</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{totalStats.won}</p>
              <p className="text-xs text-muted-foreground">Galibiyet</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{totalStats.lost}</p>
              <p className="text-xs text-muted-foreground">Mağlubiyet</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="w-4 h-4 text-gold" />
              </div>
              <p className="text-2xl font-bold text-foreground">{winRate}%</p>
              <p className="text-xs text-muted-foreground">Oran</p>
            </div>
          </div>
          {leagueStats.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Oynadığı Ligler:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {leagueStats.map(ls => (
                  <span 
                    key={ls.league.id}
                    className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-medium"
                  >
                    {ls.league.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Leagues & Matches */}
        <div className="space-y-4">
          <h3 className="font-semibold px-1">Oynadığı Ligler</h3>
          
          {leagueStats.length > 0 ? (
            leagueStats.map(ls => {
              const isExpanded = expandedLeagues.has(ls.league.id);
              return (
                <div key={ls.league.id} className="bg-card rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => toggleLeagueExpand(ls.league.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{ls.league.name}</p>
                      {ls.association && (
                        <p className="text-xs text-muted-foreground">
                          {ls.association.current_year && (
                            <span className="text-primary">{ls.association.current_year}</span>
                          )}
                          {ls.association.current_year && ls.association.active_season && ' • '}
                          {ls.association.active_season}
                        </p>
                      )}
                      <div className="flex gap-3 mt-1 text-xs">
                        <span className="text-muted-foreground">
                          {ls.played} maç
                        </span>
                        <span className="text-success">{ls.won} G</span>
                        <span className="text-primary">{ls.lost} M</span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t border-border">
                      {/* Played Matches Section */}
                      {ls.matches.length > 0 && (
                        <div className="divide-y divide-border/50">
                          <div className="px-4 py-2 bg-secondary/30">
                            <p className="text-xs font-medium text-muted-foreground">Oynanan Maçlar</p>
                          </div>
                          {ls.matches.map(match => {
                            const isPlayer1 = match.player1_id === player.id;
                            const opponent = getPlayerById(isPlayer1 ? match.player2_id : match.player1_id);
                            const isWin = match.winner_id === player.id;

                            return (
                              <div key={match.id} className="p-4">
                                <p className="text-xs text-muted-foreground mb-2">{formatMatchDate(match.match_date)}</p>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className={`text-sm ${isWin ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                                      {player.name || 'Oyuncu'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-lg font-bold">
                                    <span className={isWin ? 'text-success' : 'text-primary'}>{isPlayer1 ? match.score1 : match.score2}</span>
                                    <span className="text-muted-foreground">-</span>
                                    <span className={!isWin ? 'text-success' : 'text-primary'}>{isPlayer1 ? match.score2 : match.score1}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`text-sm ${!isWin ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                                      {opponent?.name || 'Bilinmeyen'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Remaining Matches Section */}
                      {ls.remainingOpponents.length > 0 && (
                        <div className="divide-y divide-border/50">
                          <div className="px-4 py-2 bg-secondary/30 border-t border-border">
                            <p className="text-xs font-medium text-muted-foreground">Kalan Maçlar</p>
                          </div>
                          {ls.remainingOpponents.map(opponent => {
                            const isEditing = scoreEntryMatch?.leagueId === ls.league.id && scoreEntryMatch?.opponentId === opponent.id;
                            
                            return (
                              <div key={opponent.id} className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm text-foreground">{player.name || 'Oyuncu'}</span>
                                  </div>
                                  
                                  {isEditing ? (
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => setScore1(Math.max(0, score1 - 1))}
                                          className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-xs hover:bg-secondary/80"
                                        >
                                          -
                                        </button>
                                        <span className="w-6 text-center font-bold">{score1}</span>
                                        <button
                                          onClick={() => setScore1(Math.min(9, score1 + 1))}
                                          className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-xs hover:bg-secondary/80"
                                        >
                                          +
                                        </button>
                                      </div>
                                      <span className="text-muted-foreground">-</span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => setScore2(Math.max(0, score2 - 1))}
                                          className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-xs hover:bg-secondary/80"
                                        >
                                          -
                                        </button>
                                        <span className="w-6 text-center font-bold">{score2}</span>
                                        <button
                                          onClick={() => setScore2(Math.min(9, score2 + 1))}
                                          className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-xs hover:bg-secondary/80"
                                        >
                                          +
                                        </button>
                                      </div>
                                      <button
                                        onClick={() => handleScoreSubmit(ls.league.id, opponent.id)}
                                        disabled={submittingMatch || score1 === score2}
                                        className="w-7 h-7 rounded-full bg-success flex items-center justify-center hover:bg-success/80 disabled:opacity-50"
                                      >
                                        {submittingMatch ? (
                                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                                        ) : (
                                          <Check className="w-4 h-4 text-white" />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => setScoreEntryMatch(null)}
                                        className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30"
                                      >
                                        <X className="w-4 h-4 text-primary" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      {isOwnProfile ? (
                                        <button
                                          onClick={() => openScoreEntry(ls.league.id, opponent.id)}
                                          className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                                        >
                                          Skor Gir
                                        </button>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">- : -</span>
                                      )}
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm text-foreground">{opponent.name || 'Bilinmeyen'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {ls.matches.length === 0 && ls.remainingOpponents.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          Bu ligde maç bilgisi yok
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-card rounded-xl p-8 border border-border text-center text-muted-foreground">
              <p>Henüz hiçbir ligde maç oynanmamış</p>
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
