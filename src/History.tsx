import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getUserHistory } from '@/services/exams';
import type { ExamAttempt } from '@/types';
import { formatPercent } from '@/lib/utils';
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

  if (loading) return <div className="flex justify-center py-32"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">History</h1>
      {history.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-[var(--muted-foreground)] mb-4">You haven't completed a session yet.</p>
            <Link to="/practice"><Button>Take Your First Exam</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <Link key={h.id} to={`/results/${h.id}`}>
              <Card className="hover:bg-[var(--muted)]/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{h.subject || h.category || 'Mixed'}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {h.total_questions} questions · {h.mode} · {h.completed_at ? format(new Date(h.completed_at), 'MMM d, yyyy') : ''}
                    </div>
                  </div>
                  <Badge variant={Number(h.score_percent) >= 75 ? 'success' : Number(h.score_percent) >= 50 ? 'warning' : 'error'}>
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
