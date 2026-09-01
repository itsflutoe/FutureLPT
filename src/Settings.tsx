import { useState } from 'react';
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

  const saveProfile = async () => {
    if (!user) return;
    setErr('');
    try {
      await supabase.from('profiles').update({ display_name: displayName }).eq('id', user.id);
      await refreshProfile();
      setMsg('Profile updated.');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const changePassword = async () => {
    setErr('');
    try {
      await updatePassword(newPassword);
      setMsg('Password updated.');
      setNewPassword('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Password change failed');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      {msg && <div className="rounded-xl bg-green-50 text-green-700 px-4 py-3 text-sm">{msg}</div>}
      {err && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{err}</div>}

      <Card>
        <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Theme</label>
            <div className="flex gap-2">
              {(['system', 'light', 'dark'] as ThemeMode[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${theme === t ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10' : 'border-[var(--border)]'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Accent color</label>
            <div className="flex gap-3">
              {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setAccent(c)}
                  className={`h-8 w-8 rounded-full border-2 ${accent === c ? 'border-[var(--foreground)]' : 'border-transparent'}`}
                  style={{ backgroundColor: ACCENT_COLORS[c] }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Display name</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Username</label>
            <Input value={profile?.username || ''} disabled />
          </div>
          <Button onClick={saveProfile}>Save profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Change password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} />
          <Button onClick={changePassword} disabled={newPassword.length < 6}>Update password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
