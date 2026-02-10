import { useState, useRef, useMemo, useEffect } from 'react';
import { ArrowLeft, Trophy, LogOut, Key, Loader2, Camera, Check, X, Eye, EyeOff } from 'lucide-react';
import { TournamentPlayerProfile } from '@/components/TournamentPlayerProfile';
import { logger } from '@/lib/logger';
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
  status?: string;
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
  addMatch: (player1Id: string, player2Id: string, score1: number, score2: number, leagueId?: string) => Promise<Match | null>;
  calculateStats?: (leagueId: string) => PlayerStats[];
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
  addMatch,
  calculateStats
}: PlayerProfileProps) {
  const { signOut, updatePassword, user } = useAuth();
  const { toast } = useToast();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
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
      
      // Calculate remaining opponents (sorted alphabetically by name)
      const remainingOpponents = leaguePlayerIds
        .filter(id => !playedOpponentIds.has(id))
        .map(id => getPlayerById(id))
        .filter((p): p is Profile => p !== undefined)
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
      
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
    
    // Only return active leagues
    return Array.from(leagueMap.values()).filter(ls => ls.league.status === 'active');
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

      // Get public URL with cache-busting parameter
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: cacheBustedUrl })
        .eq('id', player.id);

      if (updateError) throw updateError;

      toast({
        title: 'Başarılı',
        description: 'Profil fotoğrafınız güncellendi.',
      });

      onProfileUpdate?.();
    } catch (error: any) {
      logger.error('Avatar upload error:', error);
      toast({
        title: 'Hata',
        description: error.message || 'Fotoğraf yüklenirken hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Set default selected league when leagueStats changes
  useEffect(() => {
    if (leagueStats.length > 0 && !selectedLeagueId) {
      setSelectedLeagueId(leagueStats[0].league.id);
    }
  }, [leagueStats, selectedLeagueId]);

  const selectedLeague = useMemo(() => {
    return leagueStats.find(ls => ls.league.id === selectedLeagueId) || leagueStats[0] || null;
  }, [leagueStats, selectedLeagueId]);

  // Calculate dynamic rank for selected league
  const dynamicRank = useMemo(() => {
    if (!selectedLeagueId || !calculateStats) return rank;
    const leagueStandings = calculateStats(selectedLeagueId);
    const playerIndex = leagueStandings.findIndex(s => s.playerId === player.id);
    return playerIndex >= 0 ? playerIndex + 1 : 0;
  }, [selectedLeagueId, calculateStats, player.id, rank]);

  const handleScoreSubmit = async (leagueId: string, opponentId: string) => {
    // Beraberlik kontrolü
    if (score1 === score2) {
      toast({
        title: 'Hata',
        description: 'Berabere skor girilemez! (Örn: 9-9)',
        variant: 'destructive',
      });
      return;
    }
    
    // Galip mutlaka 9 olmalı kontrolü
    const maxScore = Math.max(score1, score2);
    if (maxScore !== 9) {
      toast({
        title: 'Hata',
        description: 'Kazanan oyuncunun skoru 9 olmalıdır!',
        variant: 'destructive',
      });
      return;
    }
    
    setSubmittingMatch(true);
    try {
      // leagueId'yi addMatch'e doğru şekilde geçir
      const result = await addMatch(player.id, opponentId, score1, score2, leagueId);
      if (result) {
        const winner = score1 > score2 ? player.name : getPlayerById(opponentId)?.name;
        const leagueName = leagues.find(l => l.id === leagueId)?.name || '';
        toast({
          title: 'Maç Kaydedildi! ⚔️',
          description: `${leagueName}: ${winner} maçı kazandı (${score1}-${score2})`,
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
                {dynamicRank > 0 ? (
                  <>Sıralama: <span className="text-primary font-semibold">#{dynamicRank}</span></>
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

        {/* Stats Table - shows stats for selected league */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 font-medium text-muted-foreground">Oynadığı Grup(lar)</td>
                <td className="px-4 py-3 text-foreground">
                  {leagueStats.length > 0 
                    ? leagueStats.map(ls => ls.league.name).join(' - ')
                    : '-'
                  }
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-muted-foreground">Oynanan Maç</td>
                <td className="px-4 py-3 text-foreground">{selectedLeague?.played ?? totalStats.played}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-muted-foreground">Galibiyet</td>
                <td className="px-4 py-3 text-success font-medium">{selectedLeague?.won ?? totalStats.won}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-muted-foreground">Mağlubiyet</td>
                <td className="px-4 py-3 text-primary font-medium">{selectedLeague?.lost ?? totalStats.lost}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-muted-foreground">Galibiyet Oranı</td>
                <td className="px-4 py-3 text-foreground">
                  {selectedLeague && selectedLeague.played > 0 
                    ? <span className={selectedLeague.won / selectedLeague.played >= 0.5 ? 'text-success font-semibold' : 'text-primary font-semibold'}>
                        %{Math.round((selectedLeague.won / selectedLeague.played) * 100)}
                      </span>
                    : totalStats.played > 0 
                      ? <span className={totalStats.won / totalStats.played >= 0.5 ? 'text-success font-semibold' : 'text-primary font-semibold'}>
                          %{Math.round((totalStats.won / totalStats.played) * 100)}
                        </span>
                      : '-'
                  }
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Son Oynadığı Maçlar with League Tabs */}
        {leagueStats.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold px-1">Son Oynadığı Maçlar</h3>
            
            {/* League Tab Buttons */}
            <div className="flex flex-wrap gap-2 border-b border-border pb-3">
              {leagueStats.map(ls => (
                <button
                  key={ls.league.id}
                  onClick={() => setSelectedLeagueId(ls.league.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    selectedLeagueId === ls.league.id
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {ls.league.name}
                </button>
              ))}
            </div>

            {/* Matches Table */}
            {selectedLeague && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {selectedLeague.matches.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">Zaman</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">Oyuncular</th>
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">Skor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {selectedLeague.matches.map(match => {
                        const isPlayer1 = match.player1_id === player.id;
                        const opponent = getPlayerById(isPlayer1 ? match.player2_id : match.player1_id);
                        const playerWon = match.winner_id === player.id;
                        const opponentWon = match.winner_id !== player.id;
                        
                        const playerName = player.name?.toUpperCase() || 'OYUNCU';
                        const opponentName = opponent?.name?.toUpperCase() || 'BİLİNMEYEN';

                        return (
                          <tr key={match.id}>
                            <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap">
                              {formatMatchDate(match.match_date)}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <span className={playerWon ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                                {playerName}
                              </span>
                              <span className="text-muted-foreground"> - </span>
                              <span className={opponentWon ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                                {opponentName}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center text-xs font-medium">
                              {isPlayer1 ? match.score1 : match.score2} - {isPlayer1 ? match.score2 : match.score1}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-muted-foreground">
                    Bu ligde henüz maç oynanmamış
                  </div>
                )}
              </div>
            )}

            {/* Kalan Maçlar */}
            {selectedLeague && selectedLeague.remainingOpponents.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold px-1 text-sm">Kalan Maçları</h4>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-border/50">
                      {selectedLeague.remainingOpponents.map(opponent => {
                        const isEditing = scoreEntryMatch?.leagueId === selectedLeague.league.id && scoreEntryMatch?.opponentId === opponent.id;
                        const playerName = player.name?.toUpperCase() || 'OYUNCU';
                        const opponentName = opponent.name?.toUpperCase() || 'BİLİNMEYEN';
                        
                        return (
                          <tr key={opponent.id}>
                            <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap">-</td>
                            <td className="px-3 py-2 text-xs">
                              <span className="text-muted-foreground">{playerName}</span>
                              <span className="text-muted-foreground"> - </span>
                              <span className="text-muted-foreground">{opponentName}</span>
                            </td>
                            <td className="px-3 py-2 text-center text-xs">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-2">
                                  <select
                                    value={score1}
                                    onChange={(e) => setScore1(Number(e.target.value))}
                                    className="w-12 h-8 rounded border border-border bg-background text-center font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                      <option key={num} value={num}>{num}</option>
                                    ))}
                                  </select>
                                  <span className="text-muted-foreground font-bold">-</span>
                                  <select
                                    value={score2}
                                    onChange={(e) => setScore2(Number(e.target.value))}
                                    className="w-12 h-8 rounded border border-border bg-background text-center font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                      <option key={num} value={num}>{num}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleScoreSubmit(selectedLeague.league.id, opponent.id)}
                                    disabled={submittingMatch || score1 === score2 || Math.max(score1, score2) !== 9}
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
                                isOwnProfile ? (
                                  <button
                                    onClick={() => openScoreEntry(selectedLeague.league.id, opponent.id)}
                                    className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                                  >
                                    Skor Gir
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground">- : -</span>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tournament Stats */}
        <TournamentPlayerProfile 
          playerId={player.id} 
          getPlayerById={getPlayerById} 
        />
      </div>
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Şifre Değiştir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Yeni Şifre</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 pr-12 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Yeni Şifre (Tekrar)</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 pr-12 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
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
