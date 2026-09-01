import { supabase } from '@/lib/supabase';
import { format, subDays, parseISO, isSameDay } from 'date-fns';

export async function recordActivity(
  userId: string,
  opts: { questionsAnswered: number; isPractice?: boolean; isMock?: boolean; dailyChallenge?: boolean }
) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: existing } = await supabase
    .from('user_daily_activity')
    .select('*')
    .eq('user_id', userId)
    .eq('activity_date', today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('user_daily_activity')
      .update({
        questions_answered: existing.questions_answered + opts.questionsAnswered,
        practice_sessions: existing.practice_sessions + (opts.isPractice ? 1 : 0),
        mock_exams: existing.mock_exams + (opts.isMock ? 1 : 0),
        daily_challenge_completed: existing.daily_challenge_completed || !!opts.dailyChallenge,
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('user_daily_activity').insert({
      user_id: userId,
      activity_date: today,
      questions_answered: opts.questionsAnswered,
      practice_sessions: opts.isPractice ? 1 : 0,
      mock_exams: opts.isMock ? 1 : 0,
      daily_challenge_completed: !!opts.dailyChallenge,
    });
  }

  // Update streak on profile
  await updateStreak(userId);
}

async function updateStreak(userId: string) {
  const { data: activities } = await supabase
    .from('user_daily_activity')
    .select('activity_date')
    .eq('user_id', userId)
    .order('activity_date', { ascending: false })
    .limit(60);

  if (!activities || activities.length === 0) return;

  let current = 0;
  let best = 0;
  let streak = 0;
  let expected = new Date();
  expected.setHours(0, 0, 0, 0);

  const dates = activities.map((a) => parseISO(a.activity_date));

  // Current streak: consecutive days ending today or yesterday
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    d.setHours(0, 0, 0, 0);
    if (isSameDay(d, expected) || (i === 0 && isSameDay(d, subDays(expected, 1)))) {
      if (i === 0 && isSameDay(d, subDays(expected, 1))) {
        expected = subDays(expected, 1);
      }
      streak++;
      expected = subDays(expected, 1);
    } else if (i === 0) {
      break;
    } else {
      break;
    }
  }
  current = streak;

  // Best streak (simple scan)
  streak = 1;
  best = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1];
    const curr = dates[i];
    prev.setHours(0, 0, 0, 0);
    curr.setHours(0, 0, 0, 0);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
      best = Math.max(best, streak);
    } else {
      streak = 1;
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('best_streak')
    .eq('id', userId)
    .single();

  await supabase
    .from('profiles')
    .update({
      current_streak: current,
      best_streak: Math.max(profile?.best_streak || 0, best, current),
      last_activity_date: format(new Date(), 'yyyy-MM-dd'),
    })
    .eq('id', userId);
}

export async function getActivityCalendar(userId: string, days = 30) {
  const start = format(subDays(new Date(), days), 'yyyy-MM-dd');
  const { data } = await supabase
    .from('user_daily_activity')
    .select('*')
    .eq('user_id', userId)
    .gte('activity_date', start)
    .order('activity_date', { ascending: true });
  return data || [];
}
