-- Admin announcements / tips (read-only for students)

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_published_created_idx
  ON public.announcements (is_published, created_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Students (and anyone authenticated) can read published posts
CREATE POLICY "Authenticated can read published announcements"
  ON public.announcements
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (is_published = true OR public.is_admin())
  );

-- Admin full access
CREATE POLICY "Admin manage announcements"
  ON public.announcements
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
