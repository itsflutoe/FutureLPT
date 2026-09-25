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
import { Volume2, VolumeX, X } from 'lucide-react';

export default function Results() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<(ExamAnswer & { question: Question })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'flagged'>('all');
  const [showVideo, setShowVideo] = useState(true);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      try {
        const [att, ans] = await Promise.all([getAttempt(attemptId), getAttemptAnswers(attemptId)]);
        setAttempt(att);
        setAnswers(ans);
        setShowVideo(!!att.is_daily_challenge && !!DAILY_CHALLENGE_RESULT_VIDEO_URL);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !showVideo) return;
    el.muted = muted;
    // Best-effort autoplay (browsers require muted)
    const p = el.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }, [showVideo, attempt?.id]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

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
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8 space-y-6 pb-28 sm:pb-8">
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

      {/* Daily Challenge only — muted autoplay + skip */}
      {isDaily && showVideo && DAILY_CHALLENGE_RESULT_VIDEO_URL && (
        <Card className="overflow-hidden">
          <CardContent className="p-0 relative">
            <video
              ref={videoRef}
              src={DAILY_CHALLENGE_RESULT_VIDEO_URL}
              className="w-full max-h-[280px] sm:max-h-[360px] bg-black object-contain"
              autoPlay
              muted={muted}
              playsInline
              preload="auto"
              controls={false}
              onEnded={() => setShowVideo(false)}
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="rounded-full bg-black/60 text-white p-2 hover:bg-black/80"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  videoRef.current?.pause();
                  setShowVideo(false);
                }}
                className="rounded-full bg-black/60 text-white p-2 hover:bg-black/80"
                aria-label="Skip video"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-3 py-2 flex items-center justify-between gap-2 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)]">Daily Challenge</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  videoRef.current?.pause();
                  setShowVideo(false);
                }}
              >
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
          <Button variant="ghost" className="w-full sm:w-auto min-h-11" onClick={() => navigate('/dashboard')}>
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
