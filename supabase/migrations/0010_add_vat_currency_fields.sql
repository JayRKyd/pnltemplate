-- Add VAT, currency, tags, and responsible fields to team_expenses
-- Per PRD: support VAT deductibility logic, multi-currency (RON/EUR/USD), tags, responsible person

ALTER TABLE public.team_expenses 
  ADD COLUMN IF NOT EXISTS vat_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS amount_with_vat numeric(19,4),
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'RON',
  ADD COLUMN IF NOT EXISTS eur_amount numeric(19,4),
  ADD COLUMN IF NOT EXISTS usd_amount numeric(19,4),
  ADD COLUMN IF NOT EXISTS exchange_rate numeric(10,6),
  ADD COLUMN IF NOT EXISTS responsible_id text,
  ADD COLUMN IF NOT EXISTS tags text[];

-- Update amount columns to use proper precision for financial data
ALTER TABLE public.team_expenses 
  ALTER COLUMN amount TYPE numeric(19,4),
  ALTER COLUMN amount_without_vat TYPE numeric(19,4);

-- Add comments for clarity
COMMENT ON COLUMN public.team_expenses.vat_rate IS 'VAT percentage (e.g., 19.00 for 19%)';
COMMENT ON COLUMN public.team_expenses.amount_with_vat IS 'Total amount including VAT';
COMMENT ON COLUMN public.team_expenses.amount_without_vat IS 'Net amount excluding VAT';
COMMENT ON COLUMN public.team_expenses.vat_deductible IS 'If true, P&L shows amount_without_vat; if false, shows amount_with_vat';
COMMENT ON COLUMN public.team_expenses.currency IS 'Original currency: RON, EUR, or USD';
COMMENT ON COLUMN public.team_expenses.eur_amount IS 'Amount converted to EUR at document date exchange rate';
COMMENT ON COLUMN public.team_expenses.exchange_rate IS 'BNR exchange rate on document date (RON per EUR)';
COMMENT ON COLUMN public.team_expenses.responsible_id IS 'User ID of person responsible for this expense';
COMMENT ON COLUMN public.team_expenses.tags IS 'Array of tags for filtering/categorization';

-- Index for responsible lookups
CREATE INDEX IF NOT EXISTS idx_team_expenses_responsible ON public.team_expenses(responsible_id);

-- GIN index for tags array search
CREATE INDEX IF NOT EXISTS idx_team_expenses_tags ON public.team_expenses USING GIN(tags);
