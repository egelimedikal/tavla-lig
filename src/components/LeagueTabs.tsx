interface League {
  id: string;
  name: string;
  association_id: string | null;
}

interface LeagueTabsProps {
  leagues: League[];
  currentLeagueId: string;
  onLeagueChange: (leagueId: string) => void;
}

export function LeagueTabs({ leagues, currentLeagueId, onLeagueChange }: LeagueTabsProps) {
  if (leagues.length === 0) {
    return (
      <div className="px-4 py-3 text-center text-muted-foreground text-sm">
        Bu dernekte henüz lig bulunmuyor
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 px-4 py-3 min-w-max">
        {leagues.map((league) => (
          <button
            key={league.id}
            onClick={() => onLeagueChange(league.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              currentLeagueId === league.id
                ? 'bg-primary text-primary-foreground glow-primary'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
            }`}
          >
            {league.name}
          </button>
        ))}
      </div>
    </div>
  );
}
