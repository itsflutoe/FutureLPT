import { supabase } from '@/lib/supabase';
import type { ExamAnswer, Question, UserTopicStat } from '@/types';
import { calculateMastery } from '@/lib/utils';

export async function updateStatsAfterAttempt(
  userId: string,
  answers: (ExamAnswer & { question: Question })[]
) {
  for (const a of answers) {
    if (a.selected_answer == null) continue;

    // Question-level stats
    const { data: existing } = await supabase
      .from('user_question_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('question_id', a.question_id)
      .maybeSingle();

    const attempts = (existing?.attempts || 0) + 1;
    const correctCount = (existing?.correct_count || 0) + (a.is_correct ? 1 : 0);
    const mastery = calculateMastery(attempts, correctCount);

    await supabase.from('user_question_stats').upsert({
      user_id: userId,
      question_id: a.question_id,
      attempts,
      correct_count: correctCount,
      last_attempted_at: new Date().toISOString(),
      mastery_status: mastery,
    });

    // Topic-level stats
    const q = a.question;
    const { data: topicStat } = await supabase
      .from('user_topic_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('category', q.category)
      .eq('subject', q.subject)
      .eq('topic', q.topic)
      .maybeSingle();

    const tAttempts = (topicStat?.attempts || 0) + 1;
    const tCorrect = (topicStat?.correct_count || 0) + (a.is_correct ? 1 : 0);
    const accuracy = (tCorrect / tAttempts) * 100;

    await supabase.from('user_topic_stats').upsert({
      user_id: userId,
      category: q.category,
      subject: q.subject,
      topic: q.topic,
      attempts: tAttempts,
      correct_count: tCorrect,
      accuracy,
      last_practiced_at: new Date().toISOString(),
    });
  }
}

export async function getOverallStats(userId: string) {
  const { data: attempts } = await supabase
    .from('exam_attempts')
    .select('correct_count, total_questions, mode, is_completed')
    .eq('user_id', userId)
    .eq('is_completed', true);

  const completed = attempts || [];
  const totalQuestions = completed.reduce((s, a) => s + a.total_questions, 0);
  const totalCorrect = completed.reduce((s, a) => s + a.correct_count, 0);
  const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  const mockCount = completed.filter((a) => a.mode === 'mock').length;
  const practiceCount = completed.filter((a) => a.mode === 'practice').length;

  return {
    questionsAnswered: totalQuestions,
    correctAnswers: totalCorrect,
    accuracy,
    mockExamsCompleted: mockCount,
    practiceSessions: practiceCount,
  };
}

export async function getTopicStats(userId: string): Promise<UserTopicStat[]> {
  const { data, error } = await supabase
    .from('user_topic_stats')
    .select('*')
    .eq('user_id', userId)
    .order('accuracy', { ascending: true });
  if (error) throw error;
  return (data || []) as UserTopicStat[];
}

export async function getWeakAreas(userId: string, minAttempts = 5) {
  const stats = await getTopicStats(userId);
  return stats
    .filter((s) => s.attempts >= minAttempts && s.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);
}

export async function getRecommendations(userId: string) {
  const weak = await getWeakAreas(userId, 3);
  const recent = await getTopicStats(userId);
  const unseenOrLow = recent.filter((s) => s.attempts < 5 || s.accuracy < 75).slice(0, 5);

  const recs = [...weak];
  for (const s of unseenOrLow) {
    if (!recs.find((r) => r.topic === s.topic && r.subject === s.subject)) {
      recs.push(s);
    }
  }
  return recs.slice(0, 5);
}

export async function getMistakes(userId: string, limit = 50) {
  // Questions the user got wrong most recently / frequently
  const { data: stats } = await supabase
    .from('user_question_stats')
    .select('*, question:questions(*)')
    .eq('user_id', userId)
    .gt('attempts', 0)
    .order('last_attempted_at', { ascending: false })
    .limit(100);

  const mistakes = (stats || []).filter(
    (s: { attempts: number; correct_count: number }) => s.correct_count < s.attempts
  );
  return mistakes.slice(0, limit);
}

export async function getSubjectPerformance(userId: string) {
  const stats = await getTopicStats(userId);
  const bySubject: Record<string, { category: string; correct: number; total: number; accuracy: number }> = {};

  for (const s of stats) {
    const key = s.subject;
    if (!bySubject[key]) {
      bySubject[key] = { category: s.category, correct: 0, total: 0, accuracy: 0 };
    }
    bySubject[key].correct += s.correct_count;
    bySubject[key].total += s.attempts;
  }

  Object.keys(bySubject).forEach((k) => {
    const v = bySubject[k];
    v.accuracy = v.total > 0 ? (v.correct / v.total) * 100 : 0;
  });

  return bySubject;
}
