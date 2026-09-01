# FLPT — Find Learn Pass Teach

Personal LET review companion for Bachelor of Elementary Education (BEEd) students in the Philippines.

**FLPT is an independent educational review platform and is not affiliated with, endorsed by, or administered by the Professional Regulation Commission (PRC) or the Commission on Higher Education (CHED).**

All practice material is **LET-style practice material** and is **not** actual PRC examination questions.

## Features

- Username + password authentication (Supabase Auth)
- Practice mode with explanations after each answer
- Timed mock exam mode with question navigator
- General Education & Professional Education categories
- Subject / topic filtering, difficulty, custom question counts
- Dashboard with stats, recommendations, streaks, daily challenge entry
- Progress analytics by subject and topic
- Weak-area detection and recommendations
- Bookmarks and Mistakes review
- Achievements and study streaks
- Theme (system / light / dark) + accent colors
- Admin panel: question management, CSV import, users
- Fully responsive (desktop sidebar + mobile bottom nav)
- Architecture ready for 5,000–10,000+ questions

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4
- **Backend:** Supabase (Auth, PostgreSQL, RLS)
- **Routing:** React Router v7
- **Charts / icons:** Recharts, Lucide React
- **Deploy:** Vercel + Supabase

## Quick Start

```bash
cd flpt
cp .env.example .env
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

## Supabase Setup

1. Create a project at https://supabase.com
2. In **Authentication → Providers**, ensure Email is enabled.  
   (This app uses synthetic emails `username@flpt.local` for username+password login.)
3. Run the SQL migrations in order in the SQL Editor:

   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_seed_questions.sql`

4. (Optional) Disable email confirmation for local testing under Auth settings, or configure a custom SMTP / redirect for recovery emails.
5. To promote a user to admin:

```sql
UPDATE public.profiles SET role = 'ADMIN' WHERE username = 'yourusername';
```

## CSV Import (Admin)

Go to `/admin/import` (admin role required).

Expected columns (flexible header names):

```
Category, Subject, Topic, Difficulty, Question, A, B, C, D, Correct Answer, Rationale, Reference
```

Validation rejects missing questions, invalid answers, etc. before insert.

## Project Structure

```
src/
  components/     # UI + layout pieces
  pages/          # Route pages (+ admin/)
  layouts/        # AppLayout
  hooks/          # useAuth, useTheme
  lib/            # supabase client, utils
  services/       # auth, questions, exams, progress, streaks, achievements, bookmarks
  types/          # shared TypeScript types
supabase/
  migrations/     # SQL schema, RLS, seed
```

## Core User Flow

1. Register → Login  
2. Dashboard (stats / recommendations)  
3. Practice → select category/subject/count → Start  
4. Answer questions (practice shows explanations; mock is timed)  
5. Submit → Results + review  
6. Stats, weak areas, and recommendations update automatically  

## Notes

- Question bank is stored in PostgreSQL only (not in frontend JS).
- Exam answers are stored per-question for future analytics.
- Auth uses username mapped to `username@flpt.local` for Supabase email-based auth.
- Password recovery uses Supabase’s built-in secure flow.
- Initial seed contains a small set of original LET-style items; use CSV import for larger batches.

## License / Disclaimer

Educational use. Independent of PRC and CHED. Practice material only.
