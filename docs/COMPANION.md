# FLPT Companion (feature/companion)

## Enable on Vercel preview

Add environment variable on the **Preview** environment:

```
VITE_COMPANION_ENABLED=true
```

Redeploy the `feature/companion` branch after setting it.

## Supabase

Run in SQL Editor:

`supabase/migrations/010_companion.sql`

Creates:
- `companion_profiles` (unlock, pet, energy, memories, gemini_api_key, hidden flag)
- `companion_messages`
- RLS: user owns own rows only

## Product rules

- Hidden until first practice **wrong** answer after feature is live
- 🐾 on every wrong until unlocked; gone after unlock
- Dashboard pet (bottom-right), not on exam screens
- No main nav item; `/companion` via pet popup
- FLPT is source of truth; selective context only
- BYOK Gemini; energy is UX only

## Hierarchy

Reviewer first → Companion Easter egg → Pet personality → AI helper
