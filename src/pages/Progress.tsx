import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getOverallStats, getTopicStats, getSubjectPerformance } from '@/services/progress';
import { formatPercent } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import type { UserTopicStat } from '@/types';
import {
  History,
  Bookmark,
  AlertCircle,
  Trophy,
  FolderOpen,
  ChevronRight,
} from 'lucide-react';

const reviewLinks = [
  { to: '/history', label: 'History', desc: 'Past practice & mocks', icon: History },
  { to: '/mistakes', label: 'Mistakes', desc: 'Review wrong answers', icon: AlertCircle },
  { to: '/bookmarks', label: 'Bookmarks', desc: 'Saved questions', icon: Bookmark },
  { to: '/achievements', label: 'Achievements', desc: 'Badges & milestones', icon: Trophy },
  { to: '/topics', label: 'Topics', desc: 'Browse by topic', icon: FolderOpen },
];

export default function Progress() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    questionsAnswered: 0,
    accuracy: 0,
    mockExamsCompleted: 0,
    practiceSessions: 0,
  });
  const [topics, setTopics] = useState<UserTopicStat[]>([]);
  const [subjects, setSubjects] = useState<
    Record<string, { category: string; accuracy: number; total: number }>
  >({});
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

  if (loading)
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-4xl px-3 sm:px-4 py-6 sm:py-8 space-y-6 overflow-x-clip">
      <h1 className="text-2xl font-bold">Progress</h1>

      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-2 uppercase tracking-wide">
          Review
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {reviewLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 hover:bg-[var(--muted)]/40 transition-colors min-w-0"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--muted)] shrink-0">
                <item.icon className="h-5 w-5 text-[var(--accent-color)]" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="font-medium text-sm truncate">{item.label}</div>
                <div className="text-xs text-[var(--muted-foreground)] truncate">{item.desc}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-[var(--muted-foreground)]">Accuracy</div>
            <div className="text-xl sm:text-2xl font-bold tabular-nums">{formatPercent(stats.accuracy)}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-[var(--muted-foreground)]">Answered</div>
            <div className="text-xl sm:text-2xl font-bold tabular-nums">{stats.questionsAnswered}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-[var(--muted-foreground)]">Mocks</div>
            <div className="text-xl sm:text-2xl font-bold tabular-nums">{stats.mockExamsCompleted}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-[var(--muted-foreground)]">Streak</div>
            <div className="text-xl sm:text-2xl font-bold tabular-nums">{profile?.current_streak || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">By Subject</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(subjects).length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No data yet.</p>
          ) : (
            Object.entries(subjects).map(([name, v]) => (
              <div key={name} className="min-w-0">
                <div className="flex justify-between gap-2 text-sm mb-1">
                  <span className="truncate min-w-0">{name}</span>
                  <span className="shrink-0 tabular-nums text-[var(--muted-foreground)]">
                    {formatPercent(v.accuracy)} · {v.total} Q
                  </span>
                </div>
                <ProgressBar value={v.accuracy} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">By Topic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topics.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No topic data yet.</p>
          ) : (
            /* Mobile-first stacked rows — no wide table */
            topics.map((t) => (
              <div
                key={`${t.subject}-${t.topic}`}
                className="rounded-xl border border-[var(--border)] p-3 min-w-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm break-words">{t.topic}</div>
                    <div className="text-xs text-[var(--muted-foreground)] truncate">{t.subject}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tabular-nums">
                      {formatPercent(Number(t.accuracy))}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">{t.attempts} tries</div>
                  </div>
                </div>
                <div className="mt-2">
                  <ProgressBar value={Number(t.accuracy)} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
