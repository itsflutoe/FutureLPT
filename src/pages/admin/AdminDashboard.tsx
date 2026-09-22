import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getQuestionBankStats, categoryLabel } from '@/services/questionStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  BarChart3,
  BookOpen,
  Upload,
  Users,
  ChevronRight,
} from 'lucide-react';

const adminLinks = [
  { to: '/admin/stats', label: 'Question Bank Statistics', desc: 'Counts by category & topic', icon: BarChart3 },
  { to: '/admin/questions', label: 'Manage Questions', desc: 'Search, edit, export, delete', icon: BookOpen },
  { to: '/admin/import', label: 'CSV Import', desc: 'Bulk upload questions', icon: Upload },
  { to: '/admin/users', label: 'Users', desc: 'Profiles & password reset', icon: Users },
];

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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">Questions</div>
            <div className="text-xl sm:text-2xl font-bold">{counts.questions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">Users</div>
            <div className="text-xl sm:text-2xl font-bold">{counts.users}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">Attempts</div>
            <div className="text-xl sm:text-2xl font-bold">{counts.attempts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile-friendly nav cards */}
      <div className="grid gap-2 sm:grid-cols-2">
        {adminLinks.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 hover:bg-[var(--muted)]/40 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--muted)] shrink-0">
              <item.icon className="h-5 w-5 text-[var(--accent-color)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">{item.label}</div>
              <div className="text-xs text-[var(--muted-foreground)]">{item.desc}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Question bank</CardTitle>
          <Link to="/admin/stats" className="text-sm text-[var(--accent-color)] hover:underline">
            Full stats
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-[var(--border)] p-2.5">
              <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">Easy</div>
              <div className="text-lg sm:text-xl font-bold">{diff('EASY')}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-2.5">
              <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">Moderate</div>
              <div className="text-lg sm:text-xl font-bold">{diff('MODERATE')}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-2.5">
              <div className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">Difficult</div>
              <div className="text-lg sm:text-xl font-bold">{diff('DIFFICULT')}</div>
            </div>
          </div>
          {byCategory.map((c) => (
            <div key={c.category}>
              <div className="flex justify-between text-sm mb-1">
                <span className="truncate pr-2">{categoryLabel(c.category)}</span>
                <span className="font-semibold shrink-0">{c.count}</span>
              </div>
              <ProgressBar value={total ? (c.count / total) * 100 : 0} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
