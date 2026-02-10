import { User, Shield, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useAssociationAdminRole } from '@/hooks/useAssociationAdminRole';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';

interface HeaderProps {
  onProfileClick: () => void;
}

export function Header({ onProfileClick }: HeaderProps) {
  const { isAdmin } = useAdminRole();
  const { associationAdmins } = useAssociationAdminRole();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

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
          {(isAdmin || associationAdmins.length > 0) && (
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
          <button
            onClick={handleSignOut}
            className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center hover:bg-destructive/30 transition-colors"
            title="Çıkış Yap"
          >
            <LogOut className="w-4 h-4 text-destructive" />
          </button>
        </div>
      </div>
    </header>
  );
}
