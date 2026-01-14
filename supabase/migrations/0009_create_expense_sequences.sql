-- Create expense ID sequences per team
CREATE TABLE IF NOT EXISTS public.team_expense_sequences (
  team_id text PRIMARY KEY,
  last_number int DEFAULT 0,
  prefix text DEFAULT 'EXP',
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_expense_sequences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Teams can manage their sequence" ON public.team_expense_sequences
  FOR ALL USING (true);

-- Function to get next expense ID
CREATE OR REPLACE FUNCTION get_next_expense_id(p_team_id text)
RETURNS text AS $$
DECLARE
  v_number int;
  v_prefix text;
BEGIN
  -- Insert or update sequence
  INSERT INTO public.team_expense_sequences (team_id, last_number, prefix)
  VALUES (p_team_id, 1, 'EXP')
  ON CONFLICT (team_id) 
  DO UPDATE SET 
    last_number = team_expense_sequences.last_number + 1,
    updated_at = now()
  RETURNING last_number, prefix INTO v_number, v_prefix;
  
  -- Return formatted ID (EXP-001)
  RETURN v_prefix || '-' || LPAD(v_number::text, 3, '0');
END;
$$ LANGUAGE plpgsql;
