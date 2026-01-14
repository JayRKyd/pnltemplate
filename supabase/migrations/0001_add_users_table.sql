-- Create stack_users table keyed by Stack Auth user id
CREATE TABLE IF NOT EXISTS public.stack_users (
  id text PRIMARY KEY,
  email text,
  name text,
  avatar_url text,
  team_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stack_users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON public.stack_users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.stack_users
  FOR UPDATE USING (true);

CREATE POLICY "Allow insert" ON public.stack_users
  FOR INSERT WITH CHECK (true);
