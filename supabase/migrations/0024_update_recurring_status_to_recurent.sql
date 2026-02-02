-- Update recurring expense status from 'placeholder' to 'recurent'
-- This ensures recurring expenses show in Cheltuieli tab with the pink 'Recurent' badge

-- 1. Update the generate_recurring_placeholders function to use 'recurent' status
CREATE OR REPLACE FUNCTION generate_recurring_placeholders(
  p_team_id TEXT,
  p_target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS INTEGER AS $$
DECLARE
  v_recurring RECORD;
  v_count INTEGER := 0;
  v_expense_date DATE;
  v_expense_uid TEXT;
  v_existing_count INTEGER;
BEGIN
  -- Loop through all active recurring expenses for this team
  FOR v_recurring IN
    SELECT * FROM team_recurring_expenses
    WHERE team_id = p_team_id
      AND is_active = true
      AND deleted_at IS NULL
      AND start_date <= (p_target_month + INTERVAL '1 month - 1 day')::DATE
      AND (end_date IS NULL OR end_date >= p_target_month)
  LOOP
    -- Calculate expense date for this month
    v_expense_date := p_target_month + (v_recurring.day_of_month - 1);

    -- Check if placeholder already exists for this month
    SELECT COUNT(*) INTO v_existing_count
    FROM team_expenses
    WHERE recurring_expense_id = v_recurring.id
      AND DATE_TRUNC('month', expense_date::DATE) = p_target_month;

    -- Skip if already generated
    IF v_existing_count > 0 THEN
      CONTINUE;
    END IF;

    -- Generate expense UID
    SELECT get_next_expense_id(p_team_id) INTO v_expense_uid;

    -- Create recurring expense entry with 'recurent' status (shows pink badge in Cheltuieli)
    INSERT INTO team_expenses (
      expense_uid,
      team_id,
      user_id,
      recurring_expense_id,
      is_recurring_placeholder,
      amount,
      amount_without_vat,
      amount_with_vat,
      vat_rate,
      vat_deductible,
      currency,
      category_id,
      subcategory_id,
      supplier,
      description,
      doc_type,
      tags,
      status,
      payment_status,
      expense_date
    ) VALUES (
      v_expense_uid,
      v_recurring.team_id,
      v_recurring.user_id,
      v_recurring.id,
      true,
      v_recurring.amount,
      v_recurring.amount_without_vat,
      v_recurring.amount_with_vat,
      v_recurring.vat_rate,
      v_recurring.vat_deductible,
      v_recurring.currency,
      v_recurring.category_id,
      v_recurring.subcategory_id,
      v_recurring.supplier,
      v_recurring.description,
      v_recurring.doc_type,
      v_recurring.tags,
      'recurent', -- Changed from 'placeholder' to 'recurent' - shows pink badge
      'unpaid',
      v_expense_date
    );

    -- Update last generated date
    UPDATE team_recurring_expenses
    SET last_generated_date = p_target_month
    WHERE id = v_recurring.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 2. Update the generate_all_recurring_placeholders function to use correct table name
CREATE OR REPLACE FUNCTION generate_all_recurring_placeholders(
  p_target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS TABLE(team_id TEXT, generated_count INTEGER) AS $$
DECLARE
  v_team TEXT;
  v_count INTEGER;
BEGIN
  FOR v_team IN
    SELECT DISTINCT re.team_id FROM team_recurring_expenses re
    WHERE re.is_active = true AND re.deleted_at IS NULL
  LOOP
    v_count := generate_recurring_placeholders(v_team, p_target_month);
    IF v_count > 0 THEN
      team_id := v_team;
      generated_count := v_count;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Update existing 'placeholder' status entries to 'recurent'
UPDATE team_expenses
SET status = 'recurent'
WHERE status = 'placeholder'
  AND recurring_expense_id IS NOT NULL
  AND is_recurring_placeholder = true
  AND deleted_at IS NULL;

-- 4. Update comment to reflect valid statuses
COMMENT ON COLUMN team_expenses.status IS
'Valid values: draft, recurent, pending, approved, rejected, paid, final';
