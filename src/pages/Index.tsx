import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { AssociationSelector } from '@/components/AssociationSelector';
import { LeagueTabs } from '@/components/LeagueTabs';
import { StandingsTable } from '@/components/StandingsTable';
import { MatchEntryForm } from '@/components/MatchEntryForm';
import { PlayerProfile } from '@/components/PlayerProfile';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { ForcePasswordChange } from '@/components/ForcePasswordChange';
import { AnnouncementsBanner } from '@/components/AnnouncementsBanner';
import { useSupabaseLeague } from '@/hooks/useSupabaseLeague';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type View = 'standings' | 'profile' | 'force-password-change';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { 
    associations,
    currentAssociation,
    currentAssociationId,
    setCurrentAssociationId,
    associationLeagues,
    currentLeague, 
    currentLeagueId, 
    setCurrentLeagueId, 
    standings, 
    players,
    loading,
    addMatch,
    getPlayerMatches,
    getPlayerById,
    currentUserProfile,
  } = useSupabaseLeague();
  
  const [view, setView] = useState<View>('standings');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const { toast } = useToast();

  // Check if user needs to change password
  useEffect(() => {
    if (currentUserProfile?.must_change_password) {
      setView('force-password-change');
    }
  }, [currentUserProfile]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handlePlayerClick = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setView('profile');
  };

  const handleMatchSubmit = async (player1Id: string, player2Id: string, score1: number, score2: number) => {
    const result = await addMatch(player1Id, player2Id, score1, score2);
    if (result) {
      const winner = score1 > score2 ? getPlayerById(player1Id)?.name : getPlayerById(player2Id)?.name;
      toast({
        title: "Maç Kaydedildi! ⚔️",
        description: `${winner} maçı kazandı (${score1}-${score2})`,
      });
    }
  };

  const handleProfileClick = () => {
    if (currentUserProfile) {
      setSelectedPlayerId(currentUserProfile.id);
      setView('profile');
    }
  };

  const handlePasswordChangeComplete = useCallback(() => {
    setView('standings');
    // Reload the page to refresh the profile data
    window.location.reload();
  }, []);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const selectedPlayer = selectedPlayerId ? getPlayerById(selectedPlayerId) : null;
  const selectedPlayerStats = selectedPlayerId ? standings.find(s => s.playerId === selectedPlayerId) : null;
  const selectedPlayerMatches = selectedPlayerId ? getPlayerMatches(selectedPlayerId) : [];
  const selectedPlayerRank = selectedPlayerId ? standings.findIndex(s => s.playerId === selectedPlayerId) + 1 : 0;
  const isOwnProfile = selectedPlayerId === currentUserProfile?.id;

  if (view === 'force-password-change' && currentUserProfile) {
    return (
      <ForcePasswordChange 
        profileId={currentUserProfile.id} 
        onComplete={handlePasswordChangeComplete}
      />
    );
  }

  if (view === 'profile' && selectedPlayer) {
    return (
      <PlayerProfile
        player={selectedPlayer}
        stats={selectedPlayerStats}
        matches={selectedPlayerMatches}
        rank={selectedPlayerRank}
        getPlayerById={getPlayerById}
        onBack={() => setView('standings')}
        isOwnProfile={isOwnProfile}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header onProfileClick={handleProfileClick} />
      
      <AssociationSelector
        associations={associations}
        currentAssociationId={currentAssociationId}
        onAssociationChange={setCurrentAssociationId}
      />
      
      <LeagueTabs 
        leagues={associationLeagues}
        currentLeagueId={currentLeagueId} 
        onLeagueChange={setCurrentLeagueId} 
      />

      <AnnouncementsBanner associationId={currentAssociationId} />

      <div className="mt-4">
        <div className="px-4 mb-4">
          <h2 className="text-lg font-bold text-foreground">{currentLeague?.name || 'Lig'}</h2>
          <p className="text-sm text-muted-foreground">Puan Durumu</p>
        </div>
        
        <StandingsTable 
          standings={standings} 
          onPlayerClick={handlePlayerClick} 
        />
      </div>

      <FloatingActionButton onClick={() => setShowMatchForm(true)} />

      {showMatchForm && (
        <MatchEntryForm
          players={players}
          currentPlayerId={currentUserProfile?.id}
          onSubmit={handleMatchSubmit}
          onClose={() => setShowMatchForm(false)}
        />
      )}
    </div>
  );
};

export default Index;
