import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getBookmarks, removeBookmark } from '@/services/bookmarks';
import type { Bookmark, Question } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { format } from 'date-fns';

export default function Bookmarks() {
  const { user } = useAuth();
  const [items, setItems] = useState<(Bookmark & { question: Question })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user) return;
    getBookmarks(user.id).then(setItems).finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  const handleRemove = async (qid: string) => {
    if (!user) return;
    await removeBookmark(user.id, qid);
    setItems((prev) => prev.filter((b) => b.question_id !== qid));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold mb-1">Bookmarks</h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        Saved during practice — review later or remove when done.
      </p>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              No bookmarks yet. Tap the bookmark icon while answering a question.
            </p>
            <Link to="/practice">
              <Button className="w-full sm:w-auto">Start practicing</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[var(--muted-foreground)]">{items.length} saved</p>
          {items.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{b.question?.subject}</Badge>
                  {b.question?.topic && <Badge variant="outline">{b.question.topic}</Badge>}
                  <Badge variant="outline">{b.question?.difficulty?.toLowerCase()}</Badge>
                </div>
                <p className="text-sm font-medium leading-relaxed">{b.question?.question}</p>
                {b.question?.correct_answer && (
                  <p className="text-sm">
                    Answer: <strong>{b.question.correct_answer}</strong>
                    {b.question.option_a && b.question.correct_answer === 'A'
                      ? ` — ${b.question.option_a}`
                      : ''}
                    {b.question.option_b && b.question.correct_answer === 'B'
                      ? ` — ${b.question.option_b}`
                      : ''}
                    {b.question.option_c && b.question.correct_answer === 'C'
                      ? ` — ${b.question.option_c}`
                      : ''}
                    {b.question.option_d && b.question.correct_answer === 'D'
                      ? ` — ${b.question.option_d}`
                      : ''}
                  </p>
                )}
                {b.question?.explanation && (
                  <p className="text-sm text-[var(--muted-foreground)] border-t border-[var(--border)] pt-2 leading-relaxed">
                    {b.question.explanation}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {format(new Date(b.created_at), 'MMM d, yyyy')}
                  </span>
                  <div className="flex gap-2">
                    {b.question?.subject && (
                      <Link
                        to={`/practice?subject=${encodeURIComponent(b.question.subject)}${
                          b.question.category ? `&category=${b.question.category}` : ''
                        }`}
                      >
                        <Button size="sm" variant="outline">
                          Practice
                        </Button>
                      </Link>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleRemove(b.question_id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
