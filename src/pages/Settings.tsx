import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { updatePassword } from '@/services/auth';
import type { AccentColor, ThemeMode } from '@/types';
import { ACCENT_COLORS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function Settings() {
  const { profile, user, refreshProfile } = useAuth();
  const { theme, accent, setTheme, setAccent } = useTheme();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile?.display_name]);

  const saveProfile = async () => {
    if (!user) return;
    setErr('');
    setMsg('');
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setMsg('Profile updated.');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setErr('');
    setMsg('');
    if (newPassword.length < 6) {
      setErr('Password must be at least 6 characters.');
      return;
    }
    setChangingPw(true);
    try {
      await updatePassword(newPassword);
      setMsg('Password updated.');
      setNewPassword('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Password change failed');
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-8 space-y-5 overflow-x-clip">
      <h1 className="text-2xl font-bold">Settings</h1>
      {msg && (
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {err}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {(['system', 'light', 'dark'] as ThemeMode[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`rounded-lg border px-3 py-2.5 text-sm capitalize min-h-11 ${
                    theme === t
                      ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10'
                      : 'border-[var(--border)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Accent color</label>
            <div className="flex gap-3 flex-wrap">
              {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAccent(c)}
                  className={`h-10 w-10 rounded-full border-2 ${accent === c ? 'border-[var(--foreground)]' : 'border-transparent'}`}
                  style={{ backgroundColor: ACCENT_COLORS[c] }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Display name</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Username</label>
            <Input value={profile?.username || ''} disabled />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Username cannot be changed.</p>
          </div>
          <Button
            className="w-full"
            onClick={saveProfile}
            disabled={saving || !displayName.trim()}
          >
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="New password (min 6 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            autoComplete="new-password"
          />
          <Button
            className="w-full"
            onClick={changePassword}
            disabled={changingPw || newPassword.length < 6}
          >
            {changingPw ? 'Updating…' : 'Update password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
