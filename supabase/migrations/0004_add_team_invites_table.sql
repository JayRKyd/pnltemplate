-- Create team_invites table for managing invitations
CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  invited_by text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  UNIQUE(team_id, email, status)
);

-- Enable RLS
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view invites for their email" ON public.team_invites
  FOR SELECT USING (true);

CREATE POLICY "Team members can create invites" ON public.team_invites
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for accepting invites" ON public.team_invites
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete for canceling invites" ON public.team_invites
  FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON public.team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_team_id ON public.team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_status ON public.team_invites(status);
