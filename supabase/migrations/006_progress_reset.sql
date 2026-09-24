-- FLPT: progress / account reset helpers
-- Does NOT delete auth users, profiles identity, settings, or the question bank.

CREATE OR REPLACE FUNCTION public._reset_user_progress(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'target_id required';
  END IF;

  -- Attempts cascade to exam_answers
  DELETE FROM public.exam_attempts WHERE user_id = target_id;
  DELETE FROM public.bookmarks WHERE user_id = target_id;
  DELETE FROM public.user_question_stats WHERE user_id = target_id;
  DELETE FROM public.user_topic_stats WHERE user_id = target_id;
  DELETE FROM public.user_achievements WHERE user_id = target_id;
  DELETE FROM public.user_daily_activity WHERE user_id = target_id;

  UPDATE public.profiles
  SET
    current_streak = 0,
    best_streak = 0,
    last_activity_date = NULL,
    updated_at = NOW()
  WHERE id = target_id;
END;
$$;

-- Authenticated user resets their own progress
CREATE OR REPLACE FUNCTION public.reset_own_progress()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public._reset_user_progress(auth.uid());

  RETURN jsonb_build_object('ok', true, 'user_id', auth.uid());
END;
$$;

-- Admin resets one user's progress
CREATE OR REPLACE FUNCTION public.admin_reset_user_progress(target_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can reset another user''s progress';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  PERFORM public._reset_user_progress(target_user_id);

  RETURN jsonb_build_object('ok', true, 'user_id', target_user_id);
END;
$$;

-- Admin resets progress for ALL users (not delete accounts)
CREATE OR REPLACE FUNCTION public.admin_reset_all_progress()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer := 0;
  r record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can reset all progress';
  END IF;

  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public._reset_user_progress(r.id);
    n := n + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'users_reset', n);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_own_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_all_progress() TO authenticated;
