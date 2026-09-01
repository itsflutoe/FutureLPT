import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getUserAchievements, getAllAchievements } from '@/services/achievements';
import type { Achievement, UserAchievement } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { format } from 'date-fns';
import { Trophy } from 'lucide-react';

export default function Achievements() {
  const { user } = useAuth();
  const [all, setAll] = useState<Achievement[]>([]);
  const [earned, setEarned] = useState<(UserAchievement & { achievement: Achievement })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getAllAchievements(), getUserAchievements(user.id)])
      .then(([a, e]) => { setAll(a); setEarned(e); })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex justify-center py-32"><Spinner /></div>;

  const earnedIds = new Set(earned.map((e) => e.achievement_id));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2"><Trophy className="h-6 w-6 text-[var(--accent-color)]" /> Achievements</h1>
      <p className="text-[var(--muted-foreground)] mb-6">Light milestones to celebrate consistent progress.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {all.map((a) => {
          const isEarned = earnedIds.has(a.id);
          const ua = earned.find((e) => e.achievement_id === a.id);
          return (
            <Card key={a.id} className={isEarned ? '' : 'opacity-60'}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">{a.title}</h3>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">{a.description}</p>
                  </div>
                  {isEarned ? <Badge variant="success">Earned</Badge> : <Badge variant="outline">Locked</Badge>}
                </div>
                {ua && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-2">
                    {format(new Date(ua.earned_at), 'MMM d, yyyy')}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
