import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getOverallStats, getRecommendations, getSubjectPerformance } from '@/services/progress';
import { getUserHistory } from '@/services/exams';
import { getGreeting, formatPercent } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Flame, Target, BookOpen, ClipboardList, ArrowRight } from 'lucide-react';
import type { ExamAttempt, UserTopicStat } from '@/types';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ questionsAnswered: 0, correctAnswers: 0, accuracy: 0, mockExamsCompleted: 0, practiceSessions: 0 });
  const [recs, setRecs] = useState<UserTopicStat[]>([]);
  const [subjects, setSubjects] = useState<Record<string, { category: string; accuracy: number; total: number }>>({});
  const [history, setHistory] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [s, r, sub, h] = await Promise.all([
          getOverallStats(user.id),
          getRecommendations(user.id),
          getSubjectPerformance(user.id),
          getUserHistory(user.id, 5),
        ]);
        setStats(s);
        setRecs(r);
        setSubjects(sub);
        setHistory(h);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner />
      </div>
    );
  }

  const name = profile?.display_name || 'Student';
  const genEd = Object.entries(subjects).filter(([, v]) => v.category === 'GENERAL_EDUCATION');
  const profEd = Object.entries(subjects).filter(([, v]) => v.category === 'PROFESSIONAL_EDUCATION');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {name}.
        </h1>
        <p className="text-[var(--muted-foreground)] mt-1">Ready for another round of LET-style practice?</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Accuracy</div>
            <div className="text-2xl font-bold">{formatPercent(stats.accuracy)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Answered</div>
            <div className="text-2xl font-bold">{stats.questionsAnswered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Correct</div>
            <div className="text-2xl font-bold">{stats.correctAnswers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Mock Exams</div>
            <div className="text-2xl font-bold">{stats.mockExamsCompleted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <div className="text-xs text-[var(--muted-foreground)]">Streak</div>
              <div className="text-2xl font-bold">{profile?.current_streak || 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recommendations */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[var(--accent-color)]" />
              Recommended for you
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recs.length === 0 ? (
              <div className="text-sm text-[var(--muted-foreground)] py-4">
                Complete some practice sessions to get personalized recommendations.
                <div className="mt-3">
                  <Link to="/practice">
                    <Button size="sm">Start practicing</Button>
                  </Link>
                </div>
              </div>
            ) : (
              recs.map((r) => (
                <div key={`${r.subject}-${r.topic}`} className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
                  <div>
                    <div className="font-medium text-sm">{r.topic}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{r.subject} · {r.attempts} attempts</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${r.accuracy < 60 ? 'text-red-600' : r.accuracy < 75 ? 'text-amber-600' : 'text-green-600'}`}>
                      {formatPercent(r.accuracy)}
                    </span>
                    <Link to={`/practice?category=${r.category}&subject=${encodeURIComponent(r.subject)}&topic=${encodeURIComponent(r.topic)}`}>
                      <Button size="sm" variant="outline">Practice</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Daily Challenge */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily LET Challenge</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">10 questions · Mixed topics</p>
            <p className="text-sm mb-4">
              Current streak: <strong>{profile?.current_streak || 0} days</strong>
            </p>
            <Link to="/practice?daily=1">
              <Button className="w-full">Start Challenge</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Subject performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {genEd.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No data yet. Practice GenEd topics to see performance.</p>
            ) : (
              genEd.map(([name, v]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{name}</span>
                    <span className="font-medium">{formatPercent(v.accuracy)}</span>
                  </div>
                  <ProgressBar value={v.accuracy} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Professional Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profEd.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No data yet. Practice ProfEd topics to see performance.</p>
            ) : (
              profEd.map(([name, v]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{name}</span>
                    <span className="font-medium">{formatPercent(v.accuracy)}</span>
                  </div>
                  <ProgressBar value={v.accuracy} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <Link to="/history" className="text-sm text-[var(--accent-color)] hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">You haven't completed any sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <Link
                  key={h.id}
                  to={`/history/${h.id}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--muted)]/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {h.mode === 'mock' ? <ClipboardList className="h-4 w-4 text-[var(--muted-foreground)]" /> : <BookOpen className="h-4 w-4 text-[var(--muted-foreground)]" />}
                    <div>
                      <div className="text-sm font-medium">{h.subject || h.category || 'Mixed'}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {h.total_questions} questions · {h.mode}
                      </div>
                    </div>
                  </div>
                  <Badge variant={h.score_percent >= 75 ? 'success' : h.score_percent >= 50 ? 'warning' : 'error'}>
                    {formatPercent(Number(h.score_percent))}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-center text-[var(--muted-foreground)] pt-4">
        LET-style practice material. FLPT is not affiliated with PRC or CHED.
      </p>
    </div>
  );
}
