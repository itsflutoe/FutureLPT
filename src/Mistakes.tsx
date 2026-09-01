import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getMistakes } from '@/services/progress';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

export default function Mistakes() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getMistakes(user.id).then(setItems).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex justify-center py-32"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Mistakes</h1>
      <p className="text-[var(--muted-foreground)] mb-6">Questions you have answered incorrectly.</p>
      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-[var(--muted-foreground)] mb-4">Nice. No recorded mistakes yet.</p>
            <Link to="/practice"><Button>Start practicing</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <Card key={m.question_id}>
              <CardContent className="p-4">
                <div className="flex gap-2 mb-2">
                  <Badge variant="outline">{m.question?.subject}</Badge>
                  <Badge variant="error">{m.correct_count}/{m.attempts} correct</Badge>
                </div>
                <p className="text-sm">{m.question?.question}</p>
              </CardContent>
            </Card>
          ))}
          <div className="pt-4">
            <Link to="/practice"><Button>Practice Mistakes</Button></Link>
          </div>
        </div>
      )}
    </div>
  );
}
