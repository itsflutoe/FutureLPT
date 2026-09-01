import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, UserSettings } from '@/types';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  settings: UserSettings | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data as Profile | null);
  };

  const fetchSettings = async (userId: string) => {
    const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
    setSettings(data as UserSettings | null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const refreshSettings = async () => {
    if (user) await fetchSettings(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchSettings(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchSettings(session.user.id);
      } else {
        setProfile(null);
        setSettings(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, settings, loading, refreshProfile, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
