import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useSuperAdminRole } from '@/hooks/useSuperAdminRole';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Edit, Users, Trophy, Gamepad2, Loader2, Shield, Building2, Crown, Upload, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Profile {
  id: string;
  user_id: string;
  name: string;
}

interface Association {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
}

interface League {
  id: string;
  name: string;
  association_id: string | null;
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

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'super_admin' | 'user';
}

interface AssociationAdmin {
  id: string;
  association_id: string;
  user_id: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdminRole();
  const { toast } = useToast();
  
  const [associations, setAssociations] = useState<Association[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [leaguePlayers, setLeaguePlayers] = useState<LeaguePlayer[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [associationAdmins, setAssociationAdmins] = useState<AssociationAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [newAssociationName, setNewAssociationName] = useState('');
  const [newAssociationSlug, setNewAssociationSlug] = useState('');
  const [newAssociationLogo, setNewAssociationLogo] = useState<File | null>(null);
  const [editingAssociationLogo, setEditingAssociationLogo] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [editingAssociation, setEditingAssociation] = useState<Association | null>(null);
  
  const [newLeagueName, setNewLeagueName] = useState('');
  const [selectedAssociationForLeague, setSelectedAssociationForLeague] = useState('');
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [selectedLeagueForPlayer, setSelectedLeagueForPlayer] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  
  // Admin management
  const [selectedUserForRole, setSelectedUserForRole] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user'>('admin');
  
  // Association admin management
  const [selectedAssociationForAdmin, setSelectedAssociationForAdmin] = useState('');
  const [selectedUserForAssociationAdmin, setSelectedUserForAssociationAdmin] = useState('');

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
      const [associationsRes, leaguesRes, playersRes, matchesRes, leaguePlayersRes] = await Promise.all([
        supabase.from('associations').select('*').order('name'),
        supabase.from('leagues').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('matches').select('*').order('match_date', { ascending: false }),
        supabase.from('league_players').select('*'),
      ]);

      if (associationsRes.data) setAssociations(associationsRes.data);
      if (leaguesRes.data) setLeagues(leaguesRes.data);
      if (playersRes.data) setPlayers(playersRes.data);
      if (matchesRes.data) setMatches(matchesRes.data);
      if (leaguePlayersRes.data) setLeaguePlayers(leaguePlayersRes.data);

      // Fetch user roles and association admins only for super admins
      if (isSuperAdmin) {
        const [rolesRes, assocAdminsRes] = await Promise.all([
          supabase.from('user_roles').select('*'),
          supabase.from('association_admins').select('*'),
        ]);
        if (rolesRes.data) setUserRoles(rolesRes.data);
        if (assocAdminsRes.data) setAssociationAdmins(assocAdminsRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Upload logo helper
  const uploadLogo = async (file: File, associationId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${associationId}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('association-logos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('association-logos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Association CRUD
  const addAssociation = async () => {
    if (!newAssociationName.trim() || !newAssociationSlug.trim()) {
      toast({
        title: "Hata",
        description: "Dernek adı ve kısaltması gerekli.",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);
    
    try {
      const { data, error } = await supabase
        .from('associations')
        .insert({ name: newAssociationName, slug: newAssociationSlug.toLowerCase() })
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
        let logoUrl: string | null = null;
        
        if (newAssociationLogo) {
          logoUrl = await uploadLogo(newAssociationLogo, data.id);
          if (logoUrl) {
            await supabase
              .from('associations')
              .update({ logo_url: logoUrl })
              .eq('id', data.id);
          }
        }

        setAssociations(prev => [...prev, { ...data, logo_url: logoUrl }]);
        setNewAssociationName('');
        setNewAssociationSlug('');
        setNewAssociationLogo(null);
        toast({
          title: "Başarılı",
          description: "Dernek eklendi.",
        });
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  const updateAssociation = async () => {
    if (!editingAssociation) return;

    setUploadingLogo(true);
    
    try {
      let logoUrl = editingAssociation.logo_url;

      if (editingAssociationLogo) {
        const newLogoUrl = await uploadLogo(editingAssociationLogo, editingAssociation.id);
        if (newLogoUrl) {
          logoUrl = newLogoUrl;
        }
      }

      const { error } = await supabase
        .from('associations')
        .update({ 
          name: editingAssociation.name, 
          slug: editingAssociation.slug,
          logo_url: logoUrl
        })
        .eq('id', editingAssociation.id);

      if (error) {
        toast({
          title: "Hata",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setAssociations(prev => prev.map(a => a.id === editingAssociation.id ? { ...editingAssociation, logo_url: logoUrl } : a));
      setEditingAssociation(null);
      setEditingAssociationLogo(null);
      toast({
        title: "Başarılı",
        description: "Dernek güncellendi.",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const deleteAssociation = async (assocId: string) => {
    const { error } = await supabase
      .from('associations')
      .delete()
      .eq('id', assocId);

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setAssociations(prev => prev.filter(a => a.id !== assocId));
    toast({
      title: "Başarılı",
      description: "Dernek silindi.",
    });
  };

  const addLeague = async () => {
    if (!newLeagueName.trim() || !selectedAssociationForLeague) {
      toast({
        title: "Hata",
        description: "Lig adı ve dernek seçimi gerekli.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('leagues')
      .insert({ id: crypto.randomUUID(), name: newLeagueName, association_id: selectedAssociationForLeague })
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
      .update({ name: editingLeague.name, association_id: editingLeague.association_id })
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

  // Admin Role Management (Super Admin only)
  const addAdminRole = async () => {
    if (!selectedUserForRole) {
      toast({
        title: "Hata",
        description: "Kullanıcı seçimi gerekli.",
        variant: "destructive",
      });
      return;
    }

    // Check if user already has a role
    const existingRole = userRoles.find(r => r.user_id === selectedUserForRole);
    if (existingRole) {
      toast({
        title: "Hata",
        description: "Bu kullanıcının zaten bir rolü var.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .insert({ user_id: selectedUserForRole, role: selectedRole })
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
      setUserRoles(prev => [...prev, data as UserRole]);
      setSelectedUserForRole('');
      toast({
        title: "Başarılı",
        description: "Admin rolü eklendi.",
      });
    }
  };

  const removeAdminRole = async (roleId: string, userId: string) => {
    // Prevent removing own super_admin role
    if (userId === user?.id) {
      toast({
        title: "Hata",
        description: "Kendi rolünüzü silemezsiniz.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', roleId);

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setUserRoles(prev => prev.filter(r => r.id !== roleId));
    toast({
      title: "Başarılı",
      description: "Rol kaldırıldı.",
    });
  };

  // Association Admin Management
  const addAssociationAdmin = async () => {
    if (!selectedAssociationForAdmin || !selectedUserForAssociationAdmin) {
      toast({
        title: "Hata",
        description: "Dernek ve kullanıcı seçimi gerekli.",
        variant: "destructive",
      });
      return;
    }

    // Check if already an admin for this association
    const existing = associationAdmins.find(
      aa => aa.association_id === selectedAssociationForAdmin && aa.user_id === selectedUserForAssociationAdmin
    );

    if (existing) {
      toast({
        title: "Hata",
        description: "Bu kullanıcı zaten bu derneğin admini.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('association_admins')
      .insert({ association_id: selectedAssociationForAdmin, user_id: selectedUserForAssociationAdmin })
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
      setAssociationAdmins(prev => [...prev, data as AssociationAdmin]);
      setSelectedUserForAssociationAdmin('');
      toast({
        title: "Başarılı",
        description: "Dernek admini eklendi.",
      });
    }
  };

  const removeAssociationAdmin = async (aaId: string) => {
    const { error } = await supabase
      .from('association_admins')
      .delete()
      .eq('id', aaId);

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setAssociationAdmins(prev => prev.filter(aa => aa.id !== aaId));
    toast({
      title: "Başarılı",
      description: "Dernek admini kaldırıldı.",
    });
  };

  const getPlayerName = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || 'Bilinmeyen';
  };

  const getUserName = (userId: string) => {
    return players.find(p => p.user_id === userId)?.name || 'Bilinmeyen';
  };

  const getLeagueName = (leagueId: string) => {
    return leagues.find(l => l.id === leagueId)?.name || leagueId;
  };

  const getAssociationName = (assocId: string | null) => {
    if (!assocId) return 'Atanmamış';
    return associations.find(a => a.id === assocId)?.name || 'Bilinmeyen';
  };

  if (authLoading || adminLoading || superAdminLoading || loading) {
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
            {isSuperAdmin && (
              <Badge variant="secondary" className="ml-2">
                <Crown className="w-3 h-3 mr-1" />
                Süper Admin
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <Tabs defaultValue="associations" className="w-full">
          <TabsList className={`grid w-full mb-4 ${isSuperAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <TabsTrigger value="associations" className="flex items-center gap-1 text-xs px-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Dernekler</span>
            </TabsTrigger>
            <TabsTrigger value="leagues" className="flex items-center gap-1 text-xs px-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Ligler</span>
            </TabsTrigger>
            <TabsTrigger value="players" className="flex items-center gap-1 text-xs px-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Oyuncular</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="flex items-center gap-1 text-xs px-2">
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">Maçlar</span>
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="admins" className="flex items-center gap-1 text-xs px-2">
                <Crown className="w-4 h-4" />
                <span className="hidden sm:inline">Adminler</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Associations Tab */}
          <TabsContent value="associations">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dernek Yönetimi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Association */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <Label>Yeni Dernek Ekle</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Input
                      placeholder="Dernek Adı"
                      value={newAssociationName}
                      onChange={e => setNewAssociationName(e.target.value)}
                      className="flex-1 min-w-[150px]"
                    />
                    <Input
                      placeholder="Kısaltma (örn: bursa)"
                      value={newAssociationSlug}
                      onChange={e => setNewAssociationSlug(e.target.value)}
                      className="flex-1 min-w-[150px]"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => setNewAssociationLogo(e.target.files?.[0] || null)}
                      />
                      <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">{newAssociationLogo ? newAssociationLogo.name : 'Logo Seç'}</span>
                      </div>
                    </label>
                    {newAssociationLogo && (
                      <img 
                        src={URL.createObjectURL(newAssociationLogo)} 
                        alt="Önizleme" 
                        className="w-10 h-10 object-contain rounded"
                      />
                    )}
                    <Button onClick={addAssociation} disabled={uploadingLogo} className="ml-auto">
                      {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span className="ml-1">Ekle</span>
                    </Button>
                  </div>
                </div>

                {/* Association List */}
                <div className="space-y-2">
                  {associations.map(assoc => (
                    <div 
                      key={assoc.id} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {assoc.logo_url ? (
                          <img 
                            src={assoc.logo_url} 
                            alt={`${assoc.name} logo`}
                            className="w-10 h-10 object-contain rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{assoc.name}</p>
                          <p className="text-xs text-muted-foreground">/{assoc.slug}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => setEditingAssociation({ ...assoc })}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Dernek Düzenle</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Dernek Adı</Label>
                                <Input
                                  value={editingAssociation?.name || ''}
                                  onChange={e => setEditingAssociation(prev => prev ? { ...prev, name: e.target.value } : null)}
                                />
                              </div>
                              <div>
                                <Label>Kısaltma</Label>
                                <Input
                                  value={editingAssociation?.slug || ''}
                                  onChange={e => setEditingAssociation(prev => prev ? { ...prev, slug: e.target.value } : null)}
                                />
                              </div>
                              <div>
                                <Label>Logo</Label>
                                <div className="flex items-center gap-3 mt-2">
                                  {(editingAssociationLogo || editingAssociation?.logo_url) && (
                                    <img 
                                      src={editingAssociationLogo ? URL.createObjectURL(editingAssociationLogo) : editingAssociation?.logo_url || ''} 
                                      alt="Logo önizleme"
                                      className="w-16 h-16 object-contain rounded border"
                                    />
                                  )}
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={e => setEditingAssociationLogo(e.target.files?.[0] || null)}
                                    />
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                                      <Upload className="w-4 h-4" />
                                      <span className="text-sm">
                                        {editingAssociationLogo ? 'Değiştir' : (editingAssociation?.logo_url ? 'Değiştir' : 'Logo Yükle')}
                                      </span>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline" onClick={() => setEditingAssociationLogo(null)}>İptal</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button onClick={updateAssociation} disabled={uploadingLogo}>
                                  {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                                  Kaydet
                                </Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="destructive" 
                          size="icon"
                          onClick={() => deleteAssociation(assoc.id)}
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
                  <div className="space-y-2">
                    <Select value={selectedAssociationForLeague} onValueChange={setSelectedAssociationForLeague}>
                      <SelectTrigger>
                        <SelectValue placeholder="Dernek Seç" />
                      </SelectTrigger>
                      <SelectContent>
                        {associations.map(assoc => (
                          <SelectItem key={assoc.id} value={assoc.id}>
                            {assoc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
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
                </div>

                {/* League List grouped by Association */}
                {associations.map(assoc => {
                  const assocLeagues = leagues.filter(l => l.association_id === assoc.id);
                  if (assocLeagues.length === 0) return null;

                  return (
                    <div key={assoc.id} className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {assoc.name}
                      </h3>
                      {assocLeagues.map(league => (
                        <div 
                          key={league.id} 
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg ml-4"
                        >
                          <div>
                            <p className="font-medium">{league.name}</p>
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
                                  <div>
                                    <Label>Dernek</Label>
                                    <Select 
                                      value={editingLeague?.association_id || ''} 
                                      onValueChange={val => setEditingLeague(prev => prev ? { ...prev, association_id: val } : null)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Dernek Seç" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {associations.map(assoc => (
                                          <SelectItem key={assoc.id} value={assoc.id}>
                                            {assoc.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
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
                  );
                })}

                {/* Unassigned leagues */}
                {(() => {
                  const unassignedLeagues = leagues.filter(l => !l.association_id);
                  if (unassignedLeagues.length === 0) return null;

                  return (
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground">Atanmamış Ligler</h3>
                      {unassignedLeagues.map(league => (
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
                                  <div>
                                    <Label>Dernek</Label>
                                    <Select 
                                      value={editingLeague?.association_id || ''} 
                                      onValueChange={val => setEditingLeague(prev => prev ? { ...prev, association_id: val } : null)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Dernek Seç" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {associations.map(assoc => (
                                          <SelectItem key={assoc.id} value={assoc.id}>
                                            {assoc.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
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
                  );
                })()}
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
                            {league.name} ({getAssociationName(league.association_id)})
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
                      <h3 className="font-medium text-sm text-muted-foreground">
                        {league.name} ({getAssociationName(league.association_id)})
                      </h3>
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

          {/* Admins Tab - Super Admin only */}
          {isSuperAdmin && (
            <TabsContent value="admins">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    Admin Yönetimi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add Global Admin Role */}
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <Label className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Genel Admin Ekle
                    </Label>
                    <p className="text-xs text-muted-foreground">Genel adminler tüm dernekleri yönetebilir</p>
                    <div className="flex gap-2">
                      <Select value={selectedUserForRole} onValueChange={setSelectedUserForRole}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Kullanıcı Seç" />
                        </SelectTrigger>
                        <SelectContent>
                          {players
                            .filter(p => !userRoles.find(r => r.user_id === p.user_id))
                            .map(player => (
                              <SelectItem key={player.user_id} value={player.user_id}>
                                {player.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as 'admin' | 'user')}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={addAdminRole} size="icon">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Global Role List */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Genel Roller
                    </h3>
                    {userRoles.map(role => (
                      <div 
                        key={role.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{getUserName(role.user_id)}</span>
                          <Badge variant={role.role === 'super_admin' ? 'default' : 'secondary'}>
                            {role.role === 'super_admin' ? 'Süper Admin' : 'Admin'}
                          </Badge>
                        </div>
                        {role.user_id !== user?.id && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeAdminRole(role.id, role.user_id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border my-4" />

                  {/* Add Association Admin */}
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <Label className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Dernek Admini Ekle
                    </Label>
                    <p className="text-xs text-muted-foreground">Dernek adminleri sadece kendi derneklerini yönetebilir</p>
                    <div className="flex gap-2">
                      <Select value={selectedAssociationForAdmin} onValueChange={setSelectedAssociationForAdmin}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Dernek Seç" />
                        </SelectTrigger>
                        <SelectContent>
                          {associations.map(assoc => (
                            <SelectItem key={assoc.id} value={assoc.id}>
                              {assoc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedUserForAssociationAdmin} onValueChange={setSelectedUserForAssociationAdmin}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Kullanıcı Seç" />
                        </SelectTrigger>
                        <SelectContent>
                          {players.map(player => (
                            <SelectItem key={player.user_id} value={player.user_id}>
                              {player.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={addAssociationAdmin} size="icon">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Association Admins List */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Dernek Adminleri
                    </h3>
                    {associations.map(assoc => {
                      const admins = associationAdmins.filter(aa => aa.association_id === assoc.id);
                      if (admins.length === 0) return null;

                      return (
                        <div key={assoc.id} className="space-y-2">
                          <h4 className="text-sm font-medium">{assoc.name}</h4>
                          {admins.map(aa => (
                            <div 
                              key={aa.id}
                              className="flex items-center justify-between p-2 bg-muted/30 rounded ml-4"
                            >
                              <span className="text-sm">{getUserName(aa.user_id)}</span>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removeAssociationAdmin(aa.id)}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {associationAdmins.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Henüz dernek admini atanmadı
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
