import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getAttempt, getAttemptAnswers, startPracticeFromQuestionIds } from '@/services/exams';
import type { ExamAttempt, ExamAnswer, Question } from '@/types';
import { MISTAKES_SESSION_SIZE } from '@/types';
import { formatPercent } from '@/lib/utils';
import { DAILY_CHALLENGE_RESULT_VIDEO_URL } from '@/config/media';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';

type DailyPhase = 'score' | 'video' | 'done';

export default function Results() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<(ExamAnswer & { question: Question })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'flagged'>('incorrect');
  const [dailyPhase, setDailyPhase] = useState<DailyPhase>('done');
  const [videoError, setVideoError] = useState('');
  const [showSubjects, setShowSubjects] = useState(false);
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusError, setFocusError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      try {
        const [att, ans] = await Promise.all([getAttempt(attemptId), getAttemptAnswers(attemptId)]);
        setAttempt(att);
        setAnswers(ans);
        const wrong = ans.filter((a) => a.is_correct === false).length;
        setFilter(wrong > 0 ? 'incorrect' : 'all');
        if (att.is_daily_challenge && DAILY_CHALLENGE_RESULT_VIDEO_URL) {
          setDailyPhase('score');
        } else {
          setDailyPhase('done');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId]);

  const continueToVideo = async () => {
    setVideoError('');
    setDailyPhase('video');
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        const el = videoRef.current;
        if (!el) return;
        el.muted = false;
        el.volume = 1;
        try {
          await el.play();
        } catch (e) {
          console.error(e);
          setVideoError('Could not start with sound. Tap the video to try again.');
        }
      });
    });
  };

  const retryPlay = async () => {
    const el = videoRef.current;
    if (!el) return;
    setVideoError('');
    el.muted = false;
    el.volume = 1;
    try {
      await el.play();
    } catch (e) {
      console.error(e);
      setVideoError('Playback blocked. Check volume and try once more.');
    }
  };

  const handleFocusWeakArea = async () => {
    if (!user || focusLoading) return;
    const wrongIds = answers
      .filter((a) => a.is_correct === false)
      .map((a) => a.question_id)
      .filter(Boolean);
    if (wrongIds.length === 0) return;
    setFocusError('');
    setFocusLoading(true);
    try {
      const { attempt: att, questions } = await startPracticeFromQuestionIds(
        user.id,
        wrongIds,
        MISTAKES_SESSION_SIZE
      );
      sessionStorage.setItem(`exam_${att.id}`, JSON.stringify(questions));
      navigate(`/exam/${att.id}`);
    } catch (err: unknown) {
      setFocusError(err instanceof Error ? err.message : 'Could not start focus session.');
      setFocusLoading(false);
    }
  };

  if (loading || !attempt) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  const bySubject: Record<string, { correct: number; total: number }> = {};
  answers.forEach((a) => {
    const s = a.question?.subject || 'Unknown';
    if (!bySubject[s]) bySubject[s] = { correct: 0, total: 0 };
    bySubject[s].total++;
    if (a.is_correct) bySubject[s].correct++;
  });

  const sorted = Object.entries(bySubject).sort(
    (a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total
  );
  const strongest = sorted
    .filter(([, v]) => v.total > 0 && v.correct / v.total >= 0.75)
    .slice(0, 3)
    .map(([k]) => k);
  const weak = sorted
    .filter(([, v]) => v.total > 0 && v.correct / v.total < 0.7)
    .slice(0, 3)
    .map(([k]) => k);

  const incorrectCount = answers.filter((a) => a.is_correct === false).length;
  const correctCount = answers.filter((a) => a.is_correct === true).length;
  const flaggedCount = answers.filter((a) => a.is_flagged).length;

  const filtered = answers.filter((a) => {
    if (filter === 'correct') return a.is_correct === true;
    if (filter === 'incorrect') return a.is_correct === false;
    if (filter === 'flagged') return a.is_flagged;
    return true;
  });

  const isDaily = !!attempt.is_daily_challenge;
  const focusCount = Math.min(MISTAKES_SESSION_SIZE, incorrectCount);

  if (isDaily && dailyPhase === 'score') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--background)] px-6">
        <p className="text-sm text-[var(--muted-foreground)] mb-2">Daily LET Challenge</p>
        <h1 className="text-2xl font-bold mb-6">Your score</h1>
        <div className="text-6xl font-bold text-[var(--accent-color)] tabular-nums">
          {attempt.correct_count}
          <span className="text-3xl text-[var(--muted-foreground)]">/{attempt.total_questions}</span>
        </div>
        <div className="text-2xl font-semibold mt-2">
          {formatPercent(Number(attempt.score_percent))}
        </div>
        <p className="text-sm text-[var(--muted-foreground)] mt-8 mb-4 text-center max-w-xs">
          Continue to see your progress clip.
        </p>
        <Button size="lg" className="min-h-12 px-10 text-base" onClick={continueToVideo}>
          Continue
        </Button>
      </div>
    );
  }

  if (isDaily && dailyPhase === 'video' && DAILY_CHALLENGE_RESULT_VIDEO_URL) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-4">
        <p className="text-white/70 text-sm mb-3">Daily Challenge</p>
        <div className="w-full max-w-lg rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            src={DAILY_CHALLENGE_RESULT_VIDEO_URL}
            className="w-full max-h-[70vh] object-contain"
            playsInline
            preload="auto"
            controls={false}
            onClick={retryPlay}
            onEnded={() => setDailyPhase('done')}
          />
        </div>
        {videoError ? (
          <button type="button" onClick={retryPlay} className="mt-4 text-sm text-white underline">
            {videoError}
          </button>
        ) : (
          <p className="text-white/50 text-xs mt-4">Watch until the end…</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8 space-y-6 pb-28 sm:pb-8">
      <div className="text-center">
        <p className="text-sm text-[var(--muted-foreground)] mb-1">
          {isDaily
            ? 'Daily Challenge'
            : attempt.mode === 'mock'
              ? 'Mock exam'
              : 'Practice'}
        </p>
        <h1 className="text-2xl font-bold">Your result</h1>
        <div className="mt-4 text-5xl font-bold text-[var(--accent-color)] tabular-nums">
          {attempt.correct_count}/{attempt.total_questions}
        </div>
        <div className="text-2xl font-semibold mt-1">
          {formatPercent(Number(attempt.score_percent))}
        </div>
        {incorrectCount > 0 && (
          <p className="text-sm text-[var(--muted-foreground)] mt-3">
            {incorrectCount} to review below
          </p>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Review</h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          {(
            [
              { id: 'incorrect' as const, label: `Missed (${incorrectCount})` },
              { id: 'all' as const, label: `All (${answers.length})` },
              { id: 'correct' as const, label: `Correct (${correctCount})` },
              { id: 'flagged' as const, label: `Flagged (${flaggedCount})` },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-sm border min-h-9 ${
                filter === f.id
                  ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10'
                  : 'border-[var(--border)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4">
              {filter === 'incorrect' ? 'No missed questions — nice work.' : 'Nothing in this filter.'}
            </p>
          ) : (
            filtered.map((a, idx) => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-[var(--muted-foreground)]">#{idx + 1}</span>
                    <Badge variant={a.is_correct ? 'success' : 'error'}>
                      {a.is_correct ? 'Correct' : 'Incorrect'}
                    </Badge>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {a.question?.topic || a.question?.subject}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-2 leading-relaxed">{a.question?.question}</p>
                  <div className="text-sm space-y-1">
                    <p>
                      Your answer:{' '}
                      <strong className={a.is_correct ? '' : 'text-red-600 dark:text-red-400'}>
                        {a.selected_answer || '—'}
                      </strong>
                    </p>
                    {!a.is_correct && (
                      <p>
                        Correct:{' '}
                        <strong className="text-green-700 dark:text-green-400">{a.correct_answer}</strong>
                      </p>
                    )}
                  </div>
                  {a.question?.explanation && (
                    <p className="text-sm text-[var(--muted-foreground)] mt-3 leading-relaxed border-t border-[var(--border)] pt-3">
                      {a.question.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowSubjects((v) => !v)}
          className="text-sm font-medium text-[var(--accent-color)]"
        >
          {showSubjects ? 'Hide subject breakdown' : 'Show subject breakdown'}
        </button>
        {showSubjects && (
          <div className="mt-3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By subject</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sorted.map(([name, v]) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1 gap-2">
                      <span className="truncate">{name}</span>
                      <span className="shrink-0 tabular-nums">
                        {formatPercent((v.correct / v.total) * 100)}
                      </span>
                    </div>
                    <ProgressBar value={(v.correct / v.total) * 100} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Strongest</CardTitle>
                </CardHeader>
                <CardContent>
                  {strongest.length === 0 ? (
                    <p className="text-sm text-[var(--muted-foreground)]">Keep practicing.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {strongest.map((s) => (
                        <li key={s}>• {s}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Needs work</CardTitle>
                </CardHeader>
                <CardContent>
                  {weak.length === 0 ? (
                    <p className="text-sm text-[var(--muted-foreground)]">Balanced session.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {weak.map((s) => (
                        <li key={s}>• {s}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {focusError && (
        <p className="text-sm text-center text-red-600 dark:text-red-400">{focusError}</p>
      )}

      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto max-w-3xl flex flex-col sm:flex-row gap-2 sm:justify-center">
          <Button className="w-full sm:w-auto min-h-11" onClick={() => navigate('/practice')}>
            Practice again
          </Button>
          {incorrectCount > 0 && (
            <Button
              variant="outline"
              className="w-full sm:w-auto min-h-11"
              disabled={focusLoading}
              onClick={handleFocusWeakArea}
            >
              {focusLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Starting…
                </span>
              ) : (
                `Focus weak area (${focusCount})`
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full sm:w-auto min-h-11"
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
