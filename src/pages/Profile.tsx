import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getOverallStats } from '@/services/progress';
import { getUserAchievements } from '@/services/achievements';
import { resetOwnProgress } from '@/services/accountReset';
import { formatPercent } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { User, Shield, RotateCcw } from 'lucide-react';

export default function Profile() {
  const { profile, user, refreshProfile } = useAuth();
  const [stats, setStats] = useState({ questionsAnswered: 0, accuracy: 0, mockExamsCompleted: 0 });
  const [achCount, setAchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [resetErr, setResetErr] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [s, a] = await Promise.all([getOverallStats(user.id), getUserAchievements(user.id)]);
      setStats(s);
      setAchCount(a.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleResetProgress = async () => {
    setResetMsg('');
    setResetErr('');
    const ok = window.confirm(
      'Reset ALL your FLPT progress?\n\nThis clears practice history, mocks, stats, streaks, bookmarks, and achievements.\n\nYour login and profile stay the same. This cannot be undone.'
    );
    if (!ok) return;
    const ok2 = window.confirm('Final confirmation: reset your progress to zero?');
    if (!ok2) return;

    setResetting(true);
    try {
      await resetOwnProgress();
      await refreshProfile();
      await load();
      setResetMsg('Progress reset. You can start fresh.');
    } catch (e: unknown) {
      setResetErr(e instanceof Error ? e.message : 'Reset failed');
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

  const isAdmin = profile?.role === 'ADMIN';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-color)]/15 text-[var(--accent-color)]">
          <User className="h-8 w-8" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">{profile?.display_name}</h1>
          <p className="text-[var(--muted-foreground)] truncate">@{profile?.username}</p>
          <p className="text-sm text-[var(--muted-foreground)]">{profile?.program || 'BEEd'}</p>
        </div>
      </div>

      {profile?.target_let_date && (
        <Card>
          <CardContent className="p-4 text-sm">
            Target LET date: <strong>{profile.target_let_date}</strong>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--muted-foreground)]">Answered</div>
            <div className="text-xl font-bold">{stats.questionsAnswered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--muted-foreground)]">Accuracy</div>
            <div className="text-xl font-bold">{formatPercent(stats.accuracy)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--muted-foreground)]">Mocks</div>
            <div className="text-xl font-bold">{stats.mockExamsCompleted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--muted-foreground)]">Streak</div>
            <div className="text-xl font-bold">{profile?.current_streak || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--muted-foreground)]">Best Streak</div>
            <div className="text-xl font-bold">{profile?.best_streak || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--muted-foreground)]">Achievements</div>
            <div className="text-xl font-bold">{achCount}</div>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium text-sm">Admin Panel</div>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Manage questions, imports, and users.
                </p>
              </div>
            </div>
            <Link to="/admin">
              <Button size="sm" className="w-full sm:w-auto">
                Open Admin Panel
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm">Reset progress</div>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Clears your history, stats, streaks, bookmarks, and achievements. Does not delete your
                account or change your password.
              </p>
            </div>
          </div>
          {resetErr && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
              {resetErr}
            </div>
          )}
          {resetMsg && (
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-3 py-2 text-sm">
              {resetMsg}
            </div>
          )}
          <Button variant="danger" className="w-full sm:w-auto" disabled={resetting} onClick={handleResetProgress}>
            {resetting ? 'Resetting…' : 'Reset my progress'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
