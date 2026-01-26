-- Add category_type column to team_expense_categories
-- This distinguishes between 'venituri' (revenue) and 'cheltuieli' (expenses) categories

ALTER TABLE public.team_expense_categories 
ADD COLUMN IF NOT EXISTS category_type TEXT DEFAULT 'cheltuieli';

-- Add check constraint
ALTER TABLE public.team_expense_categories
ADD CONSTRAINT check_category_type 
CHECK (category_type IN ('venituri', 'cheltuieli'));

-- Create index for filtering by type
CREATE INDEX IF NOT EXISTS idx_expense_categories_type 
ON public.team_expense_categories(category_type);

-- Update existing categories to default to 'cheltuieli' if null
UPDATE public.team_expense_categories 
SET category_type = 'cheltuieli' 
WHERE category_type IS NULL;
