-- Enhance team_expenses table with additional fields
ALTER TABLE public.team_expenses 
  ADD COLUMN IF NOT EXISTS expense_uid text UNIQUE,
  ADD COLUMN IF NOT EXISTS parent_expense_id uuid REFERENCES public.team_expenses(id),
  ADD COLUMN IF NOT EXISTS doc_number text,
  ADD COLUMN IF NOT EXISTS doc_type text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS amount_without_vat numeric,
  ADD COLUMN IF NOT EXISTS vat_deductible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS accounting_period text,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS subcategory_id uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_team_expenses_expense_uid ON public.team_expenses(expense_uid);
CREATE INDEX IF NOT EXISTS idx_team_expenses_parent_id ON public.team_expenses(parent_expense_id);
CREATE INDEX IF NOT EXISTS idx_team_expenses_status ON public.team_expenses(status);
CREATE INDEX IF NOT EXISTS idx_team_expenses_category ON public.team_expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_team_expenses_deleted ON public.team_expenses(deleted_at);
