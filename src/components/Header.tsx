import { User, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminRole } from '@/hooks/useAdminRole';
import logo from '@/assets/logo.png';

interface HeaderProps {
  onProfileClick: () => void;
}

export function Header({ onProfileClick }: HeaderProps) {
  const { isAdmin } = useAdminRole();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10">
            <img src={logo} alt="Mustafa Çakır Mahalle Kahvesi Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Tavla Lig</h1>
            
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              to="/admin"
              className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
            >
              <Shield className="w-5 h-5 text-primary" />
            </Link>
          )}
          <button
            onClick={onProfileClick}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <User className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}
