import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Phone, Lock, ArrowRight, Loader2 } from 'lucide-react';
import tavlaLogo from '@/assets/tavlalogo.png';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const phoneSchema = z.string()
  .min(10, 'Telefon numarası en az 10 karakter olmalı')
  .regex(/^[0-9]+$/, 'Geçerli bir telefon numarası girin');

const passwordSchema = z.string().min(4, 'Şifre en az 4 karakter olmalı');

export default function Auth() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});
  
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setPhone(value);
    }
  };

  const validateForm = () => {
    const newErrors: { phone?: string; password?: string } = {};
    
    try {
      phoneSchema.parse(phone);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.phone = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const { error } = await signIn(phone, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Giriş Başarısız',
            description: 'Telefon numarası veya şifre hatalı.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Hata',
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Hoş Geldiniz! 🎲',
          description: 'Başarıyla giriş yaptınız.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto">
              <img src={tavlaLogo} alt="Türkiye Tavla Birliği Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Türkiye Tavla Birliği</h1>
              <p className="text-muted-foreground">Tavla Ligi</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Telefon Numarası</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
                  <Phone className="w-5 h-5" />
                  <span className="text-sm font-medium">+90</span>
                </div>
                <input
                  type="tel"
                  value={formatPhoneDisplay(phone)}
                  onChange={handlePhoneChange}
                  className="w-full pl-20 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg tracking-wide"
                  placeholder="5XX XXX XX XX"
                  autoComplete="tel"
                />
              </div>
              {errors.phone && <p className="text-xs text-primary">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-xs text-primary">{errors.password}</p>}
              <p className="text-xs text-muted-foreground">
                Şifrenizi yöneticinizden alabilirsiniz
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 glow-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Giriş Yap
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Hesabınız yok mu? Yöneticinize başvurun.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 text-center text-xs text-muted-foreground">
        <p>© 2026 Türkiye Tavla Birliği</p>
        <p className="mt-1">Geliştiren: Yavuz Kanmaz</p>
      </div>
    </div>
  );
}
