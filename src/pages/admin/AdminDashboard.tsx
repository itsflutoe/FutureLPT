import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getQuestionBankStats, categoryLabel } from '@/services/questionStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ProgressBar } from '@/components/ui/ProgressBar';

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ questions: 0, users: 0, attempts: 0 });
  const [byCategory, setByCategory] = useState<{ category: string; count: number }[]>([]);
  const [byDifficulty, setByDifficulty] = useState<{ difficulty: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [q, u, a, stats] = await Promise.all([
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('exam_attempts').select('id', { count: 'exact', head: true }),
        getQuestionBankStats().catch(() => null),
      ]);
      setCounts({ questions: q.count || 0, users: u.count || 0, attempts: a.count || 0 });
      if (stats) {
        setByCategory(stats.by_category);
        setByDifficulty(stats.by_difficulty);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  const total = counts.questions || byCategory.reduce((s, c) => s + c.count, 0);
  const diff = (name: string) => byDifficulty.find((d) => d.difficulty === name)?.count || 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--muted-foreground)]">Questions</div>
            <div className="text-2xl font-bold">{counts.questions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--muted-foreground)]">Users</div>
            <div className="text-2xl font-bold">{counts.users}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--muted-foreground)]">Attempts</div>
            <div className="text-2xl font-bold">{counts.attempts}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Question bank overview</CardTitle>
          <Link to="/admin/stats" className="text-sm text-[var(--accent-color)] hover:underline">
            Full statistics
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="text-xs text-[var(--muted-foreground)]">Easy</div>
              <div className="text-xl font-bold">{diff('EASY')}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="text-xs text-[var(--muted-foreground)]">Moderate</div>
              <div className="text-xl font-bold">{diff('MODERATE')}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="text-xs text-[var(--muted-foreground)]">Difficult</div>
              <div className="text-xl font-bold">{diff('DIFFICULT')}</div>
            </div>
          </div>
          {byCategory.map((c) => (
            <div key={c.category}>
              <div className="flex justify-between text-sm mb-1">
                <span>{categoryLabel(c.category)}</span>
                <span className="font-semibold">{c.count}</span>
              </div>
              <ProgressBar value={total ? (c.count / total) * 100 : 0} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link to="/admin/stats">
          <Button>Question Bank Statistics</Button>
        </Link>
        <Link to="/admin/questions">
          <Button variant="outline">Manage Questions</Button>
        </Link>
        <Link to="/admin/import">
          <Button variant="outline">CSV Import</Button>
        </Link>
        <Link to="/admin/users">
          <Button variant="outline">Users</Button>
        </Link>
      </div>
    </div>
  );
}
