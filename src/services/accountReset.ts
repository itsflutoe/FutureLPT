import { supabase } from '@/lib/supabase';

/** Reset the signed-in user's study progress (not login / profile identity). */
export async function resetOwnProgress(): Promise<void> {
  const { data, error } = await supabase.rpc('reset_own_progress');
  if (error) throw new Error(error.message);
  if (data && typeof data === 'object' && 'ok' in data && !(data as { ok: boolean }).ok) {
    throw new Error('Reset failed');
  }
}

/** Admin: reset one user's progress. */
export async function adminResetUserProgress(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_reset_user_progress', {
    target_user_id: userId,
  });
  if (error) throw new Error(error.message);
}

/** Admin: reset progress for every profile (does not delete accounts). */
export async function adminResetAllProgress(): Promise<number> {
  const { data, error } = await supabase.rpc('admin_reset_all_progress');
  if (error) throw new Error(error.message);
  const n = (data as { users_reset?: number } | null)?.users_reset;
  return typeof n === 'number' ? n : 0;
}
