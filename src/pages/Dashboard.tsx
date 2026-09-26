import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getOverallStats, getRecommendations, getSubjectPerformance } from '@/services/progress';
import { getUserHistory, hasCompletedDailyChallengeToday } from '@/services/exams';
import { getLatestAnnouncement, type Announcement } from '@/services/announcements';
import { getGreeting, formatPercent, formatSessionTitle, formatMode } from '@/lib/utils';
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
  Megaphone,
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
  const [latestPost, setLatestPost] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [s, r, sub, h, daily, ann] = await Promise.all([
          getOverallStats(user.id),
          getRecommendations(user.id),
          getSubjectPerformance(user.id),
          getUserHistory(user.id, 3),
          hasCompletedDailyChallengeToday(user.id),
          getLatestAnnouncement().catch(() => null),
        ]);
        setStats(s);
        setRecs(r.slice(0, 3));
        setSubjects(sub);
        setHistory(h);
        setDailyDone(daily);
        setLatestPost(ann);
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
  const genEd = Object.entries(subjects)
    .filter(([, v]) => v.category === 'GENERAL_EDUCATION')
    .slice(0, 4);
  const profEd = Object.entries(subjects)
    .filter(([, v]) => v.category === 'PROFESSIONAL_EDUCATION')
    .slice(0, 4);
  const major = Object.entries(subjects)
    .filter(([, v]) => v.category === 'SPECIALIZATION')
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            {getGreeting()}, {name}.
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">What do you want to work on?</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 shrink-0">
          <Flame className="h-4 w-4 text-orange-500" aria-hidden />
          <span className="text-sm font-semibold tabular-nums">{profile?.current_streak || 0}</span>
          <span className="text-xs text-[var(--muted-foreground)]">streak</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          className="w-full min-h-12 text-base"
          size="lg"
          onClick={() => navigate('/practice')}
        >
          Start practicing
        </Button>
        <Button
          variant="outline"
          className="w-full min-h-12 text-base"
          size="lg"
          onClick={() => navigate('/mock-exams')}
        >
          Take a mock exam
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Zap className="h-4 w-4 text-[var(--accent-color)] shrink-0" aria-hidden />
              Daily LET Challenge
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {DAILY_CHALLENGE_COUNT} mixed questions · builds your streak
            </p>
          </div>
          {dailyDone ? (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-3 py-2 text-xs flex items-center gap-2 text-green-700 dark:text-green-300 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Done for today
            </div>
          ) : (
            <Button className="w-full sm:w-auto shrink-0" onClick={() => navigate('/practice?daily=1')}>
              Start challenge
            </Button>
          )}
        </CardContent>
      </Card>

      {latestPost && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Megaphone className="h-4 w-4 text-[var(--accent-color)] shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[var(--muted-foreground)] mb-0.5">Announcement</div>
                <div className="font-medium text-sm">{latestPost.title}</div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">
                  {latestPost.body}
                </p>
                <Link
                  to="/announcements"
                  className="text-xs text-[var(--accent-color)] hover:underline mt-2 inline-block"
                >
                  View all →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">Accuracy</div>
            <div className="text-lg sm:text-2xl font-bold tabular-nums">{formatPercent(stats.accuracy)}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">Answered</div>
            <div className="text-lg sm:text-2xl font-bold tabular-nums">{stats.questionsAnswered}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">Mocks</div>
            <div className="text-lg sm:text-2xl font-bold tabular-nums">{stats.mockExamsCompleted}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-[var(--accent-color)]" aria-hidden />
            Focus next
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recs.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] py-1">
              Complete a few sessions to unlock weak-topic recommendations.
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
                    className={`text-sm font-semibold tabular-nums ${
                      r.accuracy < 60
                        ? 'text-red-600 dark:text-red-400'
                        : r.accuracy < 75
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-green-600 dark:text-green-400'
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Recent</CardTitle>
          <Link
            to="/history"
            className="text-sm text-[var(--accent-color)] hover:underline flex items-center gap-1"
          >
            All <ArrowRight className="h-3 w-3" aria-hidden />
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
                  to={`/results/${h.id}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--muted)]/50 transition-colors min-w-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {h.mode === 'mock' ? (
                      <ClipboardList className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" aria-hidden />
                    ) : (
                      <BookOpen className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" aria-hidden />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{formatSessionTitle(h)}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {h.total_questions} Q · {formatMode(h.mode)}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      Number(h.score_percent) >= 75
                        ? 'success'
                        : Number(h.score_percent) >= 50
                          ? 'warning'
                          : 'error'
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">General Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {genEd.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No data yet.</p>
            ) : (
              genEd.map(([subjName, v]) => (
                <div key={subjName} className="min-w-0">
                  <div className="flex justify-between text-sm mb-1 gap-2">
                    <span className="truncate">{subjName}</span>
                    <span className="font-medium shrink-0 tabular-nums">{formatPercent(v.accuracy)}</span>
                  </div>
                  <ProgressBar value={v.accuracy} />
                </div>
              ))
            )}
            <Link to="/progress" className="text-xs text-[var(--accent-color)] hover:underline">
              Full progress →
            </Link>
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
              profEd.map(([subjName, v]) => (
                <div key={subjName} className="min-w-0">
                  <div className="flex justify-between text-sm mb-1 gap-2">
                    <span className="truncate">{subjName}</span>
                    <span className="font-medium shrink-0 tabular-nums">{formatPercent(v.accuracy)}</span>
                  </div>
                  <ProgressBar value={v.accuracy} />
                </div>
              ))
            )}
            <Link to="/progress" className="text-xs text-[var(--accent-color)] hover:underline">
              Full progress →
            </Link>
          </CardContent>
        </Card>
        {major.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Specialization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {major.map(([subjName, v]) => (
                <div key={subjName} className="min-w-0">
                  <div className="flex justify-between text-sm mb-1 gap-2">
                    <span className="truncate">{subjName}</span>
                    <span className="font-medium shrink-0 tabular-nums">{formatPercent(v.accuracy)}</span>
                  </div>
                  <ProgressBar value={v.accuracy} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-xs text-center text-[var(--muted-foreground)] pt-2">
        LET-style practice. FLPT is not affiliated with PRC or CHED.
      </p>
    </div>
  );
}
