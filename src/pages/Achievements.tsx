import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getUserAchievements,
  getAllAchievements,
  checkAchievements,
  isSecretAchievement,
} from '@/services/achievements';
import type { Achievement, UserAchievement } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { format } from 'date-fns';
import { Trophy, Lock } from 'lucide-react';

export default function Achievements() {
  const { user } = useAuth();
  const [all, setAll] = useState<Achievement[]>([]);
  const [earned, setEarned] = useState<(UserAchievement & { achievement: Achievement })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        await checkAchievements(user.id);
        const [a, e] = await Promise.all([getAllAchievements(), getUserAchievements(user.id)]);
        setAll(a);
        setEarned(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  const earnedIds = new Set(earned.map((e) => e.achievement_id));
  const earnedCount = earnedIds.size;

  const visible = all.filter((a) => !isSecretAchievement(a.code) || earnedIds.has(a.id));
  const lockedSecrets = all.filter((a) => isSecretAchievement(a.code) && !earnedIds.has(a.id));

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-8 overflow-x-clip">
      <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-[var(--accent-color)]" aria-hidden />
        Achievements
      </h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-1">
        Badges for consistency — and mild academic roasting.
      </p>
      <p className="text-sm font-medium mb-6">
        {earnedCount} unlocked
        {all.length > 0 ? ` · ${all.length} in the vault` : ''}
      </p>

      <div className="grid gap-3">
        {visible.map((a) => {
          const isEarned = earnedIds.has(a.id);
          const ua = earned.find((e) => e.achievement_id === a.id);
          const secret = isSecretAchievement(a.code);
          return (
            <Card key={a.id} className={isEarned ? '' : 'opacity-70'}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm">
                      {secret && !isEarned ? '???' : a.title}
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
                      {secret && !isEarned
                        ? 'Hidden achievement. Keep studying.'
                        : a.description}
                    </p>
                  </div>
                  {isEarned ? (
                    <Badge variant="success">Earned</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="h-3 w-3" aria-hidden /> Locked
                    </Badge>
                  )}
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

        {lockedSecrets.length > 0 && (
          <Card className="opacity-60">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-medium">+ {lockedSecrets.length} hidden badges</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Secrets unlock through weird study moments. No spoilers.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
