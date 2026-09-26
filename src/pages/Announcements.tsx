import { useEffect, useState } from 'react';
import { getPublishedAnnouncements, type Announcement } from '@/services/announcements';
import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { format } from 'date-fns';

export default function Announcements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPublishedAnnouncements()
      .then(setItems)
      .catch((e) => {
        console.error(e);
        setError('Could not load announcements.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold mb-1">Announcements</h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        Tips and updates from FLPT admin
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">No announcements yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs text-[var(--muted-foreground)]">
                  {format(new Date(a.created_at), 'MMM d, yyyy')}
                </p>
                <h2 className="font-semibold text-sm">{a.title}</h2>
                <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap leading-relaxed">
                  {a.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
