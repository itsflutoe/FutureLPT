import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getMistakes } from '@/services/progress';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

export default function Mistakes() {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getMistakes(user.id).then(setItems).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold mb-1">Mistakes</h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        Items you have missed — review the correct answer, then practice the topic.
      </p>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm text-[var(--muted-foreground)]">No recorded mistakes yet.</p>
            <Link to="/practice">
              <Button className="w-full sm:w-auto">Start practicing</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
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
                {m.question?.subject && (
                  <Link
                    to={`/practice?subject=${encodeURIComponent(m.question.subject)}${
                      m.question.category ? `&category=${m.question.category}` : ''
                    }`}
                    className="inline-block pt-1"
                  >
                    <Button size="sm" variant="outline">
                      Practice this subject
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
          <Link to="/practice" className="block pt-2">
            <Button className="w-full">Back to practice</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
