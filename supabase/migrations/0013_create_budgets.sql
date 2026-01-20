-- Budgets Table
-- Stores budget values per category/subcategory per month per year

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  
  -- Category reference
  category_id UUID REFERENCES expense_categories(id),
  subcategory_id UUID REFERENCES expense_categories(id),
  
  -- Monthly values (stored as JSONB for flexibility)
  -- Format: {"jan": 1000, "feb": 1200, ...}
  monthly_values JSONB NOT NULL DEFAULT '{}',
  
  -- Or individual columns for better querying:
  jan NUMERIC(12, 2) DEFAULT 0,
  feb NUMERIC(12, 2) DEFAULT 0,
  mar NUMERIC(12, 2) DEFAULT 0,
  apr NUMERIC(12, 2) DEFAULT 0,
  may NUMERIC(12, 2) DEFAULT 0,
  jun NUMERIC(12, 2) DEFAULT 0,
  jul NUMERIC(12, 2) DEFAULT 0,
  aug NUMERIC(12, 2) DEFAULT 0,
  sep NUMERIC(12, 2) DEFAULT 0,
  oct NUMERIC(12, 2) DEFAULT 0,
  nov NUMERIC(12, 2) DEFAULT 0,
  "dec" NUMERIC(12, 2) DEFAULT 0, -- dec is reserved word, use quotes
  
  -- Annual total (calculated)
  annual_total NUMERIC(14, 2) GENERATED ALWAYS AS (
    COALESCE(jan, 0) + COALESCE(feb, 0) + COALESCE(mar, 0) + 
    COALESCE(apr, 0) + COALESCE(may, 0) + COALESCE(jun, 0) + 
    COALESCE(jul, 0) + COALESCE(aug, 0) + COALESCE(sep, 0) + 
    COALESCE(oct, 0) + COALESCE(nov, 0) + COALESCE("dec", 0)
  ) STORED,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT,
  
  -- Unique constraint: one budget entry per category per year
  UNIQUE(team_id, year, category_id, subcategory_id)
);

-- Indexes
CREATE INDEX idx_budgets_team_year ON budgets(team_id, year);
CREATE INDEX idx_budgets_category ON budgets(category_id);
CREATE INDEX idx_budgets_subcategory ON budgets(subcategory_id);

-- Update trigger
CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_budgets_updated_at();

-- Revenue table for manual revenue entry
CREATE TABLE IF NOT EXISTS revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  
  -- Revenue data
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'RON',
  description TEXT,
  source TEXT, -- e.g., 'sales', 'services', 'other'
  
  -- Metadata
  entered_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One revenue entry per month per team (can be extended for multiple sources)
  UNIQUE(team_id, year, month, source)
);

-- Indexes
CREATE INDEX idx_revenues_team_year ON revenues(team_id, year);

-- Update trigger for revenues
CREATE TRIGGER revenues_updated_at
  BEFORE UPDATE ON revenues
  FOR EACH ROW
  EXECUTE FUNCTION update_budgets_updated_at();

-- Budget upload history (track imports)
CREATE TABLE IF NOT EXISTS budget_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  rows_imported INTEGER DEFAULT 0,
  rows_failed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_budget_uploads_team ON budget_uploads(team_id, year);

