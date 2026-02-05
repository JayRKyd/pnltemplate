-- Add link from expenses to recurring instances
-- This allows final expenses to reference which instance they close

ALTER TABLE team_expenses
ADD COLUMN IF NOT EXISTS recurring_instance_id UUID REFERENCES recurring_instances(id) ON DELETE SET NULL;

-- Index for finding expenses by instance
CREATE INDEX IF NOT EXISTS idx_expenses_recurring_instance
ON team_expenses(recurring_instance_id)
WHERE recurring_instance_id IS NOT NULL;

COMMENT ON COLUMN team_expenses.recurring_instance_id IS
'Links to the recurring instance that this expense closes/finalizes';
