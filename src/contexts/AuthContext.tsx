import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
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

  const signIn = async (phone: string, password: string) => {
    // Format phone number for Turkey (+90) and use as email
    const formattedPhone = phone.replace(/\D/g, '');
    const phoneEmail = `${formattedPhone}@tavla.app`;
    
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneEmail,
      password,
    });
    
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    try {
      // First try global sign out
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Global sign out failed, trying local:', error);
        // If global fails (e.g. session expired), do local sign out to clear localStorage
        await supabase.auth.signOut({ scope: 'local' });
      }
    } catch (error) {
      console.error('Sign out error, forcing local cleanup:', error);
      // Last resort: force local sign out
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (e) {
        // Even if this fails, clear state below
        console.error('Local sign out also failed:', e);
      }
    } finally {
      // Always clear local state
      setSession(null);
      setUser(null);
    }
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    return { error: error ? new Error(error.message) : null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, updatePassword }}>
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
