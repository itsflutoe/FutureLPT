import { useEffect, useState } from 'react';
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

  if (loading) return <div className="flex justify-center py-32"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Bookmarks</h1>
      <p className="text-[var(--muted-foreground)] mb-6">Questions you saved for later review.</p>
      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-[var(--muted-foreground)]">
            Save questions here when you want to review them later.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4">
                <div className="flex gap-2 mb-2">
                  <Badge variant="outline">{b.question?.subject}</Badge>
                  <Badge variant="outline">{b.question?.difficulty?.toLowerCase()}</Badge>
                </div>
                <p className="text-sm mb-2">{b.question?.question}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {format(new Date(b.created_at), 'MMM d, yyyy')}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => handleRemove(b.question_id)}>Remove</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
