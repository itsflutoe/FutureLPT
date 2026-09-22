-- Efficient question bank statistics (active questions only)
CREATE OR REPLACE FUNCTION public.question_bank_stats(
  p_category text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_topic text DEFAULT NULL,
  p_difficulty text DEFAULT NULL
)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT category, subject, topic, difficulty
    FROM public.questions
    WHERE is_active = true
      AND (p_category IS NULL OR category = p_category)
      AND (p_subject IS NULL OR subject = p_subject)
      AND (p_topic IS NULL OR topic = p_topic)
      AND (p_difficulty IS NULL OR difficulty = p_difficulty)
  )
  SELECT json_build_object(
    'total', (SELECT COUNT(*)::int FROM filtered),
    'by_category', COALESCE((
      SELECT json_agg(json_build_object('category', category, 'count', cnt) ORDER BY category)
      FROM (
        SELECT category, COUNT(*)::int AS cnt
        FROM filtered
        GROUP BY category
      ) c
    ), '[]'::json),
    'by_subject', COALESCE((
      SELECT json_agg(json_build_object(
        'category', category,
        'subject', subject,
        'count', cnt
      ) ORDER BY category, subject)
      FROM (
        SELECT category, subject, COUNT(*)::int AS cnt
        FROM filtered
        GROUP BY category, subject
      ) s
    ), '[]'::json),
    'by_topic', COALESCE((
      SELECT json_agg(json_build_object(
        'category', category,
        'subject', subject,
        'topic', topic,
        'count', cnt
      ) ORDER BY category, subject, topic)
      FROM (
        SELECT category, subject, topic, COUNT(*)::int AS cnt
        FROM filtered
        GROUP BY category, subject, topic
      ) t
    ), '[]'::json),
    'by_difficulty', COALESCE((
      SELECT json_agg(json_build_object('difficulty', difficulty, 'count', cnt) ORDER BY difficulty)
      FROM (
        SELECT difficulty, COUNT(*)::int AS cnt
        FROM filtered
        GROUP BY difficulty
      ) d
    ), '[]'::json)
  );
$$;

GRANT EXECUTE ON FUNCTION public.question_bank_stats(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.question_bank_stats(text, text, text, text) TO anon;
