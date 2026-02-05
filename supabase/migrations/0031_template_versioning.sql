-- Add versioning support to recurring templates
-- When a template is edited, the old version is deactivated and a new version is created
-- This preserves historical data and prevents retroactive changes

ALTER TABLE team_recurring_expenses
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES team_recurring_expenses(id),
ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS superseded_by_id UUID REFERENCES team_recurring_expenses(id);

-- Index for finding active (non-superseded) templates
CREATE INDEX IF NOT EXISTS idx_recurring_active_version
ON team_recurring_expenses(team_id, is_active)
WHERE superseded_at IS NULL AND is_active = true AND deleted_at IS NULL;

-- Index for version chains
CREATE INDEX IF NOT EXISTS idx_recurring_version_chain
ON team_recurring_expenses(previous_version_id)
WHERE previous_version_id IS NOT NULL;

COMMENT ON COLUMN team_recurring_expenses.version IS
'Version number, increments when template is edited';

COMMENT ON COLUMN team_recurring_expenses.previous_version_id IS
'Links to the previous version of this template (if edited)';

COMMENT ON COLUMN team_recurring_expenses.superseded_at IS
'Timestamp when this version was replaced by a newer version';

COMMENT ON COLUMN team_recurring_expenses.superseded_by_id IS
'ID of the template version that replaced this one';
