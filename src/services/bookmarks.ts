import { supabase } from '@/lib/supabase';
import type { Bookmark, Question } from '@/types';

export async function addBookmark(userId: string, questionId: string) {
  const { error } = await supabase.from('bookmarks').insert({
    user_id: userId,
    question_id: questionId,
  });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function removeBookmark(userId: string, questionId: string) {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('question_id', questionId);
  if (error) throw error;
}

export async function getBookmarks(userId: string): Promise<(Bookmark & { question: Question })[]> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*, question:questions(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as (Bookmark & { question: Question })[];
}

export async function isBookmarked(userId: string, questionId: string): Promise<boolean> {
  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .maybeSingle();
  return !!data;
}
