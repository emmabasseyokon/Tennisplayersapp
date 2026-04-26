# Tennis Players Database

Admin-only Next.js app for maintaining a tennis player register used to screen
junior players against age-based eligibility (U10/U12/U14/U16/U18) at
tournaments.

Each player record stores:

- Full name
- Date of birth (age is computed in the UI; never stored)
- Gender (male / female)
- Optional DOB document upload (passport / birth certificate) for evidence

## Stack

- Next.js 16 (App Router) + React 19
- Supabase (Postgres + Auth + Storage) with RLS
- Tailwind CSS v4

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to
`/login` if not authenticated, then to `/admin` once an admin profile is
present.

### Environment

Copy `.env.local.example` (if present) or set the following:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Database

Apply migrations in order:

1. `supabase/migrations/001_initial_schema.sql` — base profiles + admin auth.
2. `supabase/migrations/002_tennis_players.sql` — players table, age helper,
   `dob-documents` storage bucket, RLS.

The second migration also drops legacy `weeks` / `tasks` / `task_completions`
artifacts left over from the previous scoring app this was forked from.
