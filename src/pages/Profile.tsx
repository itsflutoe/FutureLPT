import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getOverallStats } from '@/services/progress';
import { getUserAchievements } from '@/services/achievements';
import { formatPercent } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { User } from 'lucide-react';

export default function Profile() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState({ questionsAnswered: 0, accuracy: 0, mockExamsCompleted: 0 });
  const [achCount, setAchCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getOverallStats(user.id), getUserAchievements(user.id)])
      .then(([s, a]) => {
        setStats(s);
        setAchCount(a.length);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex justify-center py-32"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-color)]/15 text-[var(--accent-color)]">
          <User className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile?.display_name}</h1>
          <p className="text-[var(--muted-foreground)]">@{profile?.username}</p>
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
        <Card><CardContent className="p-4"><div className="text-xs text-[var(--muted-foreground)]">Answered</div><div className="text-xl font-bold">{stats.questionsAnswered}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-[var(--muted-foreground)]">Accuracy</div><div className="text-xl font-bold">{formatPercent(stats.accuracy)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-[var(--muted-foreground)]">Mocks</div><div className="text-xl font-bold">{stats.mockExamsCompleted}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-[var(--muted-foreground)]">Streak</div><div className="text-xl font-bold">{profile?.current_streak || 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-[var(--muted-foreground)]">Best Streak</div><div className="text-xl font-bold">{profile?.best_streak || 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-[var(--muted-foreground)]">Achievements</div><div className="text-xl font-bold">{achCount}</div></CardContent></Card>
      </div>
    </div>
  );
}
