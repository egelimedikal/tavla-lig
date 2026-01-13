import { useState } from 'react';
import { Header } from '@/components/Header';
import { LeagueTabs } from '@/components/LeagueTabs';
import { StandingsTable } from '@/components/StandingsTable';
import { MatchEntryForm } from '@/components/MatchEntryForm';
import { PlayerProfile } from '@/components/PlayerProfile';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { useLeagueData } from '@/hooks/useLeagueData';
import { useToast } from '@/hooks/use-toast';

type View = 'standings' | 'profile';

const Index = () => {
  const { 
    currentLeague, 
    currentLeagueId, 
    setCurrentLeagueId, 
    standings, 
    addMatch,
    getPlayerMatches,
    getPlayerById 
  } = useLeagueData();
  
  const [view, setView] = useState<View>('standings');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const { toast } = useToast();

  const handlePlayerClick = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setView('profile');
  };

  const handleMatchSubmit = (player1Id: string, player2Id: string, score1: number, score2: number) => {
    addMatch(player1Id, player2Id, score1, score2);
    const winner = score1 > score2 ? getPlayerById(player1Id)?.name : getPlayerById(player2Id)?.name;
    toast({
      title: "Maç Kaydedildi! ⚔️",
      description: `${winner} maçı kazandı (${score1}-${score2})`,
    });
  };

  const selectedPlayer = selectedPlayerId ? getPlayerById(selectedPlayerId) : null;
  const selectedPlayerStats = selectedPlayerId ? standings.find(s => s.playerId === selectedPlayerId) : null;
  const selectedPlayerMatches = selectedPlayerId ? getPlayerMatches(selectedPlayerId) : [];
  const selectedPlayerRank = selectedPlayerId ? standings.findIndex(s => s.playerId === selectedPlayerId) + 1 : 0;

  if (view === 'profile' && selectedPlayer) {
    return (
      <PlayerProfile
        player={selectedPlayer}
        stats={selectedPlayerStats}
        matches={selectedPlayerMatches}
        rank={selectedPlayerRank}
        getPlayerById={getPlayerById}
        onBack={() => setView('standings')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header onProfileClick={() => {
        // For demo, show first player profile
        if (standings.length > 0) {
          setSelectedPlayerId(standings[0].playerId);
          setView('profile');
        }
      }} />
      
      <LeagueTabs 
        currentTab={currentLeagueId} 
        onTabChange={setCurrentLeagueId} 
      />

      <div className="mt-4">
        <div className="px-4 mb-4">
          <h2 className="text-lg font-bold text-foreground">{currentLeague.name}</h2>
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
          players={currentLeague.players}
          onSubmit={handleMatchSubmit}
          onClose={() => setShowMatchForm(false)}
        />
      )}
    </div>
  );
};

export default Index;
