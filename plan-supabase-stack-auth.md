## Goal
Fully connect Stack Auth (auth/teams/roles) with Supabase (data, RLS), ensure mock UI uses real data, and fix the failing upsert.

## Current State
- Stack Auth: sign-in/sign-up works; teams exist; invites/roles only in Stack Auth UI.
- Supabase: `users` table migration proposed but not applied (upserts fail: missing columns). No tenant tables or RLS.
- App: Uses Stack Auth for auth; Supabase client is wired but mostly unused; mock data drives UI.

## Plan

### 1) Apply Base Schema in Supabase
- Create `users` table (Stack user mirror):
  - `id text primary key`
  - `email text`
  - `name text`
  - `avatar_url text`
  - `team_id text`
  - `created_at timestamptz default now()`
- Create first tenant-scoped table (example `expenses`):
  - `id uuid pk`, `team_id text`, `user_id text`, `amount numeric`, `status text`, `supplier text`, `description text`, `created_at timestamptz default now()`.

### 2) Enforce Multi-tenancy (RLS)
- Enable RLS on tenant tables.
- Policies: allow select/insert/update/delete where `team_id = current_setting('request.jwt.claims.team_id', true)`.
- Decide how to set `team_id` claim:
  - Option A: Issue Supabase JWTs with `team_id` from Stack Auth (requires a lightweight token exchange/custom Edge function).
  - Option B (simpler): Always pass `team_id` in queries and use RLS with `request.jwt.claims.sub` only when available; otherwise filter by query and run service-role on server.

### 3) Upsert Stack User into Supabase
- Fix server action to upsert `id, email, name, avatar_url, team_id` into `public.users`.
- Trigger on dashboard load (already wired) once the schema is applied.

### 4) Wire UI to Supabase Data
- Replace mock expenses with Supabase queries filtered by active team.
- For create/update, include `team_id` and `user_id`.
- Keep mock fixtures as fallback for empty states.

### 5) Roles & Invites
- Keep role management in Stack Auth; decide mapping to Supabase:
  - Option: Store `role` in a Supabase membership table keyed by `team_id`/`user_id` for RLS role checks.
  - Alternatively, embed `role` in custom JWT claims when issuing Supabase tokens.

### 6) Deployment/Env
- Ensure `.env.local` has Supabase URL/anon; add service role on server if needed for server actions.
- Whitelist redirect domains in Stack Auth (localhost/Vercel).

### 7) Migration Steps to Run
- Apply SQL for `public.users` (above).
- Apply SQL for `public.expenses` (or your chosen tables) and enable RLS + policies.
- Restart build/deploy after migrations.

### 8) Testing
- Sign in via Stack Auth, hit dashboard → confirm user upsert succeeds in Supabase.
- Create an expense → verify row stored with `team_id`.
- Fetch expenses → verify only current team rows are returned (RLS).

### 9) Cleanup/Backlog
- Remove mock data where replaced by Supabase queries.
- Add error UI for Supabase failures.
- Optional: add token exchange flow to include `team_id`/`role` in Supabase JWTs for cleaner RLS.
