-- Fix recurring_expenses table references
-- The original migration referenced expense_categories which doesn't exist
-- The actual table is team_expense_categories

-- First, drop the foreign key constraints if they exist (they might have failed)
ALTER TABLE IF EXISTS recurring_expenses 
  DROP CONSTRAINT IF EXISTS recurring_expenses_category_id_fkey;

ALTER TABLE IF EXISTS recurring_expenses 
  DROP CONSTRAINT IF EXISTS recurring_expenses_subcategory_id_fkey;

-- Recreate with correct references to team_expense_categories
-- Note: This will fail if the original constraints don't exist, which is fine
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_expenses') THEN
    -- Add correct foreign key constraints
    BEGIN
      ALTER TABLE recurring_expenses 
        ADD CONSTRAINT recurring_expenses_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES team_expense_categories(id) ON DELETE SET NULL;
    EXCEPTION WHEN others THEN
      -- Constraint might already exist or reference different table
      NULL;
    END;
    
    BEGIN
      ALTER TABLE recurring_expenses 
        ADD CONSTRAINT recurring_expenses_subcategory_id_fkey 
        FOREIGN KEY (subcategory_id) REFERENCES team_expense_categories(id) ON DELETE SET NULL;
    EXCEPTION WHEN others THEN
      -- Constraint might already exist or reference different table
      NULL;
    END;
  END IF;
END $$;
