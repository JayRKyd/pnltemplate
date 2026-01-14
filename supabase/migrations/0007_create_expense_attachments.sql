-- Create expense attachments table
CREATE TABLE IF NOT EXISTS public.expense_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.team_expenses(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size int,
  uploaded_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view attachments" ON public.expense_attachments
  FOR SELECT USING (true);

CREATE POLICY "Users can upload attachments" ON public.expense_attachments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own attachments" ON public.expense_attachments
  FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attachments_expense ON public.expense_attachments(expense_id);
