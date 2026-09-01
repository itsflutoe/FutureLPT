import { supabase } from '@/lib/supabase';
import type { ExamAttempt, ExamAnswer, PracticeConfig, Question, ExamResultSummary } from '@/types';
import { fetchQuestions } from './questions';
import { updateStatsAfterAttempt } from './progress';
import { recordActivity } from './streaks';
import { checkAchievements } from './achievements';

export async function createAttempt(
  userId: string,
  config: PracticeConfig,
  questions: Question[],
  timeLimitSeconds?: number
): Promise<ExamAttempt> {
  const { data, error } = await supabase
    .from('exam_attempts')
    .insert({
      user_id: userId,
      mode: config.mode,
      category: config.category === 'MIXED' ? null : config.category,
      subject: config.subject || null,
      topic: config.topic || null,
      difficulty: config.difficulty,
      total_questions: questions.length,
      time_limit_seconds: timeLimitSeconds || null,
      is_completed: false,
      is_daily_challenge: false,
    })
    .select()
    .single();

  if (error) throw error;

  // Create answer placeholders
  const answerRows = questions.map((q) => ({
    attempt_id: data.id,
    question_id: q.id,
    correct_answer: q.correct_answer,
    selected_answer: null,
    is_correct: null,
    is_flagged: false,
  }));

  const { error: ansError } = await supabase.from('exam_answers').insert(answerRows);
  if (ansError) throw ansError;

  return data as ExamAttempt;
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  selected: 'A' | 'B' | 'C' | 'D' | null,
  isFlagged = false
) {
  // Get correct answer
  const { data: ans } = await supabase
    .from('exam_answers')
    .select('correct_answer')
    .eq('attempt_id', attemptId)
    .eq('question_id', questionId)
    .single();

  const isCorrect = selected && ans ? selected === ans.correct_answer : null;

  const { error } = await supabase
    .from('exam_answers')
    .update({
      selected_answer: selected,
      is_correct: isCorrect,
      is_flagged: isFlagged,
      answered_at: selected ? new Date().toISOString() : null,
    })
    .eq('attempt_id', attemptId)
    .eq('question_id', questionId);

  if (error) throw error;
  return { isCorrect };
}

export async function completeAttempt(
  attemptId: string,
  userId: string,
  timeUsedSeconds: number
): Promise<ExamResultSummary> {
  // Fetch all answers with questions
  const { data: answers, error } = await supabase
    .from('exam_answers')
    .select(`
      *,
      question:questions(*)
    `)
    .eq('attempt_id', attemptId);

  if (error) throw error;

  const typedAnswers = (answers || []) as (ExamAnswer & { question: Question })[];
  const correctCount = typedAnswers.filter((a) => a.is_correct === true).length;
  const total = typedAnswers.length;
  const scorePercent = total > 0 ? (correctCount / total) * 100 : 0;

  const { data: attempt, error: updError } = await supabase
    .from('exam_attempts')
    .update({
      correct_count: correctCount,
      score_percent: scorePercent,
      time_used_seconds: timeUsedSeconds,
      completed_at: new Date().toISOString(),
      is_completed: true,
    })
    .eq('id', attemptId)
    .select()
    .single();

  if (updError) throw updError;

  // Update stats, streaks, achievements
  await updateStatsAfterAttempt(userId, typedAnswers);
  await recordActivity(userId, {
    questionsAnswered: total,
    isPractice: attempt.mode === 'practice',
    isMock: attempt.mode === 'mock',
  });
  await checkAchievements(userId);

  // Build summary
  const bySubject: Record<string, { correct: number; total: number; accuracy: number }> = {};
  const byTopic: Record<string, { correct: number; total: number; accuracy: number }> = {};

  for (const a of typedAnswers) {
    const subj = a.question.subject;
    const top = a.question.topic;
    if (!bySubject[subj]) bySubject[subj] = { correct: 0, total: 0, accuracy: 0 };
    if (!byTopic[top]) byTopic[top] = { correct: 0, total: 0, accuracy: 0 };
    bySubject[subj].total++;
    byTopic[top].total++;
    if (a.is_correct) {
      bySubject[subj].correct++;
      byTopic[top].correct++;
    }
  }

  Object.keys(bySubject).forEach((k) => {
    bySubject[k].accuracy = (bySubject[k].correct / bySubject[k].total) * 100;
  });
  Object.keys(byTopic).forEach((k) => {
    byTopic[k].accuracy = (byTopic[k].correct / byTopic[k].total) * 100;
  });

  const sortedSubjects = Object.entries(bySubject).sort((a, b) => b[1].accuracy - a[1].accuracy);
  const strongest = sortedSubjects.filter(([, v]) => v.accuracy >= 75).slice(0, 3).map(([k]) => k);
  const needsImprovement = sortedSubjects.filter(([, v]) => v.accuracy < 70).slice(0, 3).map(([k]) => k);

  return {
    attempt: attempt as ExamAttempt,
    answers: typedAnswers,
    bySubject,
    byTopic,
    strongest,
    needsImprovement,
  };
}

export async function getAttempt(attemptId: string) {
  const { data, error } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('id', attemptId)
    .single();
  if (error) throw error;
  return data as ExamAttempt;
}

export async function getAttemptAnswers(attemptId: string) {
  const { data, error } = await supabase
    .from('exam_answers')
    .select(`*, question:questions(*)`)
    .eq('attempt_id', attemptId);
  if (error) throw error;
  return data as (ExamAnswer & { question: Question })[];
}

export async function getUserHistory(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_completed', true)
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as ExamAttempt[];
}

export async function startPractice(userId: string, config: PracticeConfig) {
  const questions = await fetchQuestions({
    category: config.category,
    subject: config.subject,
    topic: config.topic,
    difficulty: config.difficulty,
    limit: config.count,
    userId,
  });

  if (questions.length === 0) {
    throw new Error('No questions found matching your criteria. Try different filters or add more questions.');
  }

  if (questions.length < config.count) {
    // Allow but warn via the returned length
  }

  const timeLimit = config.mode === 'mock' ? config.count * 90 : undefined; // ~1.5 min per question default
  const attempt = await createAttempt(userId, config, questions, timeLimit);
  return { attempt, questions };
}
