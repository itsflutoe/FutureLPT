import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';
import type { AccentColor, ThemeMode } from '@/types';
import { ACCENT_COLORS } from '@/types';

interface ThemeContextType {
  theme: ThemeMode;
  accent: AccentColor;
  resolvedTheme: 'light' | 'dark';
  setTheme: (t: ThemeMode) => void;
  setAccent: (a: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, user, refreshSettings } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [accent, setAccentState] = useState<AccentColor>('green');
  const [resolvedTheme, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (settings) {
      setThemeState(settings.theme || 'system');
      setAccentState(settings.accent_color || 'green');
    }
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      let resolved: 'light' | 'dark' = 'light';
      if (theme === 'system') {
        resolved = media.matches ? 'dark' : 'light';
      } else {
        resolved = theme;
      }
      setResolved(resolved);
      root.classList.toggle('dark', resolved === 'dark');
      root.style.setProperty('--accent-color', ACCENT_COLORS[accent]);
    };

    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme, accent]);

  const setTheme = async (t: ThemeMode) => {
    setThemeState(t);
    if (user) {
      await supabase.from('user_settings').update({ theme: t }).eq('user_id', user.id);
      refreshSettings();
    }
  };

  const setAccent = async (a: AccentColor) => {
    setAccentState(a);
    if (user) {
      await supabase.from('user_settings').update({ accent_color: a }).eq('user_id', user.id);
      refreshSettings();
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, accent, resolvedTheme, setTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
