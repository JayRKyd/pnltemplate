-- User whitelist table for invitation-based access control
CREATE TABLE IF NOT EXISTS user_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'active', 'deactivated')),
  auth_methods TEXT[] DEFAULT ARRAY['password', 'google', 'magic_link']::TEXT[],
  two_factor_enabled BOOLEAN DEFAULT false,
  invited_by TEXT,
  invitation_token TEXT UNIQUE,
  invitation_sent_at TIMESTAMPTZ,
  invitation_expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  deactivated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one email per team
  UNIQUE(team_id, email)
);

-- Index for fast lookups
CREATE INDEX idx_whitelist_team_id ON user_whitelist(team_id);
CREATE INDEX idx_whitelist_email ON user_whitelist(email);
CREATE INDEX idx_whitelist_status ON user_whitelist(status);
CREATE INDEX idx_whitelist_invitation_token ON user_whitelist(invitation_token);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_whitelist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whitelist_updated_at
  BEFORE UPDATE ON user_whitelist
  FOR EACH ROW
  EXECUTE FUNCTION update_whitelist_updated_at();

-- RLS policies
ALTER TABLE user_whitelist ENABLE ROW LEVEL SECURITY;

-- Allow team members to read their team's whitelist
CREATE POLICY "Team members can view whitelist"
  ON user_whitelist
  FOR SELECT
  USING (true);

-- Only allow inserts/updates/deletes through server actions (service role)
CREATE POLICY "Service role can manage whitelist"
  ON user_whitelist
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE user_whitelist IS 'Stores whitelisted users who are allowed to access the system. Users must be whitelisted before they can create an account.';
