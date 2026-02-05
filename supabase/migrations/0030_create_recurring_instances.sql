-- Create recurring_instances table
-- This table tracks each monthly occurrence of a recurring expense
-- Each instance can be 'open' (waiting for document) or 'closed' (document received)

CREATE TABLE IF NOT EXISTS recurring_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL,
  template_id UUID NOT NULL REFERENCES team_recurring_expenses(id) ON DELETE CASCADE,

  -- Month identification (integers avoid timezone issues)
  instance_year INTEGER NOT NULL,
  instance_month INTEGER NOT NULL CHECK (instance_month >= 1 AND instance_month <= 12),

  -- Status: 'open' = waiting for document, 'closed' = document received
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),

  -- Snapshot of template values at generation time (immutable)
  expected_amount NUMERIC(12, 2) NOT NULL,
  expected_amount_without_vat NUMERIC(12, 2),
  expected_amount_with_vat NUMERIC(12, 2),
  expected_vat_rate NUMERIC(5, 2),
  expected_vat_deductible BOOLEAN DEFAULT false,
  expected_currency TEXT DEFAULT 'RON',
  expected_category_id UUID REFERENCES team_expense_categories(id),
  expected_subcategory_id UUID REFERENCES team_expense_categories(id),
  expected_supplier TEXT,
  expected_description TEXT,

  -- Link to final expense (NULL when open, populated when closed)
  final_expense_id UUID REFERENCES team_expenses(id) ON DELETE SET NULL,

  -- Closing metadata
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  amount_difference_percent NUMERIC(5, 2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one instance per template per month
  UNIQUE (template_id, instance_year, instance_month)
);

-- Indexes for performance
CREATE INDEX idx_ri_team ON recurring_instances(team_id);
CREATE INDEX idx_ri_template ON recurring_instances(template_id);
CREATE INDEX idx_ri_month ON recurring_instances(instance_year, instance_month);
CREATE INDEX idx_ri_status_team ON recurring_instances(team_id, status);
CREATE INDEX idx_ri_open ON recurring_instances(template_id) WHERE status = 'open';
CREATE INDEX idx_ri_final ON recurring_instances(final_expense_id) WHERE final_expense_id IS NOT NULL;

-- Update trigger
CREATE OR REPLACE FUNCTION update_recurring_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recurring_instances_updated_at
  BEFORE UPDATE ON recurring_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_instances_updated_at();

-- RLS Policies
ALTER TABLE recurring_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team recurring instances"
  ON recurring_instances FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their team recurring instances"
  ON recurring_instances FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE recurring_instances IS
'Monthly instances of recurring expenses. Each instance represents one month and can be open (waiting for document) or closed (document received).';
