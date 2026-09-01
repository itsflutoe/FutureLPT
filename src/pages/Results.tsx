import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAttempt, getAttemptAnswers } from '@/services/exams';
import type { ExamAttempt, ExamAnswer, Question } from '@/types';
import { formatPercent } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';

export default function Results() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<(ExamAnswer & { question: Question })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'flagged'>('all');

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      try {
        const [att, ans] = await Promise.all([getAttempt(attemptId), getAttemptAnswers(attemptId)]);
        setAttempt(att);
        setAnswers(ans);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId]);

  if (loading || !attempt) {
    return <div className="flex justify-center py-32"><Spinner /></div>;
  }

  const bySubject: Record<string, { correct: number; total: number }> = {};
  answers.forEach((a) => {
    const s = a.question?.subject || 'Unknown';
    if (!bySubject[s]) bySubject[s] = { correct: 0, total: 0 };
    bySubject[s].total++;
    if (a.is_correct) bySubject[s].correct++;
  });

  const sorted = Object.entries(bySubject).sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total));
  const strongest = sorted.filter(([, v]) => v.total > 0 && v.correct / v.total >= 0.75).slice(0, 3).map(([k]) => k);
  const weak = sorted.filter(([, v]) => v.total > 0 && v.correct / v.total < 0.7).slice(0, 3).map(([k]) => k);

  const filtered = answers.filter((a) => {
    if (filter === 'correct') return a.is_correct === true;
    if (filter === 'incorrect') return a.is_correct === false;
    if (filter === 'flagged') return a.is_flagged;
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Your Result</h1>
        <div className="mt-4 text-5xl font-bold text-[var(--accent-color)]">
          {attempt.correct_count} / {attempt.total_questions}
        </div>
        <div className="text-3xl font-semibold mt-1">{formatPercent(Number(attempt.score_percent))}</div>
        <div className="flex justify-center gap-6 mt-4 text-sm text-[var(--muted-foreground)]">
          <span>Correct: {attempt.correct_count}</span>
          <span>Incorrect: {attempt.total_questions - attempt.correct_count}</span>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Performance by subject</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sorted.map(([name, v]) => (
            <div key={name}>
              <div className="flex justify-between text-sm mb-1">
                <span>{name}</span>
                <span>{formatPercent((v.correct / v.total) * 100)}</span>
              </div>
              <ProgressBar value={(v.correct / v.total) * 100} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Strongest Areas</CardTitle></CardHeader>
          <CardContent>
            {strongest.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">Keep practicing!</p> : (
              <ul className="space-y-1">{strongest.map((s) => <li key={s} className="text-sm">• {s}</li>)}</ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Needs Improvement</CardTitle></CardHeader>
          <CardContent>
            {weak.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">Great work across the board.</p> : (
              <ul className="space-y-1">{weak.map((s) => <li key={s} className="text-sm">• {s}</li>)}</ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Link to="/practice"><Button variant="outline">Practice Weak Areas</Button></Link>
        <Link to="/practice"><Button>Take Another Exam</Button></Link>
        <Link to="/dashboard"><Button variant="ghost">Dashboard</Button></Link>
      </div>

      {/* Review */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Review Answers</h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['all', 'correct', 'incorrect', 'flagged'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize border ${filter === f ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10' : 'border-[var(--border)]'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {filtered.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={a.is_correct ? 'success' : 'error'}>{a.is_correct ? 'Correct' : 'Incorrect'}</Badge>
                  <span className="text-xs text-[var(--muted-foreground)]">{a.question?.subject}</span>
                </div>
                <p className="text-sm font-medium mb-2">{a.question?.question}</p>
                <p className="text-sm">Your answer: <strong>{a.selected_answer || '—'}</strong> · Correct: <strong>{a.correct_answer}</strong></p>
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
