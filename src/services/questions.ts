import { supabase } from '@/lib/supabase';
import type { Category, Difficulty, Question } from '@/types';

export async function fetchQuestions(config: {
  category?: Category;
  subject?: string;
  topic?: string;
  difficulty?: Difficulty | 'MIXED';
  limit?: number;
  excludeIds?: string[];
}): Promise<Question[]> {
  let query = supabase
    .from('questions')
    .select('*')
    .eq('is_active', true);

  if (config.category) query = query.eq('category', config.category);
  if (config.subject) query = query.eq('subject', config.subject);
  if (config.topic) query = query.eq('topic', config.topic);
  if (config.difficulty && config.difficulty !== 'MIXED') {
    query = query.eq('difficulty', config.difficulty);
  }
  if (config.excludeIds && config.excludeIds.length > 0) {
    query = query.not('id', 'in', `(${config.excludeIds.join(',')})`);
  }

  // Fetch more than needed then shuffle client-side for randomization
  const fetchLimit = Math.min((config.limit || 20) * 3, 500);
  query = query.limit(fetchLimit);

  const { data, error } = await query;
  if (error) throw error;

  let questions = (data || []) as Question[];

  // Shuffle
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  if (config.difficulty === 'MIXED' && config.limit) {
    // Aim for balanced distribution when possible
    const easy = questions.filter(q => q.difficulty === 'EASY');
    const mod = questions.filter(q => q.difficulty === 'MODERATE');
    const hard = questions.filter(q => q.difficulty === 'DIFFICULT');
    const result: Question[] = [];
    const target = config.limit;
    let ei = 0, mi = 0, hi = 0;
    while (result.length < target && (ei < easy.length || mi < mod.length || hi < hard.length)) {
      if (mi < mod.length && result.length < target) result.push(mod[mi++]);
      if (ei < easy.length && result.length < target) result.push(easy[ei++]);
      if (hi < hard.length && result.length < target) result.push(hard[hi++]);
    }
    questions = result;
  }

  return questions.slice(0, config.limit || 20);
}

export async function getQuestionCount(filters?: {
  category?: Category;
  subject?: string;
  topic?: string;
  difficulty?: Difficulty;
}): Promise<number> {
  let query = supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.subject) query = query.eq('subject', filters.subject);
  if (filters?.topic) query = query.eq('topic', filters.topic);
  if (filters?.difficulty) query = query.eq('difficulty', filters.difficulty);

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function getSubjects(category: Category): Promise<string[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('subject')
    .eq('category', category)
    .eq('is_active', true);
  if (error) throw error;
  return [...new Set((data || []).map((d: { subject: string }) => d.subject))].sort();
}

export async function getTopics(category: Category, subject: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('topic')
    .eq('category', category)
    .eq('subject', subject)
    .eq('is_active', true);
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
