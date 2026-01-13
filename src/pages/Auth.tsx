import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Phone, ArrowRight, Shield, Loader2 } from 'lucide-react';
import tavlaLogo from '@/assets/tavlalogo.png';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const phoneSchema = z.string()
  .min(10, 'Telefon numarası en az 10 karakter olmalı')
  .regex(/^[0-9+]+$/, 'Geçerli bir telefon numarası girin');

export default function Auth() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  
  const { sendOtp, verifyOtp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhoneDisplay = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Format as 5XX XXX XX XX
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      phoneSchema.parse(phone);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await sendOtp(phone);
      if (error) {
        toast({
          title: 'Hata',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setStep('otp');
        setCountdown(60);
        toast({
          title: 'Doğrulama Kodu Gönderildi 📱',
          description: 'Telefonunuza gelen 6 haneli kodu girin.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('6 haneli kodu eksiksiz girin');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error } = await verifyOtp(phone, otp);
      if (error) {
        setError(error.message);
        toast({
          title: 'Doğrulama Başarısız',
          description: error.message,
          variant: 'destructive',
        });
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

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    try {
      const { error } = await sendOtp(phone);
      if (error) {
        toast({
          title: 'Hata',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setCountdown(60);
        setOtp('');
        toast({
          title: 'Kod Tekrar Gönderildi 📱',
          description: 'Yeni doğrulama kodunuz gönderildi.',
        });
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
            <div className="w-24 h-24 mx-auto">
              <img src={tavlaLogo} alt="Türkiye Tavla Birliği Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Türkiye Tavla Birliği</h1>
              <p className="text-muted-foreground">Tavla Ligi</p>
            </div>
          </div>

          {step === 'phone' ? (
            /* Phone Input Step */
            <form onSubmit={handleSendOtp} className="space-y-6">
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
                {error && <p className="text-xs text-primary">{error}</p>}
                <p className="text-xs text-muted-foreground">
                  Yönetici tarafından sisteme eklenen telefon numaranızı girin
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
                    Doğrulama Kodu Gönder
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* OTP Verification Step */
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">+90 {formatPhoneDisplay(phone)}</span> numarasına gönderilen 6 haneli kodu girin
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => {
                    setOtp(value);
                    setError(null);
                  }}
                  onComplete={handleVerifyOtp}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
                    <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
                    <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
                    <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
                    <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
                    <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && <p className="text-xs text-primary text-center">{error}</p>}

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
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

              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || loading}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                >
                  {countdown > 0 ? (
                    <span>Tekrar gönder ({countdown}s)</span>
                  ) : (
                    <span className="text-primary font-medium">Kodu tekrar gönder</span>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setError(null);
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Numarayı değiştir
                </button>
              </div>
            </div>
          )}
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
