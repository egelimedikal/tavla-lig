import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sendOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null; isNewUser?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendOtp = async (phone: string) => {
    // Format phone number for Turkey (+90)
    const formattedPhone = phone.startsWith('+') ? phone : `+90${phone.replace(/^0/, '')}`;
    
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });
    
    return { error: error ? new Error(error.message) : null };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+90${phone.replace(/^0/, '')}`;
    
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token,
      type: 'sms',
    });
    
    if (error) {
      return { error: new Error(error.message) };
    }

    // Check if this phone exists in profiles (admin added)
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', formattedPhone)
        .maybeSingle();

      if (profileError) {
        return { error: new Error(profileError.message) };
      }

      if (!profile) {
        // Phone not registered by admin
        await supabase.auth.signOut();
        return { error: new Error('Bu telefon numarası sistemde kayıtlı değil. Lütfen yönetici ile iletişime geçin.') };
      }

      // Link profile to auth user if not already linked
      if (!profile.user_id) {
        await supabase
          .from('profiles')
          .update({ user_id: data.user.id })
          .eq('phone', formattedPhone);
      }
    }
    
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, sendOtp, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