-- Function to get P&L summary for a team/year
CREATE OR REPLACE FUNCTION get_pnl_summary(
  p_team_id TEXT,
  p_year INTEGER
)
RETURNS TABLE(
  month INTEGER,
  revenue NUMERIC,
  expenses NUMERIC,
  budget NUMERIC,
  profit NUMERIC,
  delta NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_expenses AS (
    SELECT 
      EXTRACT(MONTH FROM expense_date::DATE)::INTEGER as m,
      SUM(
        CASE 
          WHEN vat_deductible THEN COALESCE(amount_without_vat, amount)
          ELSE COALESCE(amount_with_vat, amount)
        END
      ) as total
    FROM team_expenses
    WHERE team_id = p_team_id
      AND EXTRACT(YEAR FROM expense_date::DATE) = p_year
      AND deleted_at IS NULL
      AND status NOT IN ('draft', 'rejected')
    GROUP BY EXTRACT(MONTH FROM expense_date::DATE)
  ),
  monthly_revenues AS (
    SELECT 
      r.month as m,
      SUM(r.amount) as total
    FROM revenues r
    WHERE r.team_id = p_team_id
      AND r.year = p_year
    GROUP BY r.month
  ),
  monthly_budgets AS (
    SELECT 
      m.month_num as m,
      SUM(
        CASE m.month_num
          WHEN 1 THEN b.jan
          WHEN 2 THEN b.feb
          WHEN 3 THEN b.mar
          WHEN 4 THEN b.apr
          WHEN 5 THEN b.may
          WHEN 6 THEN b.jun
          WHEN 7 THEN b.jul
          WHEN 8 THEN b.aug
          WHEN 9 THEN b.sep
          WHEN 10 THEN b.oct
          WHEN 11 THEN b.nov
          WHEN 12 THEN b."dec"
        END
      ) as total
    FROM budgets b
    CROSS JOIN (SELECT generate_series(1, 12) as month_num) m
    WHERE b.team_id = p_team_id
      AND b.year = p_year
    GROUP BY m.month_num
  )
  SELECT 
    m.month_num::INTEGER as month,
    COALESCE(mr.total, 0) as revenue,
    COALESCE(me.total, 0) as expenses,
    COALESCE(mb.total, 0) as budget,
    COALESCE(mr.total, 0) - COALESCE(me.total, 0) as profit,
    COALESCE(mb.total, 0) - COALESCE(me.total, 0) as delta
  FROM (SELECT generate_series(1, 12) as month_num) m
  LEFT JOIN monthly_expenses me ON me.m = m.month_num
  LEFT JOIN monthly_revenues mr ON mr.m = m.month_num
  LEFT JOIN monthly_budgets mb ON mb.m = m.month_num
  ORDER BY m.month_num;
END;
$$ LANGUAGE plpgsql;

-- Function to get expenses grouped by category for P&L
CREATE OR REPLACE FUNCTION get_expenses_by_category(
  p_team_id TEXT,
  p_year INTEGER,
  p_month INTEGER DEFAULT NULL
)
RETURNS TABLE(
  category_id UUID,
  category_name TEXT,
  subcategory_id UUID,
  subcategory_name TEXT,
  total_amount NUMERIC,
  expense_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as category_id,
    c.name as category_name,
    sc.id as subcategory_id,
    sc.name as subcategory_name,
    SUM(
      CASE 
        WHEN e.vat_deductible THEN COALESCE(e.amount_without_vat, e.amount)
        ELSE COALESCE(e.amount_with_vat, e.amount)
      END
    ) as total_amount,
    COUNT(e.id) as expense_count
  FROM team_expenses e
  LEFT JOIN expense_categories sc ON e.subcategory_id = sc.id
  LEFT JOIN expense_categories c ON sc.parent_id = c.id OR e.category_id = c.id
  WHERE e.team_id = p_team_id
    AND EXTRACT(YEAR FROM e.expense_date::DATE) = p_year
    AND (p_month IS NULL OR EXTRACT(MONTH FROM e.expense_date::DATE) = p_month)
    AND e.deleted_at IS NULL
    AND e.status NOT IN ('draft', 'rejected')
  GROUP BY c.id, c.name, sc.id, sc.name
  ORDER BY c.name, sc.name;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team budgets"
  ON budgets FOR SELECT USING (true);

CREATE POLICY "Users can manage their team budgets"
  ON budgets FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their team revenues"
  ON revenues FOR SELECT USING (true);

CREATE POLICY "Users can manage their team revenues"
  ON revenues FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their team budget uploads"
  ON budget_uploads FOR SELECT USING (true);

CREATE POLICY "Users can manage their team budget uploads"
  ON budget_uploads FOR ALL USING (true) WITH CHECK (true);
