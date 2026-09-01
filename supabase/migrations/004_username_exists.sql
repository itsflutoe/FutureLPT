-- Optional helper: allow checking username availability without exposing full profiles
CREATE OR REPLACE FUNCTION public.username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = lower(trim(p_username))
  );
$$;

GRANT EXECUTE ON FUNCTION public.username_available(TEXT) TO anon, authenticated;
