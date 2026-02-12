import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useSuperAdminRole } from '@/hooks/useSuperAdminRole';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Trash2, Edit, Users, Trophy, Gamepad2, Loader2, Shield, Crown, Key, RefreshCw, Building2, Upload, ImageIcon, X, Swords, ChevronDown, BarChart3 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TournamentAdmin } from '@/components/TournamentAdmin';

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
  status: string;
  updated_at: string;
  current_year: number | null;
  active_season: string | null;
  match_length: number;
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
  
  const [loading, setLoading] = useState(true);
  
  // Association editing
  const [editingAssociation, setEditingAssociation] = useState<Association | null>(null);
  const [associationLogo, setAssociationLogo] = useState<File | null>(null);
  const [associationLogoPreview, setAssociationLogoPreview] = useState<string | null>(null);
  const [savingAssociation, setSavingAssociation] = useState(false);
  
  // Form states (removed association-related states for single-association model)
  const [newLeagueName, setNewLeagueName] = useState('');
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [selectedLeagueForEdit, setSelectedLeagueForEdit] = useState<string | null>(null);
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
  
  // League completion confirmation
  const [leagueToComplete, setLeagueToComplete] = useState<{ id: string; missingCount: number } | null>(null);
  const [leagueToDelete, setLeagueToDelete] = useState<string | null>(null);
  const [leagueToReactivate, setLeagueToReactivate] = useState<string | null>(null);
  
  // Admin management (removed association selection for single-association model)
  const [selectedUserForRole, setSelectedUserForRole] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user'>('admin');
  

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
    if (isAdmin && !superAdminLoading) {
      fetchData();
    }
  }, [isAdmin, isSuperAdmin, superAdminLoading]);

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
        const rolesRes = await supabase.from('user_roles').select('*');
        if (rolesRes.data) setUserRoles(rolesRes.data);
      }
    } catch (error) {
      logger.error('Error fetching data:', error);
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
      logger.error('Upload error:', uploadError);
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
      .insert({ id: crypto.randomUUID(), name: newLeagueName, association_id: associationId, match_length: 9 })
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
      // Auto-open the newly created league for editing
      setSelectedLeagueForEdit(data.id);
      setEditingLeague({ ...data });
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
      .update({ 
        name: editingLeague.name, 
        association_id: editingLeague.association_id,
        current_year: editingLeague.current_year,
        active_season: editingLeague.active_season,
        match_length: editingLeague.match_length,
      })
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

  const completeLeague = async (leagueId: string) => {
    // Check if league has any matches
    const leagueMatchCount = matches.filter(m => m.league_id === leagueId).length;
    if (leagueMatchCount === 0) {
      toast({
        title: "Hata",
        description: "Hiç maç oynanmamış bir lig tamamlanamaz.",
        variant: "destructive",
      });
      return;
    }

    // Check for incomplete matches
    const playerIds = leaguePlayers.filter(lp => lp.league_id === leagueId).map(lp => lp.player_id);
    const totalExpected = (playerIds.length * (playerIds.length - 1)) / 2;
    const missingCount = totalExpected - leagueMatchCount;

    if (missingCount > 0) {
      setLeagueToComplete({ id: leagueId, missingCount });
      return;
    }

    await confirmCompleteLeague(leagueId);
  };

  const reactivateLeague = async (leagueId: string) => {
    const { error } = await supabase
      .from('leagues')
      .update({ status: 'active' })
      .eq('id', leagueId);

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      return;
    }

    setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, status: 'active', updated_at: new Date().toISOString() } : l));
    toast({ title: "Başarılı", description: "Lig yeniden aktif edildi." });
  };

  const confirmCompleteLeague = async (leagueId: string) => {
    const { error } = await supabase
      .from('leagues')
      .update({ status: 'completed' })
      .eq('id', leagueId);

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, status: 'completed', updated_at: new Date().toISOString() } : l));
    setLeagueToComplete(null);
    toast({
      title: "Başarılı",
      description: "Lig tamamlandı.",
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

    // Only format phone if it has actual digits, otherwise keep existing or null
    const phoneDigits = editingPlayer.phone?.replace(/\D/g, '') || '';
    const formattedPhone = phoneDigits.length >= 10 ? formatPhoneNumber(editingPlayer.phone!) : editingPlayer.phone;

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
    try {
      const { data, error } = await supabase.functions.invoke('delete-player', {
        body: { playerId },
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

      setPlayers(prev => prev.filter(p => p.id !== playerId));
      setLeaguePlayers(prev => prev.filter(lp => lp.player_id !== playerId));
      setMatches(prev => prev.filter(m => m.player1_id !== playerId && m.player2_id !== playerId));
      toast({
        title: "Başarılı",
        description: "Oyuncu tamamen silindi.",
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      toast({
        title: "Hata",
        description: errorMessage,
        variant: "destructive",
      });
    }
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

  const calculateLeagueStats = (leagueId: string) => {
    const leagueMatchesFiltered = matches.filter(m => m.league_id === leagueId);
    const assignedPlayerIds = leaguePlayers
      .filter(lp => lp.league_id === leagueId)
      .map(lp => lp.player_id);

    const playerIdsFromMatches = new Set<string>();
    leagueMatchesFiltered.forEach(match => {
      playerIdsFromMatches.add(match.player1_id);
      playerIdsFromMatches.add(match.player2_id);
    });

    const allPlayerIds = new Set([...assignedPlayerIds, ...playerIdsFromMatches]);
    const statsMap = new Map<string, { playerId: string; name: string; played: number; won: number; lost: number; scored: number; conceded: number; average: number; points: number }>();

    allPlayerIds.forEach(playerId => {
      statsMap.set(playerId, {
        playerId,
        name: getPlayerName(playerId),
        played: 0, won: 0, lost: 0, scored: 0, conceded: 0, average: 0, points: 0,
      });
    });

    leagueMatchesFiltered.forEach(match => {
      const s1 = statsMap.get(match.player1_id);
      const s2 = statsMap.get(match.player2_id);
      if (s1) {
        s1.played++; s1.scored += match.score1; s1.conceded += match.score2;
        if (match.winner_id === match.player1_id) { s1.won++; s1.points += 2; } else { s1.lost++; s1.points += 1; }
        s1.average = s1.scored - s1.conceded;
      }
      if (s2) {
        s2.played++; s2.scored += match.score2; s2.conceded += match.score1;
        if (match.winner_id === match.player2_id) { s2.won++; s2.points += 2; } else { s2.lost++; s2.points += 1; }
        s2.average = s2.scored - s2.conceded;
      }
    });

    return Array.from(statsMap.values()).sort((a, b) => {
      if (a.played === 0 && b.played === 0) return a.name.localeCompare(b.name, 'tr');
      if (b.points !== a.points) return b.points - a.points;
      if (b.average !== a.average) return b.average - a.average;
      if (a.played !== b.played) return a.played - b.played;
      return a.name.localeCompare(b.name, 'tr');
    });
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
    return false;
  };

  // Check if current user can manage a league (add/remove players)
  const canManageLeague = (leagueId: string): boolean => {
    const league = leagues.find(l => l.id === leagueId);
    if (!league?.association_id) return false;
    return isSuperAdmin || isAdmin;
  };

  // Get leagues that current user can manage (only active leagues)
  const manageableLeagues = leagues.filter(league => {
    if (!league.association_id) return false;
    if (league.status === 'completed') return false;
    return isSuperAdmin || isAdmin;
  });


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

  // Check if user has any admin access (super_admin or admin)
  const hasAnyAdminAccess = isAdmin || isSuperAdmin;

  if (!hasAnyAdminAccess) {
    return null;
  }

  // Determine which tabs to show based on role
  const showAssociationTab = isSuperAdmin || isAdmin;
  const showLeaguesTab = isSuperAdmin || isAdmin;
  const showPlayersTab = isSuperAdmin || isAdmin;
  const showMatchesTab = isSuperAdmin || isAdmin;
  const showTournamentTab = isSuperAdmin || isAdmin;
  const showAdminsTab = isSuperAdmin;
  const visibleTabCount = [showAssociationTab, showLeaguesTab, showPlayersTab, showMatchesTab, showTournamentTab, showAdminsTab].filter(Boolean).length;

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
                <Swords className="w-4 h-4" />
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
            {showTournamentTab && (
              <TabsTrigger value="tournament" className="flex items-center gap-1 text-xs px-2">
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Turnuva</span>
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
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Dernek Bilgileri
                </CardTitle>
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
                        <DialogClose asChild>
                          <Button onClick={updateAssociation} disabled={savingAssociation}>
                            {savingAssociation && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Kaydet
                          </Button>
                        </DialogClose>
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
                <CardTitle className="text-base flex items-center gap-2">
                  <Swords className="w-5 h-5 text-primary" />
                  Lig Yönetimi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add League */}
                {!selectedLeagueForEdit && (
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
                )}

                {/* League List */}
                <div className="space-y-2">
                  {[...leagues].sort((a, b) => {
                    if (a.status === 'active' && b.status !== 'active') return -1;
                    if (a.status !== 'active' && b.status === 'active') return 1;
                    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                  }).filter(l => !selectedLeagueForEdit || l.id === selectedLeagueForEdit).map(league => {
                    const leagueMatchCount = matches.filter(m => m.league_id === league.id).length;
                    const leaguePlayerCount = leaguePlayers.filter(lp => lp.league_id === league.id).length;
                    const isOpen = selectedLeagueForEdit === league.id;
                    return (
                      <Collapsible
                        key={league.id}
                        open={isOpen}
                        onOpenChange={(open) => {
                          setSelectedLeagueForEdit(open ? league.id : null);
                          setEditingLeague(open ? { ...league } : null);
                        }}
                      >
                        <div className={`rounded-lg border transition-colors ${isOpen ? 'border-primary/30 bg-primary/10' : 'border-border bg-muted/30'}`}>
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 rounded-t-lg gap-3">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{league.name}</p>
                                  {(league.current_year || league.active_season) && (
                                    <p className="text-[10px] text-muted-foreground">
                                      {league.current_year && `${league.current_year} Yılı`}
                                      {league.current_year && league.active_season && ' • '}
                                      {league.active_season && `${league.active_season} Sezonu`}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    <Badge variant={league.status === 'active' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                      {league.status === 'active' ? 'Aktif' : `Tamamlandı - ${format(new Date(league.updated_at), 'dd.MM.yyyy')}`}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">({leagueMatchCount} maç)</span>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">({leaguePlayerCount} oyuncu)</span>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{league.match_length} sayılık</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                 {league.status === 'active' && (
                                   <Button variant="outline" size="sm" className="h-7 px-2 text-[12px] leading-none" onClick={() => completeLeague(league.id)}>
                                     Ligi Bitir
                                   </Button>
                                 )}
                                {league.status === 'completed' && isSuperAdmin && (
                                  <Button variant="outline" size="sm" className="h-7 px-2 text-[12px] leading-none" onClick={() => setLeagueToReactivate(league.id)}>
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Devam Et
                                  </Button>
                                )}
                                {isSuperAdmin && (
                                  <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => setLeagueToDelete(league.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-3 pb-3 space-y-4">
                              {/* Edit League Details - only for active leagues */}
                              {league.status === 'active' && (
                              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                                <Label className="text-xs text-muted-foreground">Lig Bilgileri</Label>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs">Mevcut Yıl</Label>
                                      <Input
                                        type="number"
                                        value={editingLeague?.current_year ?? league.current_year ?? ''}
                                        onChange={e => setEditingLeague(prev => {
                                          const base = prev || { ...league };
                                          return { ...base, current_year: parseInt(e.target.value) || null };
                                        })}
                                        placeholder="2025"
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Aktif Sezon</Label>
                                      <Input
                                        value={editingLeague?.active_season ?? league.active_season ?? ''}
                                        onChange={e => setEditingLeague(prev => {
                                          const base = prev || { ...league };
                                          return { ...base, active_season: e.target.value || null };
                                        })}
                                        placeholder="Bahar, Güz, vb."
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Kaç Sayılık?</Label>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {[5, 7, 9, 11, 13].map(n => {
                                        const currentVal = editingLeague?.match_length ?? league.match_length;
                                        const hasMatches = matches.some(m => m.league_id === league.id);
                                        return (
                                          <button
                                            key={n}
                                            type="button"
                                            disabled={hasMatches}
                                            onClick={() => setEditingLeague(prev => {
                                              const base = prev || { ...league };
                                              return { ...base, match_length: n };
                                            })}
                                            className={`w-9 h-8 rounded text-xs font-bold transition-colors ${
                                              currentVal === n
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted hover:bg-muted-foreground/20 text-muted-foreground'
                                            } ${hasMatches ? 'opacity-50 cursor-not-allowed' : ''}`}
                                          >
                                            {n}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    className="w-full h-8 text-xs"
                                    onClick={() => {
                                      if (!editingLeague) {
                                        setEditingLeague({ ...league });
                                      }
                                      updateLeague();
                                    }}
                                  >
                                    Güncelle
                                  </Button>
                                </div>
                              </div>
                              )}

                              {/* Puan Durumu */}
                              {(() => {
                                const stats = calculateLeagueStats(league.id);
                                const leagueMatchList = matches
                                  .filter(m => m.league_id === league.id)
                                  .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
                                return (
                                  <>
                                    {stats.length > 0 && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-1.5">
                                          <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                                          <Label className="text-xs text-muted-foreground">Puan Durumu</Label>
                                        </div>
                                        <div className="bg-card rounded-xl overflow-hidden border border-border">
                                          <div className="grid grid-cols-[24px_1fr_28px_28px_28px_32px_28px] gap-0 px-3 py-2 bg-secondary/50 text-[10px] font-semibold text-muted-foreground">
                                            <div className="text-center">#</div>
                                            <div>Oyuncu</div>
                                            <div className="text-center">O</div>
                                            <div className="text-center">G</div>
                                            <div className="text-center">M</div>
                                            <div className="text-center">Av</div>
                                            <div className="text-center">P</div>
                                          </div>
                                          <div className="divide-y divide-white/15">
                                            {stats.map((s, i) => (
                                              <div key={s.playerId} className="grid grid-cols-[24px_1fr_28px_28px_28px_32px_28px] gap-0 px-3 py-2 text-xs items-center">
                                                <div className="text-center text-muted-foreground font-medium">
                                                  {i === 0 && s.played > 0 ? <Trophy className="w-3 h-3 text-yellow-400 mx-auto" /> : i + 1}
                                                </div>
                                                <div className="font-medium truncate">{s.name}</div>
                                                <div className="text-center text-muted-foreground">{s.played}</div>
                                                <div className="text-center text-success">{s.won}</div>
                                                <div className="text-center text-primary">{s.lost}</div>
                                                <div className={`text-center font-medium ${s.average > 0 ? 'text-success' : s.average < 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                                                  {s.average > 0 ? `+${s.average}` : s.average}
                                                </div>
                                                <div className="text-center font-bold">{s.points}</div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {leagueMatchList.length > 0 && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-1.5">
                                          <Gamepad2 className="w-3.5 h-3.5 text-muted-foreground" />
                                          <Label className="text-xs text-muted-foreground">Maç Sonuçları ({leagueMatchList.length})</Label>
                                        </div>
                                        <div className="space-y-1 max-h-[300px] overflow-y-auto">
                                          {leagueMatchList.map(match => {
                                            const isP1Winner = match.winner_id === match.player1_id;
                                            return (
                                              <div key={match.id} className="flex items-center justify-between px-2 py-1.5 bg-muted/30 rounded text-[11px]">
                                                <span className="text-[10px] text-muted-foreground w-16 shrink-0">
                                                  {format(new Date(match.match_date), 'dd.MM.yy')}
                                                </span>
                                                <div className="flex items-center gap-1 flex-1 justify-center min-w-0">
                                                <span className={`truncate text-right max-w-[80px] ${isP1Winner ? 'font-bold text-green-400' : ''}`}>
                                                    {getPlayerName(match.player1_id)}
                                                  </span>
                                                  <span className="font-mono font-bold px-1 shrink-0">
                                                    {match.score1} - {match.score2}
                                                  </span>
                                                  <span className={`truncate text-left max-w-[80px] ${!isP1Winner ? 'font-bold text-green-400' : ''}`}>
                                                    {getPlayerName(match.player2_id)}
                                                  </span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
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
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Oyuncu Yönetimi
                </CardTitle>
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
                    {[...players].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr')).map(player => (
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
                                        value={editingPlayer?.phone?.replace(/^\+90/, '').replace(/^\+/, '') || ''}
                                        onChange={e => {
                                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                          setEditingPlayer(prev => prev ? { ...prev, phone: digits ? `+90${digits}` : prev.phone } : null);
                                        }}
                                        className="pl-12"
                                        placeholder="5XX XXX XX XX"
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
                {(isSuperAdmin || isAdmin) && manageableLeagues.length > 0 && (
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
                          {players
                            .filter(player => !leaguePlayers.some(lp => lp.league_id === selectedLeagueForPlayer && lp.player_id === player.id))
                            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'))
                            .map(player => (
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
                <CardTitle className="text-base flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-primary" />
                  Maç Düzenleme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {matches.filter(m => {
                  const league = leagues.find(l => l.id === m.league_id);
                  return league && league.status === 'active';
                }).slice(0, 50).map(match => (
                  <div 
                    key={match.id}
                    className="flex items-center gap-2 py-1.5 px-2 bg-muted/20 rounded text-[11px]"
                  >
                    <span className="text-muted-foreground shrink-0 w-[52px]">
                      {new Date(match.match_date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                    <span className="text-muted-foreground shrink-0 truncate max-w-[80px]" title={getLeagueName(match.league_id)}>
                      {getLeagueName(match.league_id)}
                    </span>
                    <div className="flex-1 min-w-0 flex items-center gap-1 justify-center">
                      <span className={`truncate text-right ${match.winner_id === match.player1_id ? 'font-bold' : ''}`}>
                        {getPlayerName(match.player1_id)}
                      </span>
                      <span className="font-mono shrink-0">{match.score1}-{match.score2}</span>
                      <span className={`truncate text-left ${match.winner_id === match.player2_id ? 'font-bold' : ''}`}>
                        {getPlayerName(match.player2_id)}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setEditingMatch({ ...match })}
                          >
                            <Edit className="w-3 h-3" />
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
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => deleteMatch(match.id)}
                      >
                        <Trash2 className="w-3 h-3" />
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

          {/* Tournament Tab */}
          {showTournamentTab && (
            <TabsContent value="tournament">
              <TournamentAdmin 
                players={players} 
                associationId={associations[0]?.id || null}
                isSuperAdmin={isSuperAdmin}
              />
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

                  {/* Add Admin Role */}
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <Label className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin Ekle
                    </Label>
                    <p className="text-xs text-muted-foreground">Adminler oyuncu ve maç yönetimi yapabilir</p>
                    <div className="flex gap-2">
                      <Select value={selectedUserForRole} onValueChange={setSelectedUserForRole}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Kullanıcı Seç" />
                        </SelectTrigger>
                        <SelectContent>
                          {players
                            .filter(player => player.user_id !== null && !userRoles.some(r => r.user_id === player.user_id))
                            .map(player => (
                              <SelectItem key={player.user_id!} value={player.user_id!}>
                                {player.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={addAdminRole} size="icon">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Admin Roles List */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Adminler
                    </h3>
                    {userRoles
                      .filter(r => r.role !== 'super_admin')
                      .map(role => (
                      <div 
                        key={role.id}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{getUserName(role.user_id)}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeAdminRole(role.id, role.user_id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {userRoles.filter(r => r.role !== 'super_admin').length === 0 && (
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
      {/* League completion confirmation dialog */}
      <AlertDialog open={!!leagueToComplete} onOpenChange={(open) => !open && setLeagueToComplete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eksik Maçlar Var</AlertDialogTitle>
            <AlertDialogDescription>
              Bu ligde henüz oynanmamış {leagueToComplete?.missingCount} maç bulunuyor. Yine de ligi tamamlamak istiyor musunuz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => leagueToComplete && confirmCompleteLeague(leagueToComplete.id)}>
              Evet, Tamamla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* League deletion confirmation dialog */}
      <AlertDialog open={!!leagueToDelete} onOpenChange={(open) => !open && setLeagueToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ligi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu ligi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (leagueToDelete) {
                deleteLeague(leagueToDelete);
                setLeagueToDelete(null);
              }
            }}>
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* League reactivation confirmation dialog */}
      <AlertDialog open={!!leagueToReactivate} onOpenChange={(open) => !open && setLeagueToReactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>Bu ligi tekrar aktif hale getirmek istediğinizden emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (leagueToReactivate) {
                reactivateLeague(leagueToReactivate);
                setLeagueToReactivate(null);
              }
            }}>
              Evet, Devam Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
