import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Question } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('questions').select('*').order('created_at', { ascending: false }).limit(50);
    if (search) q = q.ilike('question', `%${search}%`);
    const { data } = await q;
    setQuestions((data || []) as Question[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('questions').update({ is_active: !active }).eq('id', id);
    load();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Questions</h1>
      <div className="flex gap-2">
        <Input placeholder="Search question text…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button onClick={load}>Search</Button>
      </div>
      {loading ? <Spinner /> : (
        <div className="space-y-2">
          {questions.map((q) => (
            <Card key={q.id}>
              <CardContent className="p-4">
                <div className="flex gap-2 mb-1">
                  <Badge variant="outline">{q.category}</Badge>
                  <Badge variant="outline">{q.subject}</Badge>
                  <Badge variant={q.is_active ? 'success' : 'error'}>{q.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <p className="text-sm line-clamp-2">{q.question}</p>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => toggleActive(q.id, q.is_active)}>
                  {q.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
