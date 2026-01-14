-- Create team_memberships table to sync Stack Auth roles to Supabase
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text NOT NULL,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  permissions jsonb DEFAULT '[]'::jsonb,
  invited_by text,
  joined_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Team members can view their team memberships" ON public.team_memberships
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for membership sync" ON public.team_memberships
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for membership sync" ON public.team_memberships
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete for membership sync" ON public.team_memberships
  FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_memberships_team_id ON public.team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_user_id ON public.team_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_role ON public.team_memberships(role);
