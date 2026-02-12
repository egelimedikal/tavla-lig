import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';

import { LeagueTabs } from '@/components/LeagueTabs';
import { StandingsTable } from '@/components/StandingsTable';
import { TournamentStandings } from '@/components/TournamentStandings';
import { MatchEntryForm } from '@/components/MatchEntryForm';
import { PlayerProfile } from '@/components/PlayerProfile';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { ForcePasswordChange } from '@/components/ForcePasswordChange';
import { useSupabaseLeague } from '@/hooks/useSupabaseLeague';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trophy, Swords } from 'lucide-react';

type View = 'standings' | 'profile' | 'force-password-change';
type TabMode = 'league' | 'tournament';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useAdminRole();
  const navigate = useNavigate();
  const { 
    associations,
    currentAssociation,
    currentAssociationId,
    setCurrentAssociationId,
    associationLeagues,
    leagues,
    currentLeague, 
    currentLeagueId, 
    setCurrentLeagueId, 
    standings, 
    players,
    matches: allMatches,
    leaguePlayers,
    loading,
    addMatch,
    getPlayerMatches,
    getPlayerById,
    currentUserProfile,
    refetchProfiles,
    calculateStats,
  } = useSupabaseLeague();
  
  const [view, setView] = useState<View>('standings');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [tabMode, setTabMode] = useState<TabMode>('league');
  const { toast } = useToast();
  const [selectedSeasonKey, setSelectedSeasonKey] = useState<string | null>(null);

  const activeLeagues = useMemo(() => 
    associationLeagues.filter((l: any) => l.status === 'active'),
    [associationLeagues]
  );

  const seasonGroups = useMemo(() => {
    const completed = associationLeagues.filter((l: any) => l.status === 'completed');
    const groups = new Map<string, any[]>();
    completed.forEach((league: any) => {
      const parts: string[] = [];
      if (league.current_year) parts.push(String(league.current_year));
      if (league.active_season) parts.push(league.active_season);
      const key = parts.length > 0 ? parts.join(' ') : 'Diğer';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(league);
    });
    // Sort keys: newest first (by most recent updated_at in each group)
    const sorted = new Map(
      [...groups.entries()].sort((a, b) => {
        const latestA = Math.max(...a[1].map((l: any) => new Date(l.updated_at).getTime()));
        const latestB = Math.max(...b[1].map((l: any) => new Date(l.updated_at).getTime()));
        return latestB - latestA;
      })
    );
    return sorted;
  }, [associationLeagues]);

  const visibleLeagues = useMemo(() => 
    selectedSeasonKey ? (seasonGroups.get(selectedSeasonKey) || []) : activeLeagues,
    [selectedSeasonKey, seasonGroups, activeLeagues]
  );

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


  // Auto-select league when visible leagues change
  useEffect(() => {
    if (visibleLeagues.length > 0 && !visibleLeagues.find((l: any) => l.id === currentLeagueId)) {
      setCurrentLeagueId(visibleLeagues[0].id);
    }
  }, [visibleLeagues, currentLeagueId, setCurrentLeagueId]);

  // Reset season when association changes
  useEffect(() => {
    setSelectedSeasonKey(null);
  }, [currentAssociationId]);

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
        allMatches={allMatches}
        leagues={leagues}
        associations={associations}
        leaguePlayers={leaguePlayers}
        rank={selectedPlayerRank}
        getPlayerById={getPlayerById}
        onBack={() => setView('standings')}
        isOwnProfile={isOwnProfile}
        onProfileUpdate={refetchProfiles}
        addMatch={addMatch}
        calculateStats={calculateStats}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header onProfileClick={handleProfileClick} />
      
      {/* League Buttons + Tournament */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
        {visibleLeagues.length > 0 && visibleLeagues.map((league: any) => (
          <button
            key={league.id}
            onClick={() => { setTabMode('league'); setCurrentLeagueId(league.id); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tabMode === 'league' && currentLeagueId === league.id
                ? 'bg-primary text-primary-foreground glow-primary'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            <Swords className="w-4 h-4" />
            {league.name}
          </button>
        ))}
        <button
          onClick={() => setTabMode('tournament')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tabMode === 'tournament'
              ? 'bg-primary text-primary-foreground glow-primary'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
          }`}
        >
          <Trophy className="w-4 h-4" />
          Turnuva
        </button>
      </div>

      {tabMode === 'league' ? (
        <>
          <div className="mt-4">
            <div className="px-4 mb-4">
              {currentAssociation && (
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {currentAssociation.logo_url && (
                      <img 
                        src={currentAssociation.logo_url} 
                        alt={currentAssociation.name} 
                        className="w-12 h-12 object-contain rounded-lg flex-shrink-0"
                      />
                    )}
                    <div>
                      <h1 className="text-xl font-bold text-foreground">{currentAssociation.name}</h1>
                      {((currentLeague as any)?.current_year || (currentLeague as any)?.active_season) && (
                        <div className="flex items-center gap-2 text-sm">
                          {(currentLeague as any)?.current_year && (
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">
                              {(currentLeague as any).current_year}
                            </span>
                          )}
                          {(currentLeague as any)?.active_season && (
                            <span className="text-muted-foreground">
                              {(currentLeague as any).active_season} Sezonu
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Puan Durumu</p>
                <LeagueTabs 
                  seasonGroups={seasonGroups}
                  selectedSeasonKey={selectedSeasonKey}
                  onSeasonChange={setSelectedSeasonKey}
                  hasActiveLeagues={activeLeagues.length > 0}
                />
              </div>
            </div>
            
            {standings.length > 0 ? (
              <StandingsTable 
                standings={standings} 
                onPlayerClick={handlePlayerClick} 
              />
            ) : (
              <div className="px-4 text-center text-muted-foreground py-8">
                <p>Oyuncu bilgileri yükleniyor...</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4">
          {visibleLeagues.length === 0 && (
            <div className="px-4 mb-2">
              <button
                onClick={() => setTabMode('league')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-secondary text-muted-foreground hover:bg-secondary/80 transition-all"
              >
                <Swords className="w-4 h-4" />
                Lig
              </button>
            </div>
          )}
          <TournamentStandings 
            players={players}
            onPlayerClick={handlePlayerClick}
          />
        </div>
      )}

      {showMatchForm && (
        <MatchEntryForm
          players={players.filter(p => 
            leaguePlayers.some(lp => lp.league_id === currentLeagueId && lp.player_id === p.id)
          )}
          leagueMatches={allMatches.filter(m => m.league_id === currentLeagueId)}
          currentPlayerId={currentUserProfile?.id}
          matchLength={(currentLeague as any)?.match_length ?? 9}
          onSubmit={handleMatchSubmit}
          onClose={() => setShowMatchForm(false)}
        />
      )}

      {isAdmin && tabMode === 'league' && <FloatingActionButton onClick={() => setShowMatchForm(true)} />}
    </div>
  );
};

export default Index;
