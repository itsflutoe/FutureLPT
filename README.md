# FLPT — Find Learn Pass Teach

Personal LET review companion for Bachelor of Elementary Education (BEEd) students in the Philippines.

**FLPT is an independent educational review platform and is not affiliated with, endorsed by, or administered by the Professional Regulation Commission (PRC) or the Commission on Higher Education (CHED).**

All practice material is **LET-style practice material** and is **not** actual PRC examination questions.

## Features

- Username + password authentication (Supabase Auth)
- Practice mode with explanations after each answer
- Timed mock exam mode with question navigator
- General Education, Professional Education, and Mixed categories
- Subject / topic filtering, difficulty, custom question counts
- Dashboard with stats, recommendations, streaks
- Progress analytics by subject and topic
- Weak-area detection and recommendations
- Bookmarks and Mistakes review
- Achievements and study streaks
- Theme (system / light / dark) + accent colors
- Admin panel: questions, CSV import/export, users, password reset, bank statistics
- Responsive layout (desktop sidebar + mobile bottom nav)
- Architecture ready for 5,000–10,000+ questions

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4
- **Backend:** Supabase (Auth, PostgreSQL, RLS, Edge Functions)
- **Routing:** React Router v7
- **Deploy:** Vercel + Supabase

## Quick Start

```bash
cp env.example .env
# Edit .env with your Supabase URL and anon key
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Never put the service-role key in the frontend.

## Authentication (username-only UX)

FLPT never asks users for an email address.

Internally Supabase still needs an email identity:

`username` → `username@flpt.app`

### Signup (no confirmation email)

Preferred path: Edge Function `create-account` using service role with `email_confirm: true`.

```bash
supabase functions deploy create-account
```

Fallback: client `signUp` when Confirm email is **OFF** in Supabase Auth settings.

### Password recovery

Users do **not** use Supabase email recovery.

Flow:

1. Forgot Password → instructions
2. Message admin on Facebook (URL in `src/config/support.ts`)
3. Admin verifies username → **Admin → Users → Manage User → Reset Password**
4. User signs in with username + new password

Admin reset Edge Function:

```bash
supabase functions deploy admin-reset-password
```

### Promote an admin

```sql
UPDATE public.profiles SET role = 'ADMIN' WHERE username = 'yourusername';
```

Then log out and log in again.

## Supabase Setup

1. Create a project at https://supabase.com
2. Authentication → Providers → Email enabled
3. For username-only apps, turn **OFF** “Confirm email” unless `create-account` is deployed
4. Run SQL migrations in order:

   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_seed_questions.sql`
   - `supabase/migrations/004_username_exists.sql`
   - `supabase/migrations/005_question_bank_stats.sql`

5. Deploy Edge Functions as needed (see above)

## CSV Import (Admin)

Go to `/admin/import` (admin role required).

```
Category, Subject, Topic, Difficulty, Question, A, B, C, D, Correct Answer, Rationale, Reference
```

- Category must be `GENERAL_EDUCATION`, `PROFESSIONAL_EDUCATION`, or `SPECIALIZATION`
- Correct Answer must be `A`, `B`, `C`, or `D`
- UTF-8 CSV; quote fields that contain commas

## Project Structure

```
src/
  components/     # UI + ProtectedRoute
  pages/          # Route pages (+ admin/)
  layouts/        # AppLayout
  hooks/          # useAuth, useTheme
  lib/            # supabase client, utils
  services/       # auth, questions, exams, progress, streaks, achievements, bookmarks, stats
  config/         # support links (Facebook admin URL)
  types/          # shared TypeScript types
supabase/
  migrations/     # SQL schema, RLS, seed, stats RPC
  functions/      # create-account, admin-reset-password
```

## Core User Flow

1. Register → Login
2. Dashboard (stats / recommendations)
3. Practice → select filters → Start
4. Answer (practice shows explanations; mock is timed)
5. Submit → Results + review
6. Stats, weak areas, and recommendations update automatically

## Notes

- Question bank lives in PostgreSQL only (not hardcoded in the frontend)
- Exam answers are stored per question for analytics
- Initial seed is small; use CSV import for larger batches

## License / Disclaimer

Educational use. Independent of PRC and CHED. Practice material only.
