import { LeagueTab } from '@/types/league';

interface LeagueTabsProps {
  currentTab: LeagueTab;
  onTabChange: (tab: LeagueTab) => void;
}

const tabs: { id: LeagueTab; label: string }[] = [
  { id: 'super-a', label: 'Süper Lig A' },
  { id: 'super-b', label: 'Süper Lig B' },
  { id: 'lig1-a', label: '1. Lig A' },
  { id: 'lig1-b', label: '1. Lig B' },
];

export function LeagueTabs({ currentTab, onTabChange }: LeagueTabsProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 px-4 py-3 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              currentTab === tab.id
                ? 'bg-primary text-primary-foreground glow-primary'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
