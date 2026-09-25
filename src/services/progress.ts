import { supabase } from '@/lib/supabase';
import type { ExamAnswer, Question, UserTopicStat } from '@/types';
import { calculateMastery } from '@/lib/utils';

/**
 * Apply question + topic stats after an attempt.
 * Uses 2 reads + 2 batch upserts instead of ~4 sequential calls per question.
 */
export async function updateStatsAfterAttempt(
  userId: string,
  answers: (ExamAnswer & { question: Question })[]
) {
  const answered = answers.filter((a) => a.selected_answer != null && a.question);
  if (answered.length === 0) return;

  const qids = [...new Set(answered.map((a) => a.question_id))];

  const [{ data: existingQ }, { data: existingTopics }] = await Promise.all([
    supabase
      .from('user_question_stats')
      .select('question_id, attempts, correct_count')
      .eq('user_id', userId)
      .in('question_id', qids),
    supabase
      .from('user_topic_stats')
      .select('category, subject, topic, attempts, correct_count')
      .eq('user_id', userId),
  ]);

  const qMap = new Map(
    (existingQ || []).map((r) => [r.question_id as string, r as { attempts: number; correct_count: number }])
  );
  const tMap = new Map(
    (existingTopics || []).map((r) => [
      `${r.category}::${r.subject}::${r.topic}`,
      r as { attempts: number; correct_count: number },
    ])
  );

  const now = new Date().toISOString();

  // One row per question answered in this attempt
  const qUpserts = answered.map((a) => {
    const ex = qMap.get(a.question_id);
    const attempts = (ex?.attempts || 0) + 1;
    const correctCount = (ex?.correct_count || 0) + (a.is_correct ? 1 : 0);
    return {
      user_id: userId,
      question_id: a.question_id,
      attempts,
      correct_count: correctCount,
      last_attempted_at: now,
      mastery_status: calculateMastery(attempts, correctCount),
    };
  });

  // Aggregate topic deltas (multiple Qs can share a topic)
  const topicDeltas = new Map<
    string,
    { category: string; subject: string; topic: string; addAttempts: number; addCorrect: number }
  >();
  for (const a of answered) {
    const q = a.question;
    const key = `${q.category}::${q.subject}::${q.topic}`;
    const d = topicDeltas.get(key) || {
      category: q.category,
      subject: q.subject,
      topic: q.topic,
      addAttempts: 0,
      addCorrect: 0,
    };
    d.addAttempts += 1;
    if (a.is_correct) d.addCorrect += 1;
    topicDeltas.set(key, d);
  }

  const tUpserts = [...topicDeltas.values()].map((d) => {
    const key = `${d.category}::${d.subject}::${d.topic}`;
    const ex = tMap.get(key);
    const attempts = (ex?.attempts || 0) + d.addAttempts;
    const correctCount = (ex?.correct_count || 0) + d.addCorrect;
    return {
      user_id: userId,
      category: d.category,
      subject: d.subject,
      topic: d.topic,
      attempts,
      correct_count: correctCount,
      accuracy: attempts > 0 ? (correctCount / attempts) * 100 : 0,
      last_practiced_at: now,
    };
  });

  // Two batch writes (not N sequential)
  const [qRes, tRes] = await Promise.all([
    supabase.from('user_question_stats').upsert(qUpserts, {
      onConflict: 'user_id,question_id',
    }),
    tUpserts.length
      ? supabase.from('user_topic_stats').upsert(tUpserts, {
          onConflict: 'user_id,category,subject,topic',
        })
      : Promise.resolve({ error: null }),
  ]);

  if (qRes.error) throw qRes.error;
  if (tRes && 'error' in tRes && tRes.error) throw tRes.error;
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
  const bySubject: Record<
    string,
    { category: string; correct: number; total: number; accuracy: number }
  > = {};

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
