import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const emailSchema = z.string().email('Geçerli bir e-posta adresi girin');
const passwordSchema = z.string().min(6, 'Şifre en az 6 karakter olmalı');
const nameSchema = z.string().min(2, 'İsim en az 2 karakter olmalı');

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; name?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (!isLogin) {
      try {
        nameSchema.parse(name);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.name = e.errors[0].message;
        }
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
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Giriş Başarısız',
              description: 'E-posta veya şifre hatalı.',
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
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Hesap Mevcut',
              description: 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.',
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
            title: 'Hesap Oluşturuldu! 🎉',
            description: 'Başarıyla kayıt oldunuz.',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto glow-primary">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Türkiye Tavla Birliği</h1>
              <p className="text-muted-foreground">Tavla Ligi</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Ad Soyad</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Adınız Soyadınız"
                  />
                </div>
                {errors.name && <p className="text-xs text-primary">{errors.name}</p>}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="ornek@email.com"
                />
              </div>
              {errors.email && <p className="text-xs text-primary">{errors.email}</p>}
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 glow-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <span className="animate-pulse">Yükleniyor...</span>
              ) : (
                <>
                  {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? (
                <>Hesabınız yok mu? <span className="text-primary font-semibold">Kayıt Ol</span></>
              ) : (
                <>Zaten hesabınız var mı? <span className="text-primary font-semibold">Giriş Yap</span></>
              )}
            </button>
          </div>
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
