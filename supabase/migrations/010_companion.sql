-- Companion profiles (per FLPT user). Run in Supabase SQL editor.
CREATE TABLE IF NOT EXISTS public.companion_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  name TEXT,
  species TEXT,
  gender TEXT,
  personality TEXT,
  energy INTEGER NOT NULL DEFAULT 40,
  max_energy INTEGER NOT NULL DEFAULT 40,
  last_energy_update TIMESTAMPTZ DEFAULT NOW(),
  memories JSONB NOT NULL DEFAULT '[]'::jsonb,
  gemini_api_key TEXT,
  hidden_on_dashboard BOOLEAN NOT NULL DEFAULT FALSE,
  mood TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.companion_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'companion', 'system')),
  content TEXT NOT NULL,
  context_type TEXT DEFAULT 'chat',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companion_messages_user ON public.companion_messages(user_id, created_at DESC);

ALTER TABLE public.companion_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companion_profiles_own ON public.companion_profiles;
CREATE POLICY companion_profiles_own ON public.companion_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS companion_messages_own ON public.companion_messages;
CREATE POLICY companion_messages_own ON public.companion_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
