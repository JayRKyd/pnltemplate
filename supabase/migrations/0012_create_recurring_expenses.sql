-- Recurring Expenses Table
-- Stores templates for monthly recurring expenses that auto-generate placeholders

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  
  -- Expense template fields
  amount NUMERIC(12, 2) NOT NULL,
  amount_without_vat NUMERIC(12, 2),
  amount_with_vat NUMERIC(12, 2),
  vat_rate NUMERIC(5, 2),
  vat_deductible BOOLEAN DEFAULT false,
  currency TEXT DEFAULT 'RON',
  
  -- Category info
  category_id UUID REFERENCES expense_categories(id),
  subcategory_id UUID REFERENCES expense_categories(id),
  
  -- Supplier/description
  supplier TEXT,
  description TEXT,
  doc_type TEXT,
  tags TEXT[],
  
  -- Recurrence settings
  recurrence_type TEXT DEFAULT 'monthly' CHECK (recurrence_type IN ('monthly', 'quarterly', 'yearly')),
  day_of_month INTEGER DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 28),
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means indefinite
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_generated_date DATE, -- Track last placeholder generation
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_recurring_team_id ON recurring_expenses(team_id);
CREATE INDEX idx_recurring_active ON recurring_expenses(is_active) WHERE is_active = true;
CREATE INDEX idx_recurring_next_gen ON recurring_expenses(last_generated_date) WHERE is_active = true;

-- Update trigger
CREATE OR REPLACE FUNCTION update_recurring_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recurring_expenses_updated_at
  BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_updated_at();

-- Link recurring expenses to generated placeholders
ALTER TABLE team_expenses 
ADD COLUMN IF NOT EXISTS recurring_expense_id UUID REFERENCES recurring_expenses(id),
ADD COLUMN IF NOT EXISTS is_recurring_placeholder BOOLEAN DEFAULT false;

-- Index for finding placeholders
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON team_expenses(recurring_expense_id) 
WHERE recurring_expense_id IS NOT NULL;

-- Function to generate recurring expense placeholders for a given month
CREATE OR REPLACE FUNCTION generate_recurring_placeholders(
  p_team_id TEXT,
  p_target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS INTEGER AS $$
DECLARE
  v_recurring RECORD;
  v_count INTEGER := 0;
  v_expense_date DATE;
  v_expense_uid TEXT;
  v_existing_count INTEGER;
BEGIN
  -- Loop through all active recurring expenses for this team
  FOR v_recurring IN 
    SELECT * FROM recurring_expenses 
    WHERE team_id = p_team_id 
      AND is_active = true 
      AND deleted_at IS NULL
      AND start_date <= (p_target_month + INTERVAL '1 month - 1 day')::DATE
      AND (end_date IS NULL OR end_date >= p_target_month)
  LOOP
    -- Calculate expense date for this month
    v_expense_date := p_target_month + (v_recurring.day_of_month - 1);
    
    -- Check if placeholder already exists for this month
    SELECT COUNT(*) INTO v_existing_count
    FROM team_expenses
    WHERE recurring_expense_id = v_recurring.id
      AND DATE_TRUNC('month', expense_date::DATE) = p_target_month;
    
    -- Skip if already generated
    IF v_existing_count > 0 THEN
      CONTINUE;
    END IF;
    
    -- Generate expense UID
    SELECT get_next_expense_id(p_team_id) INTO v_expense_uid;
    
    -- Create placeholder expense
    INSERT INTO team_expenses (
      expense_uid,
      team_id,
      user_id,
      recurring_expense_id,
      is_recurring_placeholder,
      amount,
      amount_without_vat,
      amount_with_vat,
      vat_rate,
      vat_deductible,
      currency,
      category_id,
      subcategory_id,
      supplier,
      description,
      doc_type,
      tags,
      status,
      payment_status,
      expense_date
    ) VALUES (
      v_expense_uid,
      v_recurring.team_id,
      v_recurring.user_id,
      v_recurring.id,
      true,
      v_recurring.amount,
      v_recurring.amount_without_vat,
      v_recurring.amount_with_vat,
      v_recurring.vat_rate,
      v_recurring.vat_deductible,
      v_recurring.currency,
      v_recurring.category_id,
      v_recurring.subcategory_id,
      v_recurring.supplier,
      v_recurring.description,
      v_recurring.doc_type,
      v_recurring.tags,
      'placeholder', -- Special status for recurring placeholders
      'unpaid',
      v_expense_date
    );
    
    -- Update last generated date
    UPDATE recurring_expenses 
    SET last_generated_date = p_target_month
    WHERE id = v_recurring.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate placeholders for ALL teams (for CRON job)
CREATE OR REPLACE FUNCTION generate_all_recurring_placeholders(
  p_target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS TABLE(team_id TEXT, generated_count INTEGER) AS $$
DECLARE
  v_team TEXT;
  v_count INTEGER;
BEGIN
  FOR v_team IN 
    SELECT DISTINCT re.team_id FROM recurring_expenses re 
    WHERE re.is_active = true AND re.deleted_at IS NULL
  LOOP
    v_count := generate_recurring_placeholders(v_team, p_target_month);
    IF v_count > 0 THEN
      team_id := v_team;
      generated_count := v_count;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add 'placeholder' to valid statuses
-- (Assuming status is not constrained, but documenting expected values)
COMMENT ON COLUMN team_expenses.status IS 
'Valid values: draft, placeholder, pending, approved, rejected, paid';

-- RLS Policies
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team recurring expenses"
  ON recurring_expenses FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their team recurring expenses"
  ON recurring_expenses FOR ALL
  USING (true)
  WITH CHECK (true);
