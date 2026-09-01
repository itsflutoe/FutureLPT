-- FLPT Database Schema
-- Run this in Supabase SQL Editor or via migrations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  program TEXT DEFAULT 'BEEd',
  target_let_date DATE,
  avatar_url TEXT,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
  accent_color TEXT DEFAULT 'green' CHECK (accent_color IN ('green', 'blue', 'purple', 'orange')),
  exam_warnings BOOLEAN DEFAULT TRUE,
  daily_challenge_reminders BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('GENERAL_EDUCATION', 'PROFESSIONAL_EDUCATION', 'SPECIALIZATION')),
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('EASY', 'MODERATE', 'DIFFICULT')),
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation TEXT NOT NULL,
  reference TEXT,
  source_type TEXT DEFAULT 'original' CHECK (source_type IN ('original', 'adapted', 'reference-based')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for questions (scale to 10k+)
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON public.questions(topic);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_active ON public.questions(is_active);
CREATE INDEX IF NOT EXISTS idx_questions_category_subject ON public.questions(category, subject);
CREATE INDEX IF NOT EXISTS idx_questions_category_subject_topic ON public.questions(category, subject, topic);

-- Exam attempts
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'mock')),
  category TEXT CHECK (category IN ('GENERAL_EDUCATION', 'PROFESSIONAL_EDUCATION', 'SPECIALIZATION')),
  subject TEXT,
  topic TEXT,
  difficulty TEXT,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER DEFAULT 0,
  score_percent NUMERIC(5,2) DEFAULT 0,
  time_limit_seconds INTEGER,
  time_used_seconds INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE,
  is_daily_challenge BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON public.exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_completed ON public.exam_attempts(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_started ON public.exam_attempts(started_at DESC);

-- Exam answers (raw answer data for analytics)
CREATE TABLE IF NOT EXISTS public.exam_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_answer TEXT CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN,
  is_flagged BOOLEAN DEFAULT FALSE,
  answered_at TIMESTAMPTZ,
  time_spent_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt ON public.exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_question ON public.exam_answers(question_id);

-- Bookmarks
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id);

-- User question stats (for mastery)
CREATE TABLE IF NOT EXISTS public.user_question_stats (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  last_attempted_at TIMESTAMPTZ,
  mastery_status TEXT DEFAULT 'unseen' CHECK (mastery_status IN ('unseen', 'learning', 'improving', 'strong', 'mastered')),
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_uqs_user ON public.user_question_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_uqs_mastery ON public.user_question_stats(user_id, mastery_status);

-- User topic stats
CREATE TABLE IF NOT EXISTS public.user_topic_stats (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy NUMERIC(5,2) DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, category, subject, topic)
);

CREATE INDEX IF NOT EXISTS idx_uts_user ON public.user_topic_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_uts_accuracy ON public.user_topic_stats(user_id, accuracy);

-- Achievements definitions
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT DEFAULT 'award',
  threshold INTEGER
);

-- User achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_ua_user ON public.user_achievements(user_id);

-- Daily challenges
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_date DATE UNIQUE NOT NULL,
  question_ids UUID[] NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User daily activity (for streaks)
CREATE TABLE IF NOT EXISTS public.user_daily_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  questions_answered INTEGER DEFAULT 0,
  practice_sessions INTEGER DEFAULT 0,
  mock_exams INTEGER DEFAULT 0,
  daily_challenge_completed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_uda_user_date ON public.user_daily_activity(user_id, activity_date DESC);

-- Function: handle new user (create profile + settings)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', COALESCE(NEW.raw_user_meta_data->>'username', 'Student'))
  );
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER questions_updated_at BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed achievements
INSERT INTO public.achievements (code, title, description, icon, threshold) VALUES
  ('first_step', 'First Step', 'Complete your first practice session.', 'footprints', 1),
  ('first_mock', 'First Mock', 'Complete your first mock examination.', 'clipboard-check', 1),
  ('questions_100', '100 Questions', 'Answer 100 questions.', 'target', 100),
  ('questions_500', '500 Questions', 'Answer 500 questions.', 'trophy', 500),
  ('perfect_score', 'Perfect Score', 'Get 100% on a practice session of 10+ questions.', 'star', 100),
  ('consistency', 'Consistency', 'Study for 7 consecutive days.', 'calendar', 7),
  ('dedicated', 'Dedicated Reviewer', 'Complete 10 mock exams.', 'medal', 10),
  ('rising', 'Rising Educator', 'Improve your overall accuracy by 15% from your first 50 answers.', 'trending-up', NULL)
ON CONFLICT (code) DO NOTHING;
