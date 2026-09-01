export type Category = 'GENERAL_EDUCATION' | 'PROFESSIONAL_EDUCATION' | 'SPECIALIZATION';
export type Difficulty = 'EASY' | 'MODERATE' | 'DIFFICULT';
export type ExamMode = 'practice' | 'mock';
export type MasteryStatus = 'unseen' | 'learning' | 'improving' | 'strong' | 'mastered';
export type Role = 'USER' | 'ADMIN';
export type AccentColor = 'green' | 'blue' | 'purple' | 'orange';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  program: string;
  target_let_date: string | null;
  avatar_url: string | null;
  current_streak: number;
  best_streak: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  theme: ThemeMode;
  accent_color: AccentColor;
  exam_warnings: boolean;
  daily_challenge_reminders: boolean;
  updated_at: string;
}

export interface Question {
  id: string;
  category: Category;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  reference: string | null;
  source_type: 'original' | 'adapted' | 'reference-based';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExamAttempt {
  id: string;
  user_id: string;
  mode: ExamMode;
  category: Category | null;
  subject: string | null;
  topic: string | null;
  difficulty: Difficulty | 'MIXED' | null;
  total_questions: number;
  correct_count: number;
  score_percent: number;
  time_limit_seconds: number | null;
  time_used_seconds: number | null;
  started_at: string;
  completed_at: string | null;
  is_completed: boolean;
  is_daily_challenge: boolean;
}

export interface ExamAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_answer: 'A' | 'B' | 'C' | 'D' | null;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  is_correct: boolean | null;
  is_flagged: boolean;
  answered_at: string | null;
  time_spent_seconds: number | null;
}

export interface Bookmark {
  id: string;
  user_id: string;
  question_id: string;
  created_at: string;
  question?: Question;
}

export interface UserQuestionStat {
  user_id: string;
  question_id: string;
  attempts: number;
  correct_count: number;
  last_attempted_at: string | null;
  mastery_status: MasteryStatus;
}

export interface UserTopicStat {
  user_id: string;
  category: Category;
  subject: string;
  topic: string;
  attempts: number;
  correct_count: number;
  accuracy: number;
  last_practiced_at: string | null;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  threshold: number | null;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

export interface DailyChallenge {
  id: string;
  challenge_date: string;
  question_ids: string[];
  category: Category | null;
  created_at: string;
}

export interface UserDailyActivity {
  id: string;
  user_id: string;
  activity_date: string;
  questions_answered: number;
  practice_sessions: number;
  mock_exams: number;
  daily_challenge_completed: boolean;
}

export type PracticeCategory = Category | 'MIXED';

export interface PracticeConfig {
  /** MIXED = General Education + Professional Education (and any active categories) */
  category: PracticeCategory;
  subject?: string;
  topic?: string;
  count: number;
  difficulty: Difficulty | 'MIXED';
  mode: ExamMode;
}

export interface ExamResultSummary {
  attempt: ExamAttempt;
  answers: (ExamAnswer & { question: Question })[];
  bySubject: Record<string, { correct: number; total: number; accuracy: number }>;
  byTopic: Record<string, { correct: number; total: number; accuracy: number }>;
  strongest: string[];
  needsImprovement: string[];
}

export const GEN_ED_SUBJECTS = [
  'English',
  'Filipino',
  'Mathematics',
  'Science',
  'Social Science',
] as const;

export const PROF_ED_SUBJECTS = [
  'Child and Adolescent Development',
  'Facilitating Learning',
  'Assessment of Learning',
  'Curriculum Development',
  'Educational Technology',
  'Teaching Profession',
  'Social Dimensions of Education',
  'Principles of Teaching',
] as const;

export const ACCENT_COLORS: Record<AccentColor, string> = {
  green: '#16a34a',
  blue: '#2563eb',
  purple: '#7c3aed',
  orange: '#ea580c',
};
