import { Trophy, Medal } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
}

interface PlayerStats {
  playerId: string;
  player: Profile;
  played: number;
  won: number;
  lost: number;
  scored: number;
  conceded: number;
  average: number;
  points: number;
}

interface StandingsTableProps {
  standings: PlayerStats[];
  onPlayerClick: (playerId: string) => void;
}

export function StandingsTable({ standings, onPlayerClick }: StandingsTableProps) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-gold" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-silver" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-bronze" />;
    return <span className="text-muted-foreground">{rank}</span>;
  };

  const getRankClass = (rank: number) => {
    if (rank === 1) return 'bg-gold/10 border-l-2 border-l-gold';
    if (rank === 2) return 'bg-silver/5 border-l-2 border-l-silver';
    if (rank === 3) return 'bg-bronze/5 border-l-2 border-l-bronze';
    return '';
  };

  return (
    <div className="px-4 animate-fade-in">
      <div className="bg-card rounded-xl overflow-hidden border border-border">
        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_32px_32px_32px_40px_40px_40px_48px] gap-1 px-3 py-3 bg-secondary/50 text-xs font-semibold text-muted-foreground">
          <div className="text-center">#</div>
          <div>Oyuncu</div>
          <div className="text-center">O</div>
          <div className="text-center">G</div>
          <div className="text-center">M</div>
          <div className="text-center">A</div>
          <div className="text-center">Y</div>
          <div className="text-center">Av</div>
          <div className="text-center">P</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border/50">
          {standings.map((stat, index) => (
            <button
              key={stat.playerId}
              onClick={() => onPlayerClick(stat.playerId)}
              className={`w-full grid grid-cols-[40px_1fr_32px_32px_32px_40px_40px_40px_48px] gap-1 px-3 py-3 text-sm hover:bg-secondary/30 transition-colors ${getRankClass(index + 1)}`}
            >
              <div className="flex items-center justify-center">
                {getRankIcon(index + 1)}
              </div>
              <div className="flex items-center gap-2 text-left min-w-0">
                {stat.player?.avatar_url ? (
                  <img 
                    src={stat.player.avatar_url} 
                    alt={stat.player.name || 'Oyuncu'}
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                    {stat.player?.name?.charAt(0) || '?'}
                  </div>
                )}
                <span className="font-medium text-foreground truncate">
                  {stat.player?.name || 'Bilinmeyen Oyuncu'}
                </span>
              </div>
              <div className="text-center text-muted-foreground">{stat.played}</div>
              <div className="text-center text-success font-medium">{stat.won}</div>
              <div className="text-center text-primary font-medium">{stat.lost}</div>
              <div className="text-center text-muted-foreground">{stat.scored}</div>
              <div className="text-center text-muted-foreground">{stat.conceded}</div>
              <div className={`text-center font-medium ${stat.average > 0 ? 'text-success' : stat.average < 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                {stat.average > 0 ? `+${stat.average}` : stat.average}
              </div>
              <div className="text-center font-bold text-foreground">{stat.points}</div>
            </button>
          ))}
        </div>

        {standings.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <p>Henüz maç oynanmamış</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground justify-center">
        <span><strong>O:</strong> Oynadı</span>
        <span><strong>G:</strong> Galibiyet</span>
        <span><strong>M:</strong> Mağlubiyet</span>
        <span><strong>A:</strong> Attığı</span>
        <span><strong>Y:</strong> Yediği</span>
        <span><strong>Av:</strong> Averaj</span>
        <span><strong>P:</strong> Puan</span>
      </div>
    </div>
  );
}
