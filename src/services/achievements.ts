import { supabase } from '@/lib/supabase';
import type { Achievement, UserAchievement } from '@/types';

function hourLocal(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours();
}

function subjectBucket(subject: string | undefined | null): string | null {
  if (!subject) return null;
  const s = subject.toLowerCase();
  if (s.includes('science') || s.includes('technology')) return 'science';
  if (s.includes('math')) return 'math';
  if (s.includes('english') || s.includes('communication') || s.includes('filipino') || s.includes('purposive'))
    return 'comms';
  if (s.includes('history') || s.includes('rizal') || s.includes('kasaysayan') || s.includes('social'))
    return 'history';
  return null;
}

/** Max consecutive correct within a single attempt (by answered_at). */
async function maxCorrectStreakInAttempts(attemptIds: string[]): Promise<number> {
  if (!attemptIds.length) return 0;
  let best = 0;
  for (const id of attemptIds.slice(0, 15)) {
    const { data } = await supabase
      .from('exam_answers')
      .select('is_correct, answered_at')
      .eq('attempt_id', id)
      .not('selected_answer', 'is', null)
      .order('answered_at', { ascending: true });
    let run = 0;
    for (const row of data || []) {
      if (row.is_correct) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
  }
  return best;
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

  const perfect = completed.some(
    (a) => Number(a.score_percent) === 100 && (a.total_questions || 0) >= 5
  );
  const academicDamage = completed.some(
    (a) => Number(a.score_percent) >= 90 && (a.total_questions || 0) >= 10
  );
  const speedDemon = mocks.some(
    (a) =>
      (a.time_limit_seconds || 0) > 0 &&
      a.time_used_seconds != null &&
      a.time_used_seconds <= a.time_limit_seconds * 0.6 &&
      Number(a.score_percent) >= 70
  );
  const trustProcess = completed.some(
    (a) => (a.total_questions || 0) >= 20 && Number(a.correct_count) === a.total_questions
      ? false // need all answered — check below
      : (a.total_questions || 0) >= 20
  );

  let allAnswered20 = false;
  for (const a of completed.filter((x) => (x.total_questions || 0) >= 20).slice(0, 8)) {
    const { count } = await supabase
      .from('exam_answers')
      .select('id', { count: 'exact', head: true })
      .eq('attempt_id', a.id)
      .not('selected_answer', 'is', null);
    if ((count || 0) >= (a.total_questions || 0)) {
      allAnswered20 = true;
      break;
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_streak, best_streak, last_activity_date')
    .eq('id', userId)
    .single();

  const streak = profile?.current_streak || 0;

  const { count: bookmarkCount } = await supabase
    .from('bookmarks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const attemptIds = completed.map((a) => a.id);
  const { data: wrongRows } = attemptIds.length
    ? await supabase
        .from('exam_answers')
        .select('id, attempt_id')
        .eq('is_correct', false)
        .in('attempt_id', attemptIds)
    : { data: [] as { id: string; attempt_id: string }[] };
  const mistakeCount = (wrongRows || []).length;

  // Recovered questions: user_question_stats with attempts>=2 and correct_count>=1 after misses
  const { data: qstats } = await supabase
    .from('user_question_stats')
    .select('attempts, correct_count')
    .eq('user_id', userId);
  const recovered = (qstats || []).filter(
    (r) => (r.attempts || 0) >= 2 && (r.correct_count || 0) >= 1 && (r.attempts || 0) > (r.correct_count || 0)
  ).length;
  const waitIKnow = recovered >= 1;
  const cleanMess = recovered >= 20;

  const { data: dailyAct } = await supabase
    .from('user_daily_activity')
    .select('activity_date, questions_answered')
    .eq('user_id', userId)
    .order('activity_date', { ascending: true });

  const maxQuestionsOneDay = Math.max(
    0,
    ...(dailyAct || []).map((d) => d.questions_answered || 0)
  );

  // Back from the dead: gap of 30+ days between activity days
  let backFromDead = false;
  const days = (dailyAct || []).map((d) => d.activity_date).filter(Boolean);
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + 'T00:00:00').getTime();
    const cur = new Date(days[i] + 'T00:00:00').getTime();
    if ((cur - prev) / (86400000) >= 30) backFromDead = true;
  }

  let midnight = false;
  let earlyBird = false;
  for (const a of completed) {
    const h = hourLocal(a.completed_at || a.started_at);
    if (h === null) continue;
    if (h >= 0 && h < 4) midnight = true;
    if (h >= 4 && h < 7) earlyBird = true;
  }

  // Subject tallies from topic stats
  const { data: topicStats } = await supabase
    .from('user_topic_stats')
    .select('category, subject, attempts, correct_count')
    .eq('user_id', userId);

  let scienceQ = 0;
  let mathQ = 0;
  let commsQ = 0;
  let histQ = 0;
  let profQ = 0;
  let genQ = 0;
  for (const row of topicStats || []) {
    const n = row.attempts || 0;
    if (row.category === 'PROFESSIONAL_EDUCATION') profQ += n;
    if (row.category === 'GENERAL_EDUCATION') genQ += n;
    const b = subjectBucket(row.subject);
    if (b === 'science') scienceQ += n;
    if (b === 'math') mathQ += n;
    if (b === 'comms') commsQ += n;
    if (b === 'history') histQ += n;
  }

  const maxStreak = await maxCorrectStreakInAttempts(attemptIds);

  // Wrong streak in a session (secret)
  let maxWrongStreak = 0;
  for (const id of attemptIds.slice(0, 10)) {
    const { data } = await supabase
      .from('exam_answers')
      .select('is_correct, answered_at')
      .eq('attempt_id', id)
      .not('selected_answer', 'is', null)
      .order('answered_at', { ascending: true });
    let run = 0;
    for (const row of data || []) {
      if (row.is_correct === false) {
        run++;
        if (run > maxWrongStreak) maxWrongStreak = run;
      } else run = 0;
    }
  }

  const barelyPassed = completed.some((a) => {
    const p = Number(a.score_percent);
    return p >= 50 && p < 60 && (a.total_questions || 0) >= 10;
  });

  const flags: Record<string, boolean> = {
    // legacy codes still in DB
    first_step: totalQ >= 1 || practices.length + mocks.length >= 1,
    first_mock: mocks.length >= 1,
    questions_100: totalQ >= 100,
    questions_500: totalQ >= 500,
    perfect_score: perfect,
    consistency: streak >= 7,
    dedicated: mocks.length >= 10,
    review_warrior: maxQuestionsOneDay >= 50,
    midnight_scholar: midnight,
    early_bird_educator: earlyBird,
    almost_perfect: academicDamage,
    mistake_collector: mistakeCount >= 25,
    bookmark_hoarder: (bookmarkCount || 0) >= 20,
    mock_survivor: mocks.some((a) => (a.time_limit_seconds || 0) > 0),
    no_skip_zone: allAnswered20,
    practicum_ready: totalQ >= 200,
    century_club: totalCorrect >= 100,
    iron_reviewer: streak >= 30,
    exam_day_calm: mocks.some(
      (a) =>
        (a.time_limit_seconds || 0) > 0 &&
        a.time_used_seconds != null &&
        a.time_used_seconds < a.time_limit_seconds
    ),

    // v2 catalog
    warm_up_act: totalQ >= 10,
    brain_booting: totalQ >= 50,
    getting_serious: totalQ >= 100,
    clean_sweep: perfect,
    academic_damage: academicDamage,
    deadeye: maxStreak >= 10,
    on_fire: maxStreak >= 20,
    brick_by_brick: totalQ >= 500,
    built_different: totalQ >= 1000,
    question_hoarder: (bookmarkCount || 0) >= 25,
    science_survivor: scienceQ >= 50,
    math_survivor: mathQ >= 50,
    word_warrior: commsQ >= 50,
    kasaysayan_survivor: histQ >= 50,
    teacher_mode: profQ >= 100,
    still_studying: streak >= 3,
    no_days_off: streak >= 7,
    im_still_here: streak >= 30,
    streak_goblin_14: streak >= 14,
    streak_goblin_100: streak >= 100,
    night_owl: midnight,
    early_bird: earlyBird,
    one_more_question: maxQuestionsOneDay >= 50,
    speed_demon: speedDemon,
    trust_the_process: allAnswered20,
    mistake_detective: mistakeCount >= 20,
    wait_i_know_this: waitIKnow,
    clean_your_mess: cleanMess,
    future_teacher_loading: totalQ >= 200,
    gened_warrior: genQ >= 50,
    profed_survivor: profQ >= 50,
    let_me_cook: mocks.length >= 5,

    secret_back_from_dead: backFromDead,
    secret_what_was_that: maxWrongStreak >= 5,
    secret_barely_passed: barelyPassed,
  };

  void trustProcess;

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

export function isSecretAchievement(code: string): boolean {
  return code.startsWith('secret_');
}
