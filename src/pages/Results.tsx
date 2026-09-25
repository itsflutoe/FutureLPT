import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAttempt, getAttemptAnswers } from '@/services/exams';
import type { ExamAttempt, ExamAnswer, Question } from '@/types';
import { formatPercent } from '@/lib/utils';
import { DAILY_CHALLENGE_RESULT_VIDEO_URL } from '@/config/media';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import { Play } from 'lucide-react';

export default function Results() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<(ExamAnswer & { question: Question })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'flagged'>('all');
  /** Blocks rest of results until Daily video finishes */
  const [videoGate, setVideoGate] = useState(false);
  const [needsTap, setNeedsTap] = useState(true);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      try {
        const [att, ans] = await Promise.all([getAttempt(attemptId), getAttemptAnswers(attemptId)]);
        setAttempt(att);
        setAnswers(ans);
        const daily = !!att.is_daily_challenge && !!DAILY_CHALLENGE_RESULT_VIDEO_URL;
        setVideoGate(daily);
        setNeedsTap(daily);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId]);

  const startVideoWithSound = async () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    el.volume = 1;
    try {
      await el.play();
      setNeedsTap(false);
      setPlaying(true);
    } catch {
      // Last resort: muted play (still unskippable)
      el.muted = true;
      try {
        await el.play();
        setNeedsTap(false);
        setPlaying(true);
      } catch (e) {
        console.error(e);
      }
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

  const filtered = answers.filter((a) => {
    if (filter === 'correct') return a.is_correct === true;
    if (filter === 'incorrect') return a.is_correct === false;
    if (filter === 'flagged') return a.is_flagged;
    return true;
  });

  const weakTopic = weak[0];
  const isDaily = !!attempt.is_daily_challenge;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8 space-y-6 pb-28 sm:pb-8 relative">
      {/* Unskippable Daily Challenge video gate */}
      {isDaily && videoGate && DAILY_CHALLENGE_RESULT_VIDEO_URL && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-4">
          <p className="text-white text-sm mb-2 opacity-80">Daily Challenge complete</p>
          <div className="text-white text-4xl font-bold mb-4 tabular-nums">
            {attempt.correct_count}/{attempt.total_questions}{' '}
            <span className="text-2xl font-semibold opacity-90">
              ({formatPercent(Number(attempt.score_percent))})
            </span>
          </div>
          <div className="relative w-full max-w-lg rounded-xl overflow-hidden bg-black shadow-2xl">
            <video
              ref={videoRef}
              src={DAILY_CHALLENGE_RESULT_VIDEO_URL}
              className="w-full max-h-[55vh] object-contain"
              playsInline
              preload="auto"
              controls={false}
              onEnded={() => {
                setVideoGate(false);
                setPlaying(false);
              }}
            />
            {needsTap && (
              <button
                type="button"
                onClick={startVideoWithSound}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white gap-3"
              >
                <span className="h-16 w-16 rounded-full bg-[var(--accent-color)] flex items-center justify-center shadow-lg">
                  <Play className="h-8 w-8 fill-white text-white ml-1" />
                </span>
                <span className="text-sm font-medium">Tap to play</span>
              </button>
            )}
          </div>
          <p className="text-white/60 text-xs mt-4 text-center max-w-sm">
            {playing
              ? 'Watch until the end to continue…'
              : 'Sound on — browsers require a tap before audio can play.'}
          </p>
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-[var(--muted-foreground)] mb-1">
          {isDaily
            ? 'Daily Challenge'
            : attempt.mode === 'mock'
              ? 'Mock exam'
              : 'Practice'}
        </p>
        <h1 className="text-2xl font-bold">Your Result</h1>
        <div className="mt-4 text-5xl font-bold text-[var(--accent-color)]">
          {attempt.correct_count} / {attempt.total_questions}
        </div>
        <div className="text-3xl font-semibold mt-1">
          {formatPercent(Number(attempt.score_percent))}
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm text-[var(--muted-foreground)]">
          <span>Correct: {attempt.correct_count}</span>
          <span>Incorrect: {attempt.total_questions - attempt.correct_count}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance by subject</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sorted.map(([name, v]) => (
            <div key={name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="truncate pr-2">{name}</span>
                <span className="shrink-0">{formatPercent((v.correct / v.total) * 100)}</span>
              </div>
              <ProgressBar value={(v.correct / v.total) * 100} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Strongest</CardTitle>
          </CardHeader>
          <CardContent>
            {strongest.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">Keep practicing!</p>
            ) : (
              <ul className="space-y-1">
                {strongest.map((s) => (
                  <li key={s} className="text-sm">
                    • {s}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs improvement</CardTitle>
          </CardHeader>
          <CardContent>
            {weak.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">Great work across the board.</p>
            ) : (
              <ul className="space-y-1">
                {weak.map((s) => (
                  <li key={s} className="text-sm">
                    • {s}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto max-w-3xl flex flex-col sm:flex-row gap-2 sm:justify-center">
          <Button className="w-full sm:w-auto min-h-11" onClick={() => navigate('/practice')}>
            Practice again
          </Button>
          {weakTopic && (
            <Button
              variant="outline"
              className="w-full sm:w-auto min-h-11"
              onClick={() => navigate(`/practice?subject=${encodeURIComponent(weakTopic)}`)}
            >
              Focus: {weakTopic.length > 18 ? weakTopic.slice(0, 18) + '…' : weakTopic}
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

      <div>
        <h2 className="text-lg font-semibold mb-3">Review answers</h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['all', 'correct', 'incorrect', 'flagged'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize border min-h-9 ${
                filter === f
                  ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10'
                  : 'border-[var(--border)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {filtered.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant={a.is_correct ? 'success' : 'error'}>
                    {a.is_correct ? 'Correct' : 'Incorrect'}
                  </Badge>
                  <span className="text-xs text-[var(--muted-foreground)]">{a.question?.subject}</span>
                </div>
                <p className="text-sm font-medium mb-2">{a.question?.question}</p>
                <p className="text-sm">
                  Your answer: <strong>{a.selected_answer || '—'}</strong> · Correct:{' '}
                  <strong>{a.correct_answer}</strong>
                </p>
                {a.question?.explanation && (
                  <p className="text-sm text-[var(--muted-foreground)] mt-2">{a.question.explanation}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
