-- Row Level Security Policies for FLPT

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_question_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topic_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_activity ENABLE ROW LEVEL SECURITY;

-- Helper: is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- User settings
CREATE POLICY "Users manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Questions: all authenticated can read active; admin full
CREATE POLICY "Authenticated can read active questions" ON public.questions
  FOR SELECT USING (auth.role() = 'authenticated' AND (is_active = true OR public.is_admin()));
CREATE POLICY "Admin full questions" ON public.questions
  FOR ALL USING (public.is_admin());

-- Exam attempts
CREATE POLICY "Users manage own attempts" ON public.exam_attempts
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Exam answers (via attempt ownership)
CREATE POLICY "Users manage own answers" ON public.exam_answers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.exam_attempts ea WHERE ea.id = attempt_id AND ea.user_id = auth.uid())
    OR public.is_admin()
  );

-- Bookmarks
CREATE POLICY "Users manage own bookmarks" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Stats
CREATE POLICY "Users manage own question stats" ON public.user_question_stats
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users manage own topic stats" ON public.user_topic_stats
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Achievements
CREATE POLICY "Anyone can read achievements" ON public.achievements
  FOR SELECT USING (true);
CREATE POLICY "Users manage own user_achievements" ON public.user_achievements
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Daily challenges
CREATE POLICY "Authenticated can read daily challenges" ON public.daily_challenges
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage daily challenges" ON public.daily_challenges
  FOR ALL USING (public.is_admin());

-- User daily activity
CREATE POLICY "Users manage own activity" ON public.user_daily_activity
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());
