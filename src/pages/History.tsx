import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getUserHistory } from '@/services/exams';
import type { ExamAttempt } from '@/types';
import { formatPercent, formatSessionTitle, formatMode } from '@/lib/utils';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

export default function History() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserHistory(user.id, 50).then(setHistory).finally(() => setLoading(false));
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
      <h1 className="text-2xl font-bold mb-1">History</h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">Completed practice and mocks</p>

      {history.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm text-[var(--muted-foreground)]">No completed sessions yet.</p>
            <Link to="/practice">
              <Button className="w-full sm:w-auto">Start practicing</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {history.map((h) => (
            <Link key={h.id} to={`/results/${h.id}`} className="block">
              <Card className="hover:bg-[var(--muted)]/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{formatSessionTitle(h)}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {h.total_questions} Q · {formatMode(h.mode)}
                      {h.completed_at
                        ? ` · ${format(new Date(h.completed_at), 'MMM d, yyyy')}`
                        : ''}
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
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
