import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Edit, Users, Trophy, Gamepad2, Loader2, Shield } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  name: string;
}

interface League {
  id: string;
  name: string;
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

interface LeaguePlayer {
  id: string;
  league_id: string;
  player_id: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const { toast } = useToast();
  
  const [leagues, setLeagues] = useState<League[]>([]);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [leaguePlayers, setLeaguePlayers] = useState<LeaguePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueId, setNewLeagueId] = useState('');
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [selectedLeagueForPlayer, setSelectedLeagueForPlayer] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      toast({
        title: "Erişim Reddedildi",
        description: "Bu sayfaya erişim yetkiniz yok.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [isAdmin, adminLoading, user, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leaguesRes, playersRes, matchesRes, leaguePlayersRes] = await Promise.all([
        supabase.from('leagues').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('matches').select('*').order('match_date', { ascending: false }),
        supabase.from('league_players').select('*'),
      ]);

      if (leaguesRes.data) setLeagues(leaguesRes.data);
      if (playersRes.data) setPlayers(playersRes.data);
      if (matchesRes.data) setMatches(matchesRes.data);
      if (leaguePlayersRes.data) setLeaguePlayers(leaguePlayersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addLeague = async () => {
    if (!newLeagueName.trim() || !newLeagueId.trim()) {
      toast({
        title: "Hata",
        description: "Lig adı ve ID'si gerekli.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('leagues')
      .insert({ id: newLeagueId, name: newLeagueName })
      .select()
      .single();

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setLeagues(prev => [...prev, data]);
      setNewLeagueName('');
      setNewLeagueId('');
      toast({
        title: "Başarılı",
        description: "Lig eklendi.",
      });
    }
  };

  const updateLeague = async () => {
    if (!editingLeague) return;

    const { error } = await supabase
      .from('leagues')
      .update({ name: editingLeague.name })
      .eq('id', editingLeague.id);

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setLeagues(prev => prev.map(l => l.id === editingLeague.id ? editingLeague : l));
    setEditingLeague(null);
    toast({
      title: "Başarılı",
      description: "Lig güncellendi.",
    });
  };

  const deleteLeague = async (leagueId: string) => {
    const { error } = await supabase
      .from('leagues')
      .delete()
      .eq('id', leagueId);

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setLeagues(prev => prev.filter(l => l.id !== leagueId));
    toast({
      title: "Başarılı",
      description: "Lig silindi.",
    });
  };

  const addPlayerToLeague = async () => {
    if (!selectedLeagueForPlayer || !selectedPlayer) {
      toast({
        title: "Hata",
        description: "Lig ve oyuncu seçimi gerekli.",
        variant: "destructive",
      });
      return;
    }

    // Check if already in league
    const existing = leaguePlayers.find(
      lp => lp.league_id === selectedLeagueForPlayer && lp.player_id === selectedPlayer
    );

    if (existing) {
      toast({
        title: "Hata",
        description: "Oyuncu zaten bu ligde.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('league_players')
      .insert({ league_id: selectedLeagueForPlayer, player_id: selectedPlayer })
      .select()
      .single();

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setLeaguePlayers(prev => [...prev, data]);
      setSelectedPlayer('');
      toast({
        title: "Başarılı",
        description: "Oyuncu lige eklendi.",
      });
    }
  };

  const removePlayerFromLeague = async (lpId: string) => {
    const { error } = await supabase
      .from('league_players')
      .delete()
      .eq('id', lpId);

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setLeaguePlayers(prev => prev.filter(lp => lp.id !== lpId));
    toast({
      title: "Başarılı",
      description: "Oyuncu ligden çıkarıldı.",
    });
  };

  const updateMatch = async () => {
    if (!editingMatch) return;

    const winnerId = editingMatch.score1 > editingMatch.score2 
      ? editingMatch.player1_id 
      : editingMatch.player2_id;

    const { error } = await supabase
      .from('matches')
      .update({ 
        score1: editingMatch.score1, 
        score2: editingMatch.score2,
        winner_id: winnerId,
      })
      .eq('id', editingMatch.id);

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setMatches(prev => prev.map(m => m.id === editingMatch.id 
      ? { ...editingMatch, winner_id: winnerId } 
      : m
    ));
    setEditingMatch(null);
    toast({
      title: "Başarılı",
      description: "Maç güncellendi.",
    });
  };

  const deleteMatch = async (matchId: string) => {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setMatches(prev => prev.filter(m => m.id !== matchId));
    toast({
      title: "Başarılı",
      description: "Maç silindi.",
    });
  };

  const getPlayerName = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || 'Bilinmeyen';
  };

  const getLeagueName = (leagueId: string) => {
    return leagues.find(l => l.id === leagueId)?.name || leagueId;
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Admin Paneli</h1>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Tabs defaultValue="leagues" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="leagues" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Ligler
            </TabsTrigger>
            <TabsTrigger value="players" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Oyuncular
            </TabsTrigger>
            <TabsTrigger value="matches" className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              Maçlar
            </TabsTrigger>
          </TabsList>

          {/* Leagues Tab */}
          <TabsContent value="leagues">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lig Yönetimi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add League */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <Label>Yeni Lig Ekle</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Lig ID (örn: super-c)"
                      value={newLeagueId}
                      onChange={e => setNewLeagueId(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Lig Adı"
                      value={newLeagueName}
                      onChange={e => setNewLeagueName(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={addLeague} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* League List */}
                <div className="space-y-2">
                  {leagues.map(league => (
                    <div 
                      key={league.id} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{league.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {league.id}</p>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => setEditingLeague({ ...league })}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Lig Düzenle</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Lig Adı</Label>
                                <Input
                                  value={editingLeague?.name || ''}
                                  onChange={e => setEditingLeague(prev => prev ? { ...prev, name: e.target.value } : null)}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">İptal</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button onClick={updateLeague}>Kaydet</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="destructive" 
                          size="icon"
                          onClick={() => deleteLeague(league.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Oyuncu Lig Ataması</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Player to League */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <Label>Oyuncu Ekle</Label>
                  <div className="flex gap-2">
                    <Select value={selectedLeagueForPlayer} onValueChange={setSelectedLeagueForPlayer}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Lig Seç" />
                      </SelectTrigger>
                      <SelectContent>
                        {leagues.map(league => (
                          <SelectItem key={league.id} value={league.id}>
                            {league.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Oyuncu Seç" />
                      </SelectTrigger>
                      <SelectContent>
                        {players.map(player => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addPlayerToLeague} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Player-League Assignments */}
                {leagues.map(league => {
                  const playersInLeague = leaguePlayers.filter(lp => lp.league_id === league.id);
                  if (playersInLeague.length === 0) return null;
                  
                  return (
                    <div key={league.id} className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground">{league.name}</h3>
                      <div className="space-y-1">
                        {playersInLeague.map(lp => (
                          <div 
                            key={lp.id}
                            className="flex items-center justify-between p-2 bg-muted/30 rounded"
                          >
                            <span className="text-sm">{getPlayerName(lp.player_id)}</span>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removePlayerFromLeague(lp.id)}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Maç Düzenleme</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {matches.slice(0, 50).map(match => (
                  <div 
                    key={match.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">
                        {getLeagueName(match.league_id)} • {new Date(match.match_date).toLocaleDateString('tr-TR')}
                      </p>
                      <p className="text-sm">
                        <span className={match.winner_id === match.player1_id ? 'font-bold text-primary' : ''}>
                          {getPlayerName(match.player1_id)}
                        </span>
                        <span className="mx-2">{match.score1} - {match.score2}</span>
                        <span className={match.winner_id === match.player2_id ? 'font-bold text-primary' : ''}>
                          {getPlayerName(match.player2_id)}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => setEditingMatch({ ...match })}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Maç Skorunu Düzenle</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-1 text-center">
                                <p className="text-sm mb-2">{getPlayerName(editingMatch?.player1_id || '')}</p>
                                <Input
                                  type="number"
                                  min={0}
                                  max={9}
                                  value={editingMatch?.score1 || 0}
                                  onChange={e => setEditingMatch(prev => prev ? { ...prev, score1: parseInt(e.target.value) || 0 } : null)}
                                  className="text-center text-lg"
                                />
                              </div>
                              <span className="text-xl font-bold">-</span>
                              <div className="flex-1 text-center">
                                <p className="text-sm mb-2">{getPlayerName(editingMatch?.player2_id || '')}</p>
                                <Input
                                  type="number"
                                  min={0}
                                  max={9}
                                  value={editingMatch?.score2 || 0}
                                  onChange={e => setEditingMatch(prev => prev ? { ...prev, score2: parseInt(e.target.value) || 0 } : null)}
                                  className="text-center text-lg"
                                />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">İptal</Button>
                            </DialogClose>
                            <DialogClose asChild>
                              <Button onClick={updateMatch}>Kaydet</Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="destructive" 
                        size="icon"
                        onClick={() => deleteMatch(match.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {matches.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Son 50 maç gösteriliyor ({matches.length} toplam)
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
