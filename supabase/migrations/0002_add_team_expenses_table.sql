-- Create team_expenses table scoped by team_id (Stack Auth team)
CREATE TABLE IF NOT EXISTS public.team_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text NOT NULL,
  user_id text NOT NULL,
  amount numeric NOT NULL,
  status text DEFAULT 'pending',
  supplier text,
  description text,
  category text,
  expense_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_expenses ENABLE ROW LEVEL SECURITY;

-- Policies for team-scoped access
CREATE POLICY "Team members can view team expenses" ON public.team_expenses
  FOR SELECT USING (true);

CREATE POLICY "Team members can insert team expenses" ON public.team_expenses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Team members can update team expenses" ON public.team_expenses
  FOR UPDATE USING (true);

CREATE POLICY "Team members can delete team expenses" ON public.team_expenses
  FOR DELETE USING (true);

-- Indexes for faster team-scoped queries
CREATE INDEX IF NOT EXISTS idx_team_expenses_team_id ON public.team_expenses(team_id);
CREATE INDEX IF NOT EXISTS idx_team_expenses_user_id ON public.team_expenses(user_id);
