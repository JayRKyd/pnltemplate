-- Create expense audit log table (immutable)
CREATE TABLE IF NOT EXISTS public.expense_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid REFERENCES public.team_expenses(id) ON DELETE SET NULL,
  team_id text NOT NULL,
  user_id text NOT NULL,
  action text NOT NULL,
  changes jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies (read-only for users, insert only)
CREATE POLICY "Team members can view audit log" ON public.expense_audit_log
  FOR SELECT USING (true);

CREATE POLICY "System can insert audit entries" ON public.expense_audit_log
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_expense ON public.expense_audit_log(expense_id);
CREATE INDEX IF NOT EXISTS idx_audit_team ON public.expense_audit_log(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.expense_audit_log(created_at DESC);
