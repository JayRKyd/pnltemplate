-- Add GBP exchange rate column to exchange_rates table
-- The Bono forex API returns GBP/RON in addition to EUR/RON and USD/RON

ALTER TABLE public.exchange_rates
  ADD COLUMN IF NOT EXISTS gbp_to_ron numeric(10,6);

COMMENT ON COLUMN public.exchange_rates.gbp_to_ron
  IS 'GBP to RON exchange rate from Bono forex API';
