import { useState } from 'react';
import { Key, Loader2, Eye, EyeOff } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const passwordSchema = z.string().min(4, 'Şifre en az 4 karakter olmalı');

interface ForcePasswordChangeProps {
  profileId: string;
  onComplete: () => void;
}

export function ForcePasswordChange({ profileId, onComplete }: ForcePasswordChangeProps) {
  const { updatePassword } = useAuth();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async () => {
    setPasswordError('');
    
    try {
      passwordSchema.parse(newPassword);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setPasswordError(e.errors[0].message);
        return;
      }
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Şifreler eşleşmiyor');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        toast({
          title: 'Hata',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      // Update profile to mark password as changed
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', profileId);

      if (updateError) {
        logger.error('Profile update error:', updateError);
      }

      toast({
        title: 'Hoş Geldiniz! 🎲',
        description: 'Şifreniz başarıyla değiştirildi.',
      });
      
      onComplete();
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
            <Key className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Şifre Değiştir</h1>
            <p className="text-muted-foreground mt-2">
              İlk girişinizde şifrenizi değiştirmeniz gerekmektedir.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Yeni Şifre</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 pr-12 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Yeni Şifre (Tekrar)</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 pr-12 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {passwordError && (
            <p className="text-sm text-primary">{passwordError}</p>
          )}
          <button
            onClick={handlePasswordChange}
            disabled={changingPassword || !newPassword || !confirmPassword}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 glow-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {changingPassword ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Şifreyi Değiştir ve Devam Et'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
