import { supabase } from '@/lib/supabase';
import type { PracticeCategory } from '@/types';

export type CategoryCount = { category: string; count: number };
export type SubjectCount = { category: string; subject: string; count: number };
export type TopicCount = { category: string; subject: string; topic: string; count: number };
export type DifficultyCount = { difficulty: string; count: number };

export type QuestionBankStats = {
  total: number;
  by_category: CategoryCount[];
  by_subject: SubjectCount[];
  by_topic: TopicCount[];
  by_difficulty: DifficultyCount[];
};

export type StatsFilters = {
  category?: PracticeCategory | '';
  subject?: string;
  topic?: string;
  difficulty?: string;
};

/** Aggregate from lightweight rows (fallback if RPC is not deployed). */
function aggregateRows(
  rows: { category: string; subject: string; topic: string; difficulty: string }[]
): QuestionBankStats {
  const byCat = new Map<string, number>();
  const bySub = new Map<string, number>();
  const byTop = new Map<string, number>();
  const byDiff = new Map<string, number>();

  for (const r of rows) {
    byCat.set(r.category, (byCat.get(r.category) || 0) + 1);
    const sk = `${r.category}\0${r.subject}`;
    bySub.set(sk, (bySub.get(sk) || 0) + 1);
    const tk = `${r.category}\0${r.subject}\0${r.topic}`;
    byTop.set(tk, (byTop.get(tk) || 0) + 1);
    byDiff.set(r.difficulty, (byDiff.get(r.difficulty) || 0) + 1);
  }

  return {
    total: rows.length,
    by_category: [...byCat.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category)),
    by_subject: [...bySub.entries()]
      .map(([k, count]) => {
        const [category, subject] = k.split('\0');
        return { category, subject, count };
      })
      .sort((a, b) => a.category.localeCompare(b.category) || a.subject.localeCompare(b.subject)),
    by_topic: [...byTop.entries()]
      .map(([k, count]) => {
        const [category, subject, topic] = k.split('\0');
        return { category, subject, topic, count };
      })
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          a.subject.localeCompare(b.subject) ||
          a.topic.localeCompare(b.topic)
      ),
    by_difficulty: [...byDiff.entries()]
      .map(([difficulty, count]) => ({ difficulty, count }))
      .sort((a, b) => a.difficulty.localeCompare(b.difficulty)),
  };
}

async function fetchViaSelect(filters: StatsFilters): Promise<QuestionBankStats> {
  const pageSize = 1000;
  let from = 0;
  const rows: { category: string; subject: string; topic: string; difficulty: string }[] = [];

  for (;;) {
    let q = supabase
      .from('questions')
      .select('category, subject, topic, difficulty')
      .eq('is_active', true)
      .range(from, from + pageSize - 1);

    if (filters.category && filters.category !== 'MIXED') q = q.eq('category', filters.category);
    if (filters.subject) q = q.eq('subject', filters.subject);
    if (filters.topic) q = q.eq('topic', filters.topic);
    if (filters.difficulty) q = q.eq('difficulty', filters.difficulty);

    const { data, error } = await q;
    if (error) throw error;
    const batch = data || [];
    if (batch.length === 0) break;
    rows.push(...(batch as typeof rows));
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return aggregateRows(rows);
}

export async function getQuestionBankStats(filters: StatsFilters = {}): Promise<QuestionBankStats> {
  const pCategory =
    filters.category && filters.category !== 'MIXED' ? filters.category : null;
  const pSubject = filters.subject || null;
  const pTopic = filters.topic || null;
  const pDifficulty = filters.difficulty || null;

  const { data, error } = await supabase.rpc('question_bank_stats', {
    p_category: pCategory,
    p_subject: pSubject,
    p_topic: pTopic,
    p_difficulty: pDifficulty,
  });

  if (!error && data) {
    const raw = data as QuestionBankStats;
    return {
      total: Number(raw.total) || 0,
      by_category: raw.by_category || [],
      by_subject: raw.by_subject || [],
      by_topic: raw.by_topic || [],
      by_difficulty: raw.by_difficulty || [],
    };
  }

  // Fallback if RPC not deployed yet
  return fetchViaSelect(filters);
}

export function categoryLabel(category: string): string {
  switch (category) {
    case 'GENERAL_EDUCATION':
      return 'General Education';
    case 'PROFESSIONAL_EDUCATION':
      return 'Professional Education';
    case 'SPECIALIZATION':
      return 'Major';
    default:
      return category.replace(/_/g, ' ');
  }
}
