import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getOverallStats, getTopicStats, getSubjectPerformance } from '@/services/progress';
import { formatPercent } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import type { UserTopicStat } from '@/types';

export default function Progress() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ questionsAnswered: 0, accuracy: 0, mockExamsCompleted: 0, practiceSessions: 0 });
  const [topics, setTopics] = useState<UserTopicStat[]>([]);
  const [subjects, setSubjects] = useState<Record<string, { category: string; accuracy: number; total: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getOverallStats(user.id), getTopicStats(user.id), getSubjectPerformance(user.id)])
      .then(([s, t, sub]) => {
        setStats(s);
        setTopics(t);
        setSubjects(sub);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex justify-center py-32"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Progress</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-[var(--muted-foreground)]">Accuracy</div><div className="text-2xl font-bold">{formatPercent(stats.accuracy)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-[var(--muted-foreground)]">Answered</div><div className="text-2xl font-bold">{stats.questionsAnswered}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-[var(--muted-foreground)]">Mocks</div><div className="text-2xl font-bold">{stats.mockExamsCompleted}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-[var(--muted-foreground)]">Streak</div><div className="text-2xl font-bold">{profile?.current_streak || 0}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">By Subject</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(subjects).length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No data yet.</p>
          ) : (
            Object.entries(subjects).map(([name, v]) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1"><span>{name}</span><span>{formatPercent(v.accuracy)} · {v.total} Q</span></div>
                <ProgressBar value={v.accuracy} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">By Topic</CardTitle></CardHeader>
        <CardContent>
          {topics.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No topic data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)]">
                    <th className="py-2 pr-4">Topic</th>
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4">Attempts</th>
                    <th className="py-2">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((t) => (
                    <tr key={`${t.subject}-${t.topic}`} className="border-b border-[var(--border)]">
                      <td className="py-2 pr-4">{t.topic}</td>
                      <td className="py-2 pr-4">{t.subject}</td>
                      <td className="py-2 pr-4">{t.attempts}</td>
                      <td className="py-2 font-medium">{formatPercent(Number(t.accuracy))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
