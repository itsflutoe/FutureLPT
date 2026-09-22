import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getOverallStats, getRecommendations, getSubjectPerformance } from '@/services/progress';
import { getUserHistory, hasCompletedDailyChallengeToday } from '@/services/exams';
import { getGreeting, formatPercent } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import {
  Flame,
  Target,
  BookOpen,
  ClipboardList,
  ArrowRight,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import type { ExamAttempt, UserTopicStat } from '@/types';
import { DAILY_CHALLENGE_COUNT } from '@/types';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    questionsAnswered: 0,
    correctAnswers: 0,
    accuracy: 0,
    mockExamsCompleted: 0,
    practiceSessions: 0,
  });
  const [recs, setRecs] = useState<UserTopicStat[]>([]);
  const [subjects, setSubjects] = useState<
    Record<string, { category: string; accuracy: number; total: number }>
  >({});
  const [history, setHistory] = useState<ExamAttempt[]>([]);
  const [dailyDone, setDailyDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [s, r, sub, h, daily] = await Promise.all([
          getOverallStats(user.id),
          getRecommendations(user.id),
          getSubjectPerformance(user.id),
          getUserHistory(user.id, 3),
          hasCompletedDailyChallengeToday(user.id),
        ]);
        setStats(s);
        setRecs(r.slice(0, 3));
        setSubjects(sub);
        setHistory(h);
        setDailyDone(daily);
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 space-y-6">
      {/* Compact greeting + streak */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {getGreeting()}, {name}.
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Ready to practice?</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 shrink-0">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold">{profile?.current_streak || 0}</span>
          <span className="text-xs text-[var(--muted-foreground)]">day streak</span>
        </div>
      </div>

      {/* Primary CTAs — above the fold on mobile */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button className="w-full min-h-12 text-base" size="lg" onClick={() => navigate('/practice')}>
          Start practicing
        </Button>
        <Card className="sm:order-none">
          <CardContent className="p-4 flex flex-col justify-between gap-3 h-full">
            <div>
              <div className="flex items-center gap-2 font-medium text-sm">
                <Zap className="h-4 w-4 text-[var(--accent-color)]" />
                Daily LET Challenge
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {DAILY_CHALLENGE_COUNT} mixed questions · practice mode
              </p>
            </div>
            {dailyDone ? (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-3 py-2 text-xs flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Done for today
              </div>
            ) : (
              <Button className="w-full" size="sm" onClick={() => navigate('/practice?daily=1')}>
                Start Challenge
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3 key stats only on mobile */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-0.5">Accuracy</div>
            <div className="text-lg sm:text-2xl font-bold">{formatPercent(stats.accuracy)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-0.5">Answered</div>
            <div className="text-lg sm:text-2xl font-bold">{stats.questionsAnswered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)] mb-0.5">Mocks</div>
            <div className="text-lg sm:text-2xl font-bold">{stats.mockExamsCompleted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations — top 3 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-[var(--accent-color)]" />
            Recommended for you
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recs.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] py-2">
              Complete a few sessions to unlock personalized recommendations.
            </p>
          ) : (
            recs.map((r) => (
              <div
                key={`${r.subject}-${r.topic}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] p-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{r.topic}</div>
                  <div className="text-xs text-[var(--muted-foreground)] truncate">{r.subject}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-sm font-semibold ${
                      r.accuracy < 60
                        ? 'text-red-600'
                        : r.accuracy < 75
                          ? 'text-amber-600'
                          : 'text-green-600'
                    }`}
                  >
                    {formatPercent(r.accuracy)}
                  </span>
                  <Link
                    to={`/practice?category=${r.category}&subject=${encodeURIComponent(r.subject)}&topic=${encodeURIComponent(r.topic)}`}
                  >
                    <Button size="sm" variant="outline">
                      Practice
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recent — 3 items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Recent</CardTitle>
          <Link
            to="/history"
            className="text-sm text-[var(--accent-color)] hover:underline flex items-center gap-1"
          >
            All <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <Link
                  key={h.id}
                  to={`/history/${h.id}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--muted)]/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {h.mode === 'mock' ? (
                      <ClipboardList className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {h.is_daily_challenge
                          ? 'Daily Challenge'
                          : h.subject || h.category || 'Mixed'}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {h.total_questions} Q · {h.mode}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      h.score_percent >= 75 ? 'success' : h.score_percent >= 50 ? 'warning' : 'error'
                    }
                  >
                    {formatPercent(Number(h.score_percent))}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject performance — collapsible on mobile via shorter lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">General Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {genEd.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No data yet.</p>
            ) : (
              genEd.slice(0, 5).map(([name, v]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate pr-2">{name}</span>
                    <span className="font-medium shrink-0">{formatPercent(v.accuracy)}</span>
                  </div>
                  <ProgressBar value={v.accuracy} />
                </div>
              ))
            )}
            {genEd.length > 0 && (
              <Link to="/progress" className="text-xs text-[var(--accent-color)] hover:underline">
                Full progress →
              </Link>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Professional Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profEd.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No data yet.</p>
            ) : (
              profEd.slice(0, 5).map(([name, v]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate pr-2">{name}</span>
                    <span className="font-medium shrink-0">{formatPercent(v.accuracy)}</span>
                  </div>
                  <ProgressBar value={v.accuracy} />
                </div>
              ))
            )}
            {profEd.length > 0 && (
              <Link to="/progress" className="text-xs text-[var(--accent-color)] hover:underline">
                Full progress →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-center text-[var(--muted-foreground)] pt-2">
        LET-style practice material. FLPT is not affiliated with PRC or CHED.
      </p>
    </div>
  );
}
