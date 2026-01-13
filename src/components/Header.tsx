import { User, Trophy } from 'lucide-react';

interface HeaderProps {
  onProfileClick: () => void;
}

export function Header({ onProfileClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center glow-primary">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Bursa Tavla</h1>
            <p className="text-xs text-muted-foreground">Derneği Ligi</p>
          </div>
        </div>
        <button
          onClick={onProfileClick}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
        >
          <User className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </header>
  );
}
