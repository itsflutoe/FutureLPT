import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { format } from 'date-fns';

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const [managing, setManaging] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: qError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (qError) setError(qError.message);
    setUsers((data || []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openManage = (u: Profile) => {
    setManaging(u);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setStatus('');
  };

  const closeManage = () => {
    setManaging(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  const resetPassword = async () => {
    if (!managing) return;
    setError('');
    setStatus('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setResetting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('You must be logged in as an administrator.');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) {
        throw new Error('App is not configured.');
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/admin-reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          user_id: managing.id,
          new_password: newPassword,
        }),
      });

      let payload: { error?: string; ok?: boolean; message?: string } = {};
      try {
        payload = await res.json();
      } catch {
        /* ignore */
      }

      if (!res.ok) {
        if (res.status === 403) throw new Error(payload.error || 'Only administrators can reset passwords.');
        if (res.status === 404) throw new Error(payload.error || 'Target user not found.');
        if (res.status === 401) throw new Error(payload.error || 'Unauthorized.');
        throw new Error(payload.error || `Password reset failed (${res.status}).`);
      }

      setStatus('Password successfully reset.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Password reset failed.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>

      {error && !managing && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {status && !managing && (
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          {status}
        </div>
      )}

      {managing && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Manage User</h2>
                <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                  {managing.display_name} · @{managing.username}
                </p>
              </div>
              <Badge variant={managing.role === 'ADMIN' ? 'success' : 'outline'}>{managing.role}</Badge>
            </div>

            <div className="border-t border-[var(--border)] pt-4 space-y-3">
              <h3 className="text-sm font-medium">Reset Password</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                Sets a new password in Supabase Auth. The user signs in with their username and this
                new password. Do not store passwords in profiles.
              </p>

              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
                  {error}
                </div>
              )}
              {status && (
                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
                  {status}
                </div>
              )}

              <div>
                <label className="text-xs font-medium mb-1 block">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={resetPassword} disabled={resetting}>
                  {resetting ? 'Resetting…' : 'Reset Password'}
                </Button>
                <Button variant="outline" onClick={closeManage} disabled={resetting}>
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-medium text-sm">
                  {u.display_name}{' '}
                  <span className="text-[var(--muted-foreground)]">@{u.username}</span>
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  Joined {format(new Date(u.created_at), 'MMM d, yyyy')} · Streak {u.current_streak}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={u.role === 'ADMIN' ? 'success' : 'outline'}>{u.role}</Badge>
                <Button size="sm" variant="outline" onClick={() => openManage(u)}>
                  Manage User
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
