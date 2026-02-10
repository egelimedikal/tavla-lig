import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History } from 'lucide-react';

interface League {
  id: string;
  name: string;
  association_id: string | null;
  status: string;
  updated_at: string;
}

interface LeagueTabsProps {
  leagues: League[];
  currentLeagueId: string;
  onLeagueChange: (leagueId: string) => void;
}

export function LeagueTabs({ leagues, currentLeagueId, onLeagueChange }: LeagueTabsProps) {
  const activeLeague = leagues.find(l => l.status === 'active');
  const completedLeagues = leagues
    .filter(l => l.status === 'completed')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  if (leagues.length === 0) {
    return (
      <div className="px-4 py-3 text-center text-muted-foreground text-sm">
        Bu dernekte henüz lig bulunmuyor
      </div>
    );
  }

  if (completedLeagues.length === 0) {
    return null;
  }

  return (
    <Select
      value={currentLeagueId}
      onValueChange={onLeagueChange}
    >
      <SelectTrigger className="w-auto gap-1 h-7 text-[11px] px-2 bg-secondary/50 border-border/50">
        <History className="w-3 h-3 text-muted-foreground" />
        <span className="text-muted-foreground">Geçmiş</span>
      </SelectTrigger>
      <SelectContent>
        {activeLeague && (
          <SelectItem key={activeLeague.id} value={activeLeague.id} className="text-xs font-semibold">
            {activeLeague.name} (Aktif)
          </SelectItem>
        )}
        {completedLeagues.map((league) => (
          <SelectItem key={league.id} value={league.id} className="text-xs">
            {league.name} ({format(new Date(league.updated_at), 'dd.MM.yyyy')})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
