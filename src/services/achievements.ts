import { supabase } from '@/lib/supabase';
import type { Achievement, UserAchievement } from '@/types';

function hourLocal(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours();
}

function dateKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function checkAchievements(userId: string) {
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);
  const earnedIds = new Set((existing || []).map((e) => e.achievement_id));

  const { data: allAchievements } = await supabase.from('achievements').select('*');
  if (!allAchievements?.length) return;

  const { data: attempts } = await supabase
    .from('exam_attempts')
    .select(
      'id, mode, category, subject, topic, correct_count, total_questions, score_percent, is_completed, is_daily_challenge, time_limit_seconds, time_used_seconds, completed_at, started_at'
    )
    .eq('user_id', userId)
    .eq('is_completed', true);

  const completed = attempts || [];
  const totalQ = completed.reduce((s, a) => s + (a.total_questions || 0), 0);
  const totalCorrect = completed.reduce((s, a) => s + (a.correct_count || 0), 0);
  const mocks = completed.filter((a) => a.mode === 'mock');
  const practices = completed.filter((a) => a.mode === 'practice');
  const perfect = completed.some((a) => Number(a.score_percent) === 100 && (a.total_questions || 0) >= 10);
  const almostPerfectMock = mocks.some((a) => {
    const p = Number(a.score_percent);
    return p >= 90 && p < 100;
  });
  const mockSurvivor = mocks.some((a) => (a.time_limit_seconds || 0) > 0);
  const examDayCalm = mocks.some(
    (a) =>
      (a.time_limit_seconds || 0) > 0 &&
      a.time_used_seconds != null &&
      a.time_used_seconds < a.time_limit_seconds
  );
  const dailyCount = completed.filter((a) => a.is_daily_challenge).length;
  const noSkip = completed.some(
    (a) => (a.total_questions || 0) >= 20 && (a.correct_count || 0) + /* answered */ 0 >= 0
  );

  // No-skip: every item answered — approximate via correct+incorrect = total (we only store correct_count; use answers query below)

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_streak, best_streak')
    .eq('id', userId)
    .single();

  const streak = profile?.current_streak || 0;

  // Bookmarks
  const { count: bookmarkCount } = await supabase
    .from('bookmarks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Mistakes = incorrect answers across attempts
  const { data: wrongRows } = await supabase
    .from('exam_answers')
    .select('id, attempt_id')
    .eq('is_correct', false);
  // Filter to this user's attempts
  const attemptIds = new Set(completed.map((a) => a.id));
  const mistakeCount = (wrongRows || []).filter((r) => attemptIds.has(r.attempt_id)).length;

  // Activity by day for review_warrior / balanced / hopper
  const { data: dailyAct } = await supabase
    .from('user_daily_activity')
    .select('activity_date, questions_answered, practice_sessions, mock_exams, daily_challenge_completed')
    .eq('user_id', userId);

  const maxQuestionsOneDay = Math.max(0, ...(dailyAct || []).map((d) => d.questions_answered || 0));

  // Midnight / early bird from completed_at local hour
  let midnight = false;
  let earlyBird = false;
  for (const a of completed) {
    const h = hourLocal(a.completed_at || a.started_at);
    if (h === null) continue;
    if (h >= 0 && h < 4) midnight = true;
    if (h >= 4 && h < 7) earlyBird = true;
  }

  // Subject hopper: unique subjects in last 7 days from attempts
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const subjectsWeek = new Set<
    string
  >();
  for (const a of completed) {
    const t = a.completed_at ? new Date(a.completed_at).getTime() : 0;
    if (t >= weekAgo && a.subject) subjectsWeek.add(a.subject);
  }
  // Also pull subjects from answers if attempt subject null
  if (subjectsWeek.size < 5 && completed.length) {
    const { data: ansSub } = await supabase
      .from('exam_answers')
      .select('attempt_id, question:questions(subject)')
      .in(
        'attempt_id',
        completed.filter((a) => a.completed_at && new Date(a.completed_at).getTime() >= weekAgo).map((a) => a.id)
      );
    for (const row of ansSub || []) {
      const subj = (row as { question?: { subject?: string } }).question?.subject;
      if (subj) subjectsWeek.add(subj);
    }
  }

  // Board exam energy: 3 mocks in 7 days
  const mocksWeek = mocks.filter((a) => {
    const t = a.completed_at ? new Date(a.completed_at).getTime() : 0;
    return t >= weekAgo;
  }).length;

  // Lesson plan mode: same topic on 3 different completed attempts
  const topicCounts: Record<string, number> = {};
  for (const a of completed) {
    if (a.topic) topicCounts[a.topic] = (topicCounts[a.topic] || 0) + 1;
  }
  const lessonPlan = Object.values(topicCounts).some((n) => n >= 3);

  // Mock specialist: avg >= 75 across at least 5 mocks
  let mockSpecialist = false;
  if (mocks.length >= 5) {
    const avg = mocks.reduce((s, a) => s + Number(a.score_percent || 0), 0) / mocks.length;
    mockSpecialist = avg >= 75;
  }

  // Category accuracy from topic stats
  const { data: topicStats } = await supabase
    .from('user_topic_stats')
    .select('category, subject, topic, attempts, correct_count, accuracy')
    .eq('user_id', userId);

  const stats = topicStats || [];
  const sumCat = (cat: string) => {
    const rows = stats.filter((s) => s.category === cat);
    const attemptsN = rows.reduce((s, r) => s + (r.attempts || 0), 0);
    const correctN = rows.reduce((s, r) => s + (r.correct_count || 0), 0);
    return { attemptsN, correctN, acc: attemptsN ? (correctN / attemptsN) * 100 : 0 };
  };
  const gen = sumCat('GENERAL_EDUCATION');
  const prof = sumCat('PROFESSIONAL_EDUCATION');

  // Weak spot hunter: any topic with attempts suggesting recovery — if accuracy >= 70 and attempts >= 5
  // (simplified: topic currently >= 70% with at least 8 attempts)
  const weakSpotHunter = stats.some((s) => (s.attempts || 0) >= 8 && Number(s.accuracy) >= 70);

  // Balanced educator: days with both categories practiced
  // Approximate: completed attempts per day that include both categories via topic stats is hard;
  // use attempts with category set
  const daysGen = new Set<string>();
  const daysProf = new Set<string>();
  for (const a of completed) {
    const dk = dateKey(a.completed_at);
    if (!dk) continue;
    if (a.category === 'GENERAL_EDUCATION') daysGen.add(dk);
    if (a.category === 'PROFESSIONAL_EDUCATION') daysProf.add(dk);
  }
  let balancedDays = 0;
  for (const d of daysGen) if (daysProf.has(d)) balancedDays++;

  // Comeback kid: compare first half vs second half of chronological correct rates
  let comeback = false;
  if (completed.length >= 4) {
    const ordered = [...completed].sort(
      (a, b) => new Date(a.completed_at || 0).getTime() - new Date(b.completed_at || 0).getTime()
    );
    const mid = Math.floor(ordered.length / 2);
    const early = ordered.slice(0, mid);
    const late = ordered.slice(mid);
    const rate = (arr: typeof ordered) => {
      const t = arr.reduce((s, a) => s + (a.total_questions || 0), 0);
      const c = arr.reduce((s, a) => s + (a.correct_count || 0), 0);
      return t ? (c / t) * 100 : 0;
    };
    comeback = rate(late) - rate(early) >= 10;
  }

  // No skip zone: session 20+ where correct_count + wrong roughly = total — fetch answer counts for large attempts
  let noSkipZone = false;
  const bigAttempts = completed.filter((a) => (a.total_questions || 0) >= 20);
  if (bigAttempts.length) {
    for (const a of bigAttempts.slice(0, 8)) {
      const { count } = await supabase
        .from('exam_answers')
        .select('id', { count: 'exact', head: true })
        .eq('attempt_id', a.id)
        .not('selected_answer', 'is', null);
      if ((count || 0) >= (a.total_questions || 0)) {
        noSkipZone = true;
        break;
      }
    }
  }

  const flags: Record<string, boolean> = {
    first_step: practices.length >= 1 || mocks.length >= 1,
    first_mock: mocks.length >= 1,
    questions_100: totalQ >= 100,
    questions_500: totalQ >= 500,
    perfect_score: perfect,
    consistency: streak >= 7,
    dedicated: mocks.length >= 10,
    review_warrior: maxQuestionsOneDay >= 50,
    midnight_scholar: midnight,
    early_bird_educator: earlyBird,
    almost_perfect: almostPerfectMock,
    comeback_kid: comeback,
    mistake_collector: mistakeCount >= 25,
    bookmark_hoarder: (bookmarkCount || 0) >= 20,
    topic_hopper: subjectsWeek.size >= 5,
    mock_survivor: mockSurvivor,
    daily_devotee: dailyCount >= 7,
    no_skip_zone: noSkipZone,
    board_exam_energy: mocksWeek >= 3,
    lesson_plan_mode: lessonPlan,
    faculty_room_regular: streak >= 14,
    practicum_ready: totalQ >= 200,
    code_of_ethics_enjoyer: prof.correctN >= 30,
    century_club: totalCorrect >= 100,
    iron_reviewer: streak >= 30,
    mock_specialist: mockSpecialist,
    gened_anchor: gen.attemptsN >= 50 && gen.acc >= 80,
    profed_anchor: prof.attemptsN >= 50 && prof.acc >= 80,
    balanced_educator: balancedDays >= 5,
    weak_spot_hunter: weakSpotHunter,
    exam_day_calm: examDayCalm,
  };

  // silence unused
  void noSkip;

  const toAward: string[] = [];
  for (const ach of allAchievements as Achievement[]) {
    if (earnedIds.has(ach.id)) continue;
    if (flags[ach.code]) toAward.push(ach.id);
  }

  for (const aid of toAward) {
    await supabase.from('user_achievements').insert({
      user_id: userId,
      achievement_id: aid,
    });
  }
}

export async function getUserAchievements(
  userId: string
): Promise<(UserAchievement & { achievement: Achievement })[]> {
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
