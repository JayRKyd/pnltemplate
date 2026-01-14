-- Create hierarchical expense categories table
CREATE TABLE IF NOT EXISTS public.team_expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES public.team_expense_categories(id) ON DELETE CASCADE,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, name, parent_id)
);

-- Enable RLS
ALTER TABLE public.team_expense_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Team members can view categories" ON public.team_expense_categories
  FOR SELECT USING (true);

CREATE POLICY "Team members can manage categories" ON public.team_expense_categories
  FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expense_categories_team ON public.team_expense_categories(team_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_parent ON public.team_expense_categories(parent_id);

-- Add foreign keys to team_expenses for categories
ALTER TABLE public.team_expenses 
  ADD CONSTRAINT fk_expense_category 
  FOREIGN KEY (category_id) REFERENCES public.team_expense_categories(id);

ALTER TABLE public.team_expenses 
  ADD CONSTRAINT fk_expense_subcategory 
  FOREIGN KEY (subcategory_id) REFERENCES public.team_expense_categories(id);
