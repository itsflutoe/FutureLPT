import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ questions: 0, users: 0, attempts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [q, u, a] = await Promise.all([
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('exam_attempts').select('id', { count: 'exact', head: true }),
      ]);
      setCounts({ questions: q.count || 0, users: u.count || 0, attempts: a.count || 0 });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-32"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-[var(--muted-foreground)]">Questions</div><div className="text-2xl font-bold">{counts.questions}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-[var(--muted-foreground)]">Users</div><div className="text-2xl font-bold">{counts.users}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-[var(--muted-foreground)]">Attempts</div><div className="text-2xl font-bold">{counts.attempts}</div></CardContent></Card>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link to="/admin/questions"><Button>Manage Questions</Button></Link>
        <Link to="/admin/import"><Button variant="outline">CSV Import</Button></Link>
        <Link to="/admin/users"><Button variant="outline">Users</Button></Link>
      </div>
    </div>
  );
}
