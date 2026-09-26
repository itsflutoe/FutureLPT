import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getMistakes, getMistakeQuestionIds } from '@/services/progress';
import { startPracticeFromQuestionIds } from '@/services/exams';
import { MISTAKES_SESSION_SIZE } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

export default function Mistakes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!user) return;
    setLoading(true);
    getMistakes(user.id)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const remaining = items.length;
  const sessionSize = Math.min(MISTAKES_SESSION_SIZE, remaining);

  const handlePracticeMistakes = async () => {
    if (!user || remaining === 0 || starting) return;
    setError('');
    setStarting(true);
    try {
      const ids = await getMistakeQuestionIds(user.id);
      const { attempt, questions } = await startPracticeFromQuestionIds(
        user.id,
        ids,
        MISTAKES_SESSION_SIZE
      );
      sessionStorage.setItem(`exam_${attempt.id}`, JSON.stringify(questions));
      navigate(`/exam/${attempt.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start practice.');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-8 pb-28">
      <h1 className="text-2xl font-bold mb-1">Mistakes</h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-4">
        Items still in your queue until they reach strong/mastered. Practice up to{' '}
        {MISTAKES_SESSION_SIZE} at a time.
      </p>

      {remaining === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              No mistakes to practice — nice.
            </p>
            <Link to="/practice">
              <Button className="w-full sm:w-auto">Start practicing</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm">
                <span className="font-semibold tabular-nums">{remaining}</span> left
                {remaining > MISTAKES_SESSION_SIZE
                  ? ` · Practice ${sessionSize}`
                  : ` · Practice all ${sessionSize}`}
              </p>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <Button
                className="w-full min-h-12"
                disabled={starting}
                onClick={handlePracticeMistakes}
              >
                {starting ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Starting…
                  </span>
                ) : (
                  `Practice mistakes (${sessionSize})`
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {items.map((m) => (
              <Card key={m.question_id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{m.question?.subject}</Badge>
                    {m.question?.topic && <Badge variant="outline">{m.question.topic}</Badge>}
                    <Badge variant="error">
                      {m.correct_count}/{m.attempts} correct
                    </Badge>
                    {m.mastery_status && (
                      <Badge variant="outline">{String(m.mastery_status)}</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{m.question?.question}</p>
                  {m.question?.correct_answer && (
                    <p className="text-sm">
                      Correct:{' '}
                      <strong className="text-green-700 dark:text-green-400">
                        {m.question.correct_answer}
                      </strong>
                    </p>
                  )}
                  {m.question?.explanation && (
                    <p className="text-sm text-[var(--muted-foreground)] leading-relaxed border-t border-[var(--border)] pt-2">
                      {m.question.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
