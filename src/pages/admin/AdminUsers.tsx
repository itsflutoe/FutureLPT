import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { format } from 'date-fns';

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setUsers((data || []) as Profile[]); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center py-32"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{u.display_name} <span className="text-[var(--muted-foreground)]">@{u.username}</span></div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  Joined {format(new Date(u.created_at), 'MMM d, yyyy')} · Streak {u.current_streak}
                </div>
              </div>
              <Badge variant={u.role === 'ADMIN' ? 'success' : 'outline'}>{u.role}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
