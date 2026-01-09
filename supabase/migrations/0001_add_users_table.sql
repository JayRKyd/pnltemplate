-- Create users table keyed by Stack Auth user id
create table if not exists public.users (
  id text primary key,
  email text,
  name text,
  avatar_url text,
  team_id text,
  created_at timestamptz default now()
);
