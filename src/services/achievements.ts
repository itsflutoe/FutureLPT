import { supabase } from '@/lib/supabase';
import type { Achievement, UserAchievement } from '@/types';

export async function checkAchievements(userId: string) {
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);
  const earnedIds = new Set((existing || []).map((e) => e.achievement_id));

  const { data: allAchievements } = await supabase.from('achievements').select('*');
  if (!allAchievements) return;

  const { data: attempts } = await supabase
    .from('exam_attempts')
    .select('mode, correct_count, total_questions, score_percent, is_completed')
    .eq('user_id', userId)
    .eq('is_completed', true);

  const completed = attempts || [];
  const totalQ = completed.reduce((s, a) => s + a.total_questions, 0);
  const mocks = completed.filter((a) => a.mode === 'mock').length;
  const practices = completed.filter((a) => a.mode === 'practice').length;
  const perfect = completed.some((a) => a.score_percent === 100 && a.total_questions >= 10);

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_streak')
    .eq('id', userId)
    .single();

  const toAward: string[] = [];

  for (const ach of allAchievements as Achievement[]) {
    if (earnedIds.has(ach.id)) continue;

    let shouldAward = false;
    switch (ach.code) {
      case 'first_step':
        shouldAward = practices >= 1 || mocks >= 1;
        break;
      case 'first_mock':
        shouldAward = mocks >= 1;
        break;
      case 'questions_100':
        shouldAward = totalQ >= 100;
        break;
      case 'questions_500':
        shouldAward = totalQ >= 500;
        break;
      case 'perfect_score':
        shouldAward = perfect;
        break;
      case 'consistency':
        shouldAward = (profile?.current_streak || 0) >= 7;
        break;
      case 'dedicated':
        shouldAward = mocks >= 10;
        break;
      default:
        break;
    }

    if (shouldAward) toAward.push(ach.id);
  }

  for (const aid of toAward) {
    await supabase.from('user_achievements').insert({
      user_id: userId,
      achievement_id: aid,
    });
  }
}

export async function getUserAchievements(userId: string): Promise<(UserAchievement & { achievement: Achievement })[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  if (error) throw error;
  return (data || []) as (UserAchievement & { achievement: Achievement })[];
}

export async function getAllAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase.from('achievements').select('*').order('title');
  if (error) throw error;
  return (data || []) as Achievement[];
}
