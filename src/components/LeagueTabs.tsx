import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  if (leagues.length === 0) {
    return (
      <div className="px-4 py-3 text-center text-muted-foreground text-sm">
        Bu dernekte henüz lig bulunmuyor
      </div>
    );
  }

  if (leagues.length === 1) {
    return null;
  }

  return (
    <div className="px-4 py-3">
      <Select value={currentLeagueId} onValueChange={onLeagueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Lig seçin" />
        </SelectTrigger>
        <SelectContent>
          {leagues.map((league) => (
            <SelectItem key={league.id} value={league.id}>
              {league.name} {league.status === 'completed' ? `(Tamamlandı - ${format(new Date(league.updated_at), 'dd.MM.yyyy')})` : '(Aktif)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
