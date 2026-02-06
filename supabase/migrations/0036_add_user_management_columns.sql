-- Add is_active column to team_memberships for user activation/deactivation
-- This allows admins to deactivate users without deleting their membership record

-- Add is_active column with default true
ALTER TABLE public.team_memberships
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add created_at column if not exists (some queries reference it)
ALTER TABLE public.team_memberships
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Add index for filtering by is_active
CREATE INDEX IF NOT EXISTS idx_team_memberships_is_active
ON public.team_memberships(team_id, is_active);

-- Add user_id column to user_whitelist if not exists (to link to Stack Auth user)
ALTER TABLE public.user_whitelist
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Add access_level column as alias for role (for backwards compatibility)
-- Some code uses access_level, some uses role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_whitelist' AND column_name = 'access_level'
  ) THEN
    ALTER TABLE public.user_whitelist ADD COLUMN access_level TEXT;
    -- Copy existing role values to access_level
    UPDATE public.user_whitelist SET access_level = role WHERE access_level IS NULL;
  END IF;
END $$;

-- Create trigger to keep role and access_level in sync
CREATE OR REPLACE FUNCTION sync_whitelist_role_access_level()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.access_level IS NULL AND NEW.role IS NOT NULL THEN
      NEW.access_level := NEW.role;
    ELSIF NEW.role IS NULL AND NEW.access_level IS NOT NULL THEN
      NEW.role := NEW.access_level;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.access_level IS DISTINCT FROM OLD.access_level THEN
      NEW.role := NEW.access_level;
    ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
      NEW.access_level := NEW.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_role_access_level ON user_whitelist;
CREATE TRIGGER sync_role_access_level
  BEFORE INSERT OR UPDATE ON user_whitelist
  FOR EACH ROW
  EXECUTE FUNCTION sync_whitelist_role_access_level();

-- Add inactive as valid status option (maps to deactivated)
-- Update status check constraint to include both 'inactive' and 'deactivated'
ALTER TABLE public.user_whitelist
DROP CONSTRAINT IF EXISTS user_whitelist_status_check;

ALTER TABLE public.user_whitelist
ADD CONSTRAINT user_whitelist_status_check
CHECK (status IN ('pending', 'accepted', 'active', 'deactivated', 'inactive'));

COMMENT ON COLUMN public.team_memberships.is_active IS 'Whether the user is currently active. Inactive users cannot access the team.';
COMMENT ON COLUMN public.user_whitelist.user_id IS 'The Stack Auth user ID after the user accepts the invitation.';
COMMENT ON COLUMN public.user_whitelist.access_level IS 'Alias for role column - kept for backwards compatibility.';
