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
import { User, Shield, RotateCcw, Settings, Trophy } from 'lucide-react';

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
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-8 space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-[var(--accent-color)]/15 text-[var(--accent-color)] shrink-0">
          <User className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{profile?.display_name}</h1>
          <p className="text-sm text-[var(--muted-foreground)] truncate">@{profile?.username}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{profile?.program || 'BEEd'}</p>
        </div>
      </div>

      {profile?.target_let_date && (
        <Card>
          <CardContent className="p-3 text-sm">
            Target LET: <strong>{profile.target_let_date}</strong>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Card className="min-w-0">
          <CardContent className="p-3">
            <div className="text-[10px] text-[var(--muted-foreground)]">Accuracy</div>
            <div className="text-lg font-bold tabular-nums">{formatPercent(stats.accuracy)}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="p-3">
            <div className="text-[10px] text-[var(--muted-foreground)]">Answered</div>
            <div className="text-lg font-bold tabular-nums">{stats.questionsAnswered}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="p-3">
            <div className="text-[10px] text-[var(--muted-foreground)]">Streak</div>
            <div className="text-lg font-bold tabular-nums">{profile?.current_streak || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Link
          to="/achievements"
          className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--muted)]/40"
        >
          <Trophy className="h-5 w-5 text-[var(--accent-color)] shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Achievements</div>
            <div className="text-xs text-[var(--muted-foreground)]">{achCount} earned</div>
          </div>
        </Link>
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--muted)]/40"
        >
          <Settings className="h-5 w-5 text-[var(--accent-color)] shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Settings</div>
            <div className="text-xs text-[var(--muted-foreground)]">Theme, accent, preferences</div>
          </div>
        </Link>
      </div>

      {isAdmin && (
        <Card>
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                <Shield className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <div className="font-medium text-sm">Admin</div>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Questions, import, users
                </p>
              </div>
            </div>
            <Link to="/admin">
              <Button size="sm" className="w-full">
                Open admin panel
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
              <RotateCcw className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm">Reset progress</div>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Clears history, stats, streaks, bookmarks, and achievements. Account stays.
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
          <Button
            variant="danger"
            className="w-full"
            disabled={resetting}
            onClick={handleResetProgress}
          >
            {resetting ? 'Resetting…' : 'Reset my progress'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
