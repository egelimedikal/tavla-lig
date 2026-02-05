import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useSuperAdminRole } from '@/hooks/useSuperAdminRole';
import { useAssociationAdminRole } from '@/hooks/useAssociationAdminRole';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Edit, Users, Trophy, Gamepad2, Loader2, Shield, Crown, Key, RefreshCw, Megaphone, Building2, Upload, ImageIcon, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Profile {
  id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
}

interface Association {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  current_year: number | null;
  active_season: string | null;
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
  const { managedAssociationIds } = useAssociationAdminRole();
  const { toast } = useToast();
  
  const [associations, setAssociations] = useState<Association[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [leaguePlayers, setLeaguePlayers] = useState<LeaguePlayer[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [associationAdmins, setAssociationAdmins] = useState<AssociationAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Association editing
  const [editingAssociation, setEditingAssociation] = useState<Association | null>(null);
  const [associationLogo, setAssociationLogo] = useState<File | null>(null);
  const [associationLogoPreview, setAssociationLogoPreview] = useState<string | null>(null);
  const [savingAssociation, setSavingAssociation] = useState(false);
  
  // Form states (removed association-related states for single-association model)
  const [newLeagueName, setNewLeagueName] = useState('');
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [selectedLeagueForPlayer, setSelectedLeagueForPlayer] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  
  // New player form
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPhone, setNewPlayerPhone] = useState('');
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Profile | null>(null);
  const [resettingPasswordFor, setResettingPasswordFor] = useState<string | null>(null);
  
  // Default password from settings
  const [defaultPassword, setDefaultPassword] = useState('TTB2014');
  const [editingDefaultPassword, setEditingDefaultPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  
  // Admin management (removed association selection for single-association model)
  const [selectedUserForRole, setSelectedUserForRole] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user'>('admin');
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
      const [associationsRes, leaguesRes, playersRes, matchesRes, leaguePlayersRes, settingsRes] = await Promise.all([
        supabase.from('associations').select('*').order('name'),
        supabase.from('leagues').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('matches').select('*').order('match_date', { ascending: false }),
        supabase.from('league_players').select('*'),
        supabase.from('app_settings').select('*').eq('key', 'default_player_password').single(),
      ]);

      if (associationsRes.data) setAssociations(associationsRes.data);
      if (leaguesRes.data) setLeagues(leaguesRes.data);
      if (playersRes.data) setPlayers(playersRes.data);
      if (matchesRes.data) setMatches(matchesRes.data);
      if (leaguePlayersRes.data) setLeaguePlayers(leaguePlayersRes.data);
      if (settingsRes.data) {
        setDefaultPassword(settingsRes.data.value);
        setEditingDefaultPassword(settingsRes.data.value);
      }

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

  // Association management
  const uploadAssociationLogo = async (file: File, associationId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${associationId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('association-logos')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('association-logos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleAssociationLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAssociationLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAssociationLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAssociationLogo = () => {
    setAssociationLogo(null);
    setAssociationLogoPreview(null);
  };

  const updateAssociation = async () => {
    if (!editingAssociation) return;

    setSavingAssociation(true);

    try {
      let logoUrl = editingAssociation.logo_url;

      if (associationLogo) {
        const newLogoUrl = await uploadAssociationLogo(associationLogo, editingAssociation.id);
        if (newLogoUrl) {
          logoUrl = newLogoUrl;
        }
      }

      const { error } = await supabase
        .from('associations')
        .update({
          name: editingAssociation.name,
          logo_url: logoUrl,
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

      setAssociations(prev => prev.map(a => 
        a.id === editingAssociation.id ? { ...editingAssociation, logo_url: logoUrl } : a
      ));
      setEditingAssociation(null);
      clearAssociationLogo();
      toast({
        title: "Başarılı",
        description: "Dernek bilgileri güncellendi.",
      });
    } finally {
      setSavingAssociation(false);
    }
  };

  // League CRUD

  const addLeague = async () => {
    if (!newLeagueName.trim()) {
      toast({
        title: "Hata",
        description: "Lig adı gerekli.",
        variant: "destructive",
      });
      return;
    }

    // Use first association automatically (single association model)
    const associationId = associations[0]?.id;

    const { data, error } = await supabase
      .from('leagues')
      .insert({ id: crypto.randomUUID(), name: newLeagueName, association_id: associationId })
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

  // Player CRUD (add new players with phone)
  const formatPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('90') ? `+${digits}` : `+90${digits.replace(/^0/, '')}`;
  };

  const addPlayer = async () => {
    if (!newPlayerName.trim() || !newPlayerPhone.trim()) {
      toast({
        title: "Hata",
        description: "Oyuncu adı ve telefon numarası gerekli.",
        variant: "destructive",
      });
      return;
    }

    if (newPlayerPhone.replace(/\D/g, '').length < 10) {
      toast({
        title: "Hata",
        description: "Geçerli bir telefon numarası girin.",
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = formatPhoneNumber(newPlayerPhone);

    // Check if phone already exists in profiles
    const existingPlayer = players.find(p => p.phone === formattedPhone);
    if (existingPlayer) {
      toast({
        title: "Hata",
        description: "Bu telefon numarası zaten kayıtlı.",
        variant: "destructive",
      });
      return;
    }

    setCreatingPlayer(true);

    try {
      // Call edge function to create auth user and profile with default password from settings
      const { data, error } = await supabase.functions.invoke('create-player', {
        body: {
          phone: newPlayerPhone,
          password: defaultPassword,
          name: newPlayerName.trim(),
        },
      });

      if (error) {
        toast({
          title: "Hata",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        toast({
          title: "Hata",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (data?.profile) {
        setPlayers(prev => [...prev, data.profile]);
      }
      
      setNewPlayerName('');
      setNewPlayerPhone('');
      toast({
        title: "Başarılı",
        description: `Oyuncu eklendi. Varsayılan şifre: ${defaultPassword}`,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      toast({
        title: "Hata",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setCreatingPlayer(false);
    }
  };

  const updatePlayer = async () => {
    if (!editingPlayer) return;

    const formattedPhone = editingPlayer.phone ? formatPhoneNumber(editingPlayer.phone) : null;

    const { error } = await supabase
      .from('profiles')
      .update({ 
        name: editingPlayer.name,
        phone: formattedPhone
      })
      .eq('id', editingPlayer.id);

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setPlayers(prev => prev.map(p => 
      p.id === editingPlayer.id 
        ? { ...editingPlayer, phone: formattedPhone } 
        : p
    ));
    setEditingPlayer(null);
    toast({
      title: "Başarılı",
      description: "Oyuncu güncellendi.",
    });
  };

  const deletePlayer = async (playerId: string) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', playerId);

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setPlayers(prev => prev.filter(p => p.id !== playerId));
    setLeaguePlayers(prev => prev.filter(lp => lp.player_id !== playerId));
    toast({
      title: "Başarılı",
      description: "Oyuncu silindi.",
    });
  };

  const resetPlayerPassword = async (player: Profile) => {
    if (!player.user_id) {
      toast({
        title: "Hata",
        description: "Bu oyuncu henüz giriş yapmamış, şifre sıfırlanamaz.",
        variant: "destructive",
      });
      return;
    }

    setResettingPasswordFor(player.id);

    try {
      const { data, error } = await supabase.functions.invoke('reset-player-password', {
        body: {
          user_id: player.user_id,
          new_password: defaultPassword,
        },
      });

      if (error) {
        toast({
          title: "Hata",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        toast({
          title: "Hata",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Başarılı",
        description: `${player.name} için şifre sıfırlandı. Yeni şifre: ${defaultPassword}`,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      toast({
        title: "Hata",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setResettingPasswordFor(null);
    }
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
    if (!selectedUserForAssociationAdmin) {
      toast({
        title: "Hata",
        description: "Kullanıcı seçimi gerekli.",
        variant: "destructive",
      });
      return;
    }

    // Use first association automatically (single association model)
    const associationId = associations[0]?.id;
    if (!associationId) {
      toast({
        title: "Hata",
        description: "Dernek bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    // Check if already an admin for this association
    const existing = associationAdmins.find(
      aa => aa.association_id === associationId && aa.user_id === selectedUserForAssociationAdmin
    );

    if (existing) {
      toast({
        title: "Hata",
        description: "Bu kullanıcı zaten admin.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('association_admins')
      .insert({ association_id: associationId, user_id: selectedUserForAssociationAdmin })
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
        description: "Admin eklendi.",
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

  const updateDefaultPassword = async () => {
    if (!editingDefaultPassword.trim() || editingDefaultPassword.length < 4) {
      toast({
        title: "Hata",
        description: "Şifre en az 4 karakter olmalı.",
        variant: "destructive",
      });
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: editingDefaultPassword })
        .eq('key', 'default_player_password');

      if (error) {
        toast({
          title: "Hata",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setDefaultPassword(editingDefaultPassword);
      toast({
        title: "Başarılı",
        description: "Varsayılan şifre güncellendi.",
      });
    } finally {
      setSavingPassword(false);
    }
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

  // Get associations a player belongs to (via leagues)
  const getPlayerAssociationIds = (playerId: string): string[] => {
    const playerLeagues = leaguePlayers.filter(lp => lp.player_id === playerId);
    const associationIds: string[] = [];
    playerLeagues.forEach(lp => {
      const league = leagues.find(l => l.id === lp.league_id);
      if (league?.association_id && !associationIds.includes(league.association_id)) {
        associationIds.push(league.association_id);
      }
    });
    return associationIds;
  };

  // Check if current user can view a player's phone number
  const canViewPlayerPhone = (playerId: string): boolean => {
    // Super admin and general admin can see all phone numbers
    if (isSuperAdmin || isAdmin) {
      return true;
    }
    // Association admin can only see phone numbers of players in their associations
    if (managedAssociationIds.length > 0) {
      const playerAssociationIds = getPlayerAssociationIds(playerId);
      return playerAssociationIds.some(assocId => managedAssociationIds.includes(assocId));
    }
    return false;
  };

  // Check if current user can manage a league (add/remove players)
  const canManageLeague = (leagueId: string): boolean => {
    const league = leagues.find(l => l.id === leagueId);
    if (!league?.association_id) return false;
    
    // Super admin can manage all leagues
    if (isSuperAdmin) return true;
    
    // Association admin can only manage leagues in their associations
    return managedAssociationIds.includes(league.association_id);
  };

  // Get leagues that current user can manage
  const manageableLeagues = leagues.filter(league => {
    if (!league.association_id) return false;
    if (isSuperAdmin) return true;
    return managedAssociationIds.includes(league.association_id);
  });

  // Check if user is an association admin (not super_admin or admin)
  const isOnlyAssociationAdmin = managedAssociationIds.length > 0 && !isSuperAdmin && !isAdmin;

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

  // Check if user has any admin access (super_admin, admin, or association_admin)
  const hasAnyAdminAccess = isAdmin || isSuperAdmin || managedAssociationIds.length > 0;

  if (!hasAnyAdminAccess) {
    return null;
  }

  // Determine which tabs to show based on role
  const showAssociationTab = isSuperAdmin || isAdmin;
  const showLeaguesTab = isSuperAdmin || isAdmin;
  const showPlayersTab = isSuperAdmin || isAdmin || managedAssociationIds.length > 0;
  const showMatchesTab = isSuperAdmin || isAdmin;
  const showAdminsTab = isSuperAdmin;

  // Calculate grid columns based on visible tabs
  const visibleTabCount = [showAssociationTab, showLeaguesTab, showPlayersTab, showMatchesTab, showAdminsTab].filter(Boolean).length;

  // Determine default tab based on role
  const getDefaultTab = () => {
    if (showAssociationTab) return 'association';
    if (showLeaguesTab) return 'leagues';
    if (showPlayersTab) return 'players';
    if (showMatchesTab) return 'matches';
    return 'players';
  };

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
            {isSuperAdmin ? (
              <Badge variant="secondary" className="ml-2">
                <Crown className="w-3 h-3 mr-1" />
                Süper Admin
              </Badge>
            ) : managedAssociationIds.length > 0 ? (
              <Badge variant="outline" className="ml-2">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/announcements')}
            className="ml-auto"
          >
            <Megaphone className="w-4 h-4 mr-2" />
            Duyurular
          </Button>
        </div>
      </div>

      <div className="p-4">
        <Tabs defaultValue={getDefaultTab()} className="w-full">
          <TabsList className={`grid w-full mb-4`} style={{ gridTemplateColumns: `repeat(${visibleTabCount}, minmax(0, 1fr))` }}>
            {showAssociationTab && (
              <TabsTrigger value="association" className="flex items-center gap-1 text-xs px-2">
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Dernek</span>
              </TabsTrigger>
            )}
            {showLeaguesTab && (
              <TabsTrigger value="leagues" className="flex items-center gap-1 text-xs px-2">
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Ligler</span>
              </TabsTrigger>
            )}
            {showPlayersTab && (
              <TabsTrigger value="players" className="flex items-center gap-1 text-xs px-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Oyuncular</span>
              </TabsTrigger>
            )}
            {showMatchesTab && (
              <TabsTrigger value="matches" className="flex items-center gap-1 text-xs px-2">
                <Gamepad2 className="w-4 h-4" />
                <span className="hidden sm:inline">Maçlar</span>
              </TabsTrigger>
            )}
            {showAdminsTab && (
              <TabsTrigger value="admins" className="flex items-center gap-1 text-xs px-2">
                <Crown className="w-4 h-4" />
                <span className="hidden sm:inline">Adminler</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Association Tab */}
          {showAssociationTab && associations[0] && (
          <TabsContent value="association">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dernek Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  {/* Current Association Info */}
                  <div className="flex items-center gap-4">
                    {associations[0].logo_url ? (
                      <img 
                        src={associations[0].logo_url} 
                        alt={associations[0].name} 
                        className="w-16 h-16 object-contain rounded-lg border"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-lg">{associations[0].name}</p>
                      <p className="text-sm text-muted-foreground">/{associations[0].slug}</p>
                    </div>
                  </div>
                  
                  {/* Edit Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setEditingAssociation({ ...associations[0] });
                          setAssociationLogoPreview(associations[0].logo_url);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Düzenle
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Dernek Bilgilerini Düzenle</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Dernek Adı</Label>
                          <Input
                            value={editingAssociation?.name || ''}
                            onChange={e => setEditingAssociation(prev => prev ? { ...prev, name: e.target.value } : null)}
                            placeholder="Dernek adını girin"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Logo</Label>
                          {(associationLogoPreview || editingAssociation?.logo_url) ? (
                            <div className="relative">
                              <img
                                src={associationLogoPreview || editingAssociation?.logo_url || ''}
                                alt="Logo"
                                className="w-full h-32 object-contain rounded-lg border bg-muted"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6"
                                onClick={() => {
                                  clearAssociationLogo();
                                  setEditingAssociation(prev => prev ? { ...prev, logo_url: null } : null);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <label className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors block">
                              <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">Logo yüklemek için tıklayın</p>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAssociationLogoChange}
                              />
                            </label>
                          )}
                          {(associationLogoPreview || editingAssociation?.logo_url) && (
                            <label className="cursor-pointer">
                              <Button variant="outline" size="sm" className="w-full" asChild>
                                <span>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Farklı Logo Yükle
                                </span>
                              </Button>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAssociationLogoChange}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline" onClick={() => {
                            setEditingAssociation(null);
                            clearAssociationLogo();
                          }}>İptal</Button>
                        </DialogClose>
                        <Button onClick={updateAssociation} disabled={savingAssociation}>
                          {savingAssociation && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Kaydet
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Leagues Tab */}
          {showLeaguesTab && (
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
          )}

          {/* Players Tab */}
          {showPlayersTab && (
          <TabsContent value="players">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Oyuncu Yönetimi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
              {/* Add New Player */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <Label className="text-base font-medium">Yeni Oyuncu Ekle</Label>
                  <p className="text-xs text-muted-foreground">
                    Oyuncu adı ve telefon numarası girin. Varsayılan şifre: <span className="font-mono font-bold">{defaultPassword}</span>
                  </p>
                  <div className="grid gap-3">
                    <Input
                      placeholder="Oyuncu Adı Soyadı"
                      value={newPlayerName}
                      onChange={e => setNewPlayerName(e.target.value)}
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+90</span>
                      <Input
                        placeholder="5XX XXX XX XX"
                        value={newPlayerPhone}
                        onChange={e => setNewPlayerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="pl-12"
                      />
                    </div>
                    <Button onClick={addPlayer} disabled={creatingPlayer} className="w-full">
                      {creatingPlayer ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      {creatingPlayer ? 'Oluşturuluyor...' : 'Oyuncu Ekle'}
                    </Button>
                  </div>
                </div>

                {/* All Players List */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Kayıtlı Oyuncular ({players.length})</Label>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {players.map(player => (
                      <div 
                        key={player.id} 
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{player.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {canViewPlayerPhone(player.id) 
                              ? (player.phone || 'Telefon yok')
                              : '••••••••••'
                            }
                            {player.user_id && <span className="ml-2 text-green-500">✓ Giriş yapmış</span>}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {player.user_id && (
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => resetPlayerPassword(player)}
                              disabled={resettingPasswordFor === player.id}
                              title="Şifre Sıfırla"
                            >
                              {resettingPasswordFor === player.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => setEditingPlayer({ ...player })}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Oyuncu Düzenle</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Oyuncu Adı</Label>
                                  <Input
                                    value={editingPlayer?.name || ''}
                                    onChange={e => setEditingPlayer(prev => prev ? { ...prev, name: e.target.value } : null)}
                                  />
                                </div>
                                {canViewPlayerPhone(player.id) ? (
                                  <div>
                                    <Label>Telefon Numarası</Label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+90</span>
                                      <Input
                                        value={editingPlayer?.phone?.replace('+90', '') || ''}
                                        onChange={e => setEditingPlayer(prev => prev ? { ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) } : null)}
                                        className="pl-12"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <Label>Telefon Numarası</Label>
                                    <p className="text-sm text-muted-foreground py-2">
                                      Bu oyuncunun telefon numarasını görme yetkiniz yok.
                                    </p>
                                  </div>
                                )}
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">İptal</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button onClick={updatePlayer}>Kaydet</Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant="destructive" 
                            size="icon"
                            onClick={() => deletePlayer(player.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Player to League Section - Only for association admins or super admin */}
                {(isSuperAdmin || managedAssociationIds.length > 0) && manageableLeagues.length > 0 && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg border-t pt-6">
                    <Label className="text-base font-medium">Oyuncu Lig Ataması</Label>
                    <p className="text-xs text-muted-foreground">
                      Oyuncuları liglere atayabilirsiniz.
                    </p>
                    <div className="flex gap-2">
                      <Select value={selectedLeagueForPlayer} onValueChange={setSelectedLeagueForPlayer}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Lig Seç" />
                        </SelectTrigger>
                        <SelectContent>
                          {manageableLeagues.map(league => (
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
                )}

                {/* Player-League Assignments - Only show leagues user can manage */}
                {manageableLeagues.map(league => {
                  const playersInLeague = leaguePlayers.filter(lp => lp.league_id === league.id);
                  if (playersInLeague.length === 0) return null;
                  
                  return (
                    <div key={league.id} className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground">
                        {league.name}
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
          )}

          {/* Matches Tab */}
          {showMatchesTab && (
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
          )}

          {/* Admins Tab - Super Admin only */}
          {showAdminsTab && (
            <TabsContent value="admins">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    Admin Yönetimi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Default Password Setting */}
                  <div className="space-y-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <Label className="flex items-center gap-2 text-primary">
                      <Key className="w-4 h-4" />
                      Varsayılan Oyuncu Şifresi
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Yeni eklenen oyuncuların ilk giriş şifresi. Oyuncular ilk girişte şifrelerini değiştirmek zorundadır.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={editingDefaultPassword}
                        onChange={e => setEditingDefaultPassword(e.target.value)}
                        placeholder="Varsayılan şifre"
                        className="flex-1"
                      />
                      <Button 
                        onClick={updateDefaultPassword} 
                        disabled={savingPassword || editingDefaultPassword === defaultPassword}
                      >
                        {savingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Kaydet
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mevcut şifre: <span className="font-mono font-bold">{defaultPassword}</span>
                    </p>
                  </div>


                  {/* Add Association Admin */}
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <Label className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin Ekle
                    </Label>
                    <p className="text-xs text-muted-foreground">Adminler oyuncu ve maç yönetimi yapabilir</p>
                    <div className="flex gap-2">
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
                      <Shield className="w-4 h-4" />
                      Adminler
                    </h3>
                    {associationAdmins.map(aa => (
                      <div 
                        key={aa.id}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded"
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
                    {associationAdmins.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Henüz admin atanmadı
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
