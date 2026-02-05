-- Migrate existing recurring placeholders to instance-based system
-- This migration is safe to run multiple times (uses ON CONFLICT)

DO $$
DECLARE
  v_migrated_instances INTEGER := 0;
  v_updated_expenses INTEGER := 0;
BEGIN
  -- Step 1: Create instances from existing placeholder expenses
  INSERT INTO recurring_instances (
    team_id,
    template_id,
    instance_year,
    instance_month,
    status,
    expected_amount,
    expected_amount_without_vat,
    expected_amount_with_vat,
    expected_vat_rate,
    expected_vat_deductible,
    expected_currency,
    expected_category_id,
    expected_subcategory_id,
    expected_supplier,
    expected_description,
    final_expense_id,
    closed_at,
    created_at
  )
  SELECT
    te.team_id,
    te.recurring_expense_id,
    EXTRACT(YEAR FROM te.expense_date)::INTEGER,
    EXTRACT(MONTH FROM te.expense_date)::INTEGER,
    -- If expense is paid/approved/final, instance is closed
    CASE
      WHEN te.status IN ('approved', 'paid', 'final')
        OR te.payment_status = 'paid'
      THEN 'closed'
      ELSE 'open'
    END,
    COALESCE(te.amount, 0),
    te.amount_without_vat,
    te.amount_with_vat,
    te.vat_rate,
    te.vat_deductible,
    COALESCE(te.currency, 'RON'),
    te.category_id,
    te.subcategory_id,
    te.supplier,
    te.description,
    -- Link to final expense if closed
    CASE
      WHEN te.status IN ('approved', 'paid', 'final')
        OR te.payment_status = 'paid'
      THEN te.id
      ELSE NULL
    END,
    -- Closed timestamp
    CASE
      WHEN te.status IN ('approved', 'paid', 'final')
        OR te.payment_status = 'paid'
      THEN COALESCE(te.paid_at, te.approved_at, te.updated_at)
      ELSE NULL
    END,
    te.created_at
  FROM team_expenses te
  WHERE te.recurring_expense_id IS NOT NULL
    AND te.deleted_at IS NULL
  ON CONFLICT (template_id, instance_year, instance_month) DO NOTHING;

  GET DIAGNOSTICS v_migrated_instances = ROW_COUNT;

  -- Step 2: Update expenses to link back to instances
  UPDATE team_expenses te
  SET recurring_instance_id = ri.id
  FROM recurring_instances ri
  WHERE te.recurring_expense_id = ri.template_id
    AND EXTRACT(YEAR FROM te.expense_date)::INTEGER = ri.instance_year
    AND EXTRACT(MONTH FROM te.expense_date)::INTEGER = ri.instance_month
    AND te.deleted_at IS NULL
    AND te.recurring_instance_id IS NULL;  -- Only update if not already set

  GET DIAGNOSTICS v_updated_expenses = ROW_COUNT;

  -- Log results
  RAISE NOTICE 'Migration complete: % instances created/updated, % expenses linked',
    v_migrated_instances, v_updated_expenses;
END $$;

-- Create instances for current and next month for all active templates
-- This ensures templates have instances ready to work with
DO $$
DECLARE
  v_current_month DATE := DATE_TRUNC('month', CURRENT_DATE);
  v_next_month DATE := v_current_month + INTERVAL '1 month';
  v_count INTEGER;
BEGIN
  -- Generate for current month
  SELECT generate_all_recurring_instances(v_current_month) INTO v_count;
  RAISE NOTICE 'Generated instances for current month across all teams';

  -- Generate for next month
  SELECT generate_all_recurring_instances(v_next_month) INTO v_count;
  RAISE NOTICE 'Generated instances for next month across all teams';
END $$;

COMMENT ON COLUMN team_expenses.recurring_expense_id IS
'DEPRECATED: Legacy link to template. Use recurring_instance_id instead.';

COMMENT ON COLUMN team_expenses.is_recurring_placeholder IS
'DEPRECATED: Legacy flag. Check if recurring_instance_id IS NOT NULL instead.';
