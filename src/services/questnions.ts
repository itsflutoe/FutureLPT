import { supabase } from '@/lib/supabase';
import type { Difficulty, Question, PracticeCategory } from '@/types';

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Fetch all matching question IDs (paginated) so the full bank can be sampled. */
async function fetchAllMatchingIds(config: {
  category?: PracticeCategory;
  subject?: string;
  topic?: string;
  difficulty?: Difficulty | 'MIXED';
}): Promise<string[]> {
  const pageSize = 1000;
  let from = 0;
  const ids: string[] = [];

  for (;;) {
    let query = supabase
      .from('questions')
      .select('id')
      .eq('is_active', true)
      .range(from, from + pageSize - 1);

    if (config.category && config.category !== 'MIXED') {
      query = query.eq('category', config.category);
    }
    // MIXED: no category filter → full active bank across categories
    if (config.subject) query = query.eq('subject', config.subject);
    if (config.topic) query = query.eq('topic', config.topic);
    if (config.difficulty && config.difficulty !== 'MIXED') {
      query = query.eq('difficulty', config.difficulty);
    }

    const { data, error } = await query;
    if (error) throw error;
    const batch = (data || []) as { id: string }[];
    if (batch.length === 0) break;
    ids.push(...batch.map((r) => r.id));
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return ids;
}

async function fetchQuestionsByIds(ids: string[]): Promise<Question[]> {
  if (ids.length === 0) return [];
  // Supabase .in() handles batches; chunk if very large
  const chunkSize = 100;
  const out: Question[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await supabase.from('questions').select('*').in('id', chunk);
    if (error) throw error;
    out.push(...((data || []) as Question[]));
  }
  // Preserve requested id order
  const map = new Map(out.map((q) => [q.id, q]));
  return ids.map((id) => map.get(id)).filter(Boolean) as Question[];
}

/**
 * True random sample from the FULL matching active set.
 * When userId is provided, prefers questions the user has not attempted yet
 * so the bank is covered over time, then fills with previously seen items
 * (still randomly ordered).
 */
export async function fetchQuestions(config: {
  category?: PracticeCategory;
  subject?: string;
  topic?: string;
  difficulty?: Difficulty | 'MIXED';
  limit?: number;
  excludeIds?: string[];
  userId?: string;
}): Promise<Question[]> {
  const limit = config.limit || 20;
  let ids = await fetchAllMatchingIds(config);

  if (config.excludeIds?.length) {
    const exclude = new Set(config.excludeIds);
    ids = ids.filter((id) => !exclude.has(id));
  }

  if (ids.length === 0) return [];

  // Prefer unseen questions for this user so the full bank gets used over sessions
  let orderedIds: string[] = [];
  if (config.userId) {
    const { data: stats } = await supabase
      .from('user_question_stats')
      .select('question_id')
      .eq('user_id', config.userId)
      .gt('attempts', 0);

    const seen = new Set((stats || []).map((s: { question_id: string }) => s.question_id));
    const unseen = shuffleInPlace(ids.filter((id) => !seen.has(id)));
    const seenIds = shuffleInPlace(ids.filter((id) => seen.has(id)));
    orderedIds = [...unseen, ...seenIds];
  } else {
    orderedIds = shuffleInPlace([...ids]);
  }

  // For MIXED difficulty, re-balance after loading details when possible
  const selectedIds = orderedIds.slice(0, Math.min(limit * 4, orderedIds.length));
  let questions = await fetchQuestionsByIds(selectedIds);

  if (config.difficulty === 'MIXED' && limit) {
    const easy = shuffleInPlace(questions.filter((q) => q.difficulty === 'EASY'));
    const mod = shuffleInPlace(questions.filter((q) => q.difficulty === 'MODERATE'));
    const hard = shuffleInPlace(questions.filter((q) => q.difficulty === 'DIFFICULT'));
    const result: Question[] = [];
    let ei = 0;
    let mi = 0;
    let hi = 0;
    // Prefer unseen order already applied within each difficulty via selectedIds order —
    // lists above keep relative order from `questions` which followed orderedIds.
    while (result.length < limit && (ei < easy.length || mi < mod.length || hi < hard.length)) {
      if (mi < mod.length && result.length < limit) result.push(mod[mi++]);
      if (ei < easy.length && result.length < limit) result.push(easy[ei++]);
      if (hi < hard.length && result.length < limit) result.push(hard[hi++]);
    }
    // If still short, fill from remaining selected questions
    if (result.length < limit) {
      const used = new Set(result.map((q) => q.id));
      for (const q of questions) {
        if (result.length >= limit) break;
        if (!used.has(q.id)) result.push(q);
      }
    }
    questions = shuffleInPlace(result);
  } else {
    // Keep coverage order (unseen first) but only take `limit`, then shuffle session order
    const byId = new Map(questions.map((q) => [q.id, q]));
    const picked: Question[] = [];
    for (const id of orderedIds) {
      if (picked.length >= limit) break;
      const q = byId.get(id);
      if (q) picked.push(q);
    }
    // If we only loaded a subset of details, fetch any missing
    if (picked.length < limit) {
      const need = orderedIds.filter((id) => !byId.has(id)).slice(0, limit - picked.length);
      if (need.length) {
        const extra = await fetchQuestionsByIds(need);
        picked.push(...extra);
      }
    }
    questions = shuffleInPlace(picked.slice(0, limit));
  }

  return questions.slice(0, limit);
}

export async function getQuestionCount(filters?: {
  category?: PracticeCategory;
  subject?: string;
  topic?: string;
  difficulty?: Difficulty;
}): Promise<number> {
  let query = supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  if (filters?.category && filters.category !== 'MIXED') {
    query = query.eq('category', filters.category);
  }
  if (filters?.subject) query = query.eq('subject', filters.subject);
  if (filters?.topic) query = query.eq('topic', filters.topic);
  if (filters?.difficulty) query = query.eq('difficulty', filters.difficulty);

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function getSubjects(category: PracticeCategory): Promise<string[]> {
  let query = supabase.from('questions').select('subject').eq('is_active', true);
  if (category !== 'MIXED') {
    query = query.eq('category', category);
  }
  const { data, error } = await query;
  if (error) throw error;
  return [...new Set((data || []).map((d: { subject: string }) => d.subject))].sort();
}

export async function getTopics(category: PracticeCategory, subject: string): Promise<string[]> {
  let query = supabase
    .from('questions')
    .select('topic')
    .eq('is_active', true)
    .eq('subject', subject);
  if (category !== 'MIXED') {
    query = query.eq('category', category);
  }
  const { data, error } = await query;
  if (error) throw error;
  return [...new Set((data || []).map((d: { topic: string }) => d.topic))].sort();
}

export async function searchQuestions(keyword: string, limit = 20): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('is_active', true)
    .or(`question.ilike.%${keyword}%,topic.ilike.%${keyword}%,subject.ilike.%${keyword}%`)
    .limit(limit);
  if (error) throw error;
  return (data || []) as Question[];
}
