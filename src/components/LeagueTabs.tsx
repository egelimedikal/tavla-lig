import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History } from 'lucide-react';

interface LeagueTabsProps {
  seasonGroups: Map<string, any[]>;
  selectedSeasonKey: string | null;
  onSeasonChange: (key: string | null) => void;
  hasActiveLeagues: boolean;
}

export function LeagueTabs({ seasonGroups, selectedSeasonKey, onSeasonChange, hasActiveLeagues }: LeagueTabsProps) {
  if (seasonGroups.size === 0) return null;

  const seasonKeys = [...seasonGroups.keys()];

  return (
    <Select
      value={selectedSeasonKey || '_active'}
      onValueChange={(val) => onSeasonChange(val === '_active' ? null : val)}
    >
      <SelectTrigger className="w-auto gap-1 h-7 text-[11px] px-2 bg-secondary/50 border-border/50">
        <History className="w-3 h-3 text-muted-foreground" />
        <span className="text-muted-foreground">Geçmiş</span>
      </SelectTrigger>
      <SelectContent>
        {hasActiveLeagues && (
          <SelectItem value="_active" className="text-xs font-semibold">
            Aktif Sezon
          </SelectItem>
        )}
        {seasonKeys.map(key => (
          <SelectItem key={key} value={key} className="text-xs">
            {key}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
