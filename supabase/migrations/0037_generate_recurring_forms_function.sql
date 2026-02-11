-- Create generate_recurring_forms function that writes RE-Forms directly to team_expenses
-- This replaces the old generate_recurring_instances which wrote to the deprecated recurring_instances table
-- Each RE-Form is a team_expenses row with status='recurent' and recurring_expense_id set to the template

CREATE OR REPLACE FUNCTION generate_recurring_forms(
  p_team_id TEXT,
  p_target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS INTEGER AS $$
DECLARE
  v_template RECORD;
  v_count INTEGER := 0;
  v_year INTEGER;
  v_month INTEGER;
  v_existing_count INTEGER;
  v_month_label TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM p_target_month)::INTEGER;
  v_month := EXTRACT(MONTH FROM p_target_month)::INTEGER;
  v_month_label := v_year::TEXT || '-' || LPAD(v_month::TEXT, 2, '0');

  -- Loop through all active, non-superseded recurring templates for this team
  FOR v_template IN
    SELECT * FROM team_recurring_expenses
    WHERE team_id = p_team_id
      AND is_active = true
      AND deleted_at IS NULL
      AND superseded_at IS NULL
      AND start_date <= (p_target_month + INTERVAL '1 month - 1 day')::DATE
      AND (end_date IS NULL OR end_date >= p_target_month)
  LOOP
    -- Check if a RE-Form already exists for this template+month in team_expenses
    SELECT COUNT(*) INTO v_existing_count
    FROM team_expenses
    WHERE recurring_expense_id = v_template.id
      AND accounting_period = v_month_label
      AND deleted_at IS NULL;

    IF v_existing_count > 0 THEN
      CONTINUE;
    END IF;

    -- Create RE-Form as a team_expenses row with status 'recurent'
    INSERT INTO team_expenses (
      team_id,
      user_id,
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
      status,
      payment_status,
      expense_date,
      accounting_period,
      recurring_expense_id,
      is_recurring_placeholder,
      tags
    ) VALUES (
      v_template.team_id,
      v_template.user_id,
      COALESCE(v_template.amount, 0),
      v_template.amount_without_vat,
      v_template.amount_with_vat,
      v_template.vat_rate,
      v_template.vat_deductible,
      COALESCE(v_template.currency, 'RON'),
      v_template.category_id,
      v_template.subcategory_id,
      v_template.supplier,
      v_template.description,
      'recurent',
      'unpaid',
      p_target_month,
      v_month_label,
      v_template.id,
      true,
      v_template.tags
    );

    -- Update last generated date on template
    UPDATE team_recurring_expenses
    SET last_generated_date = p_target_month
    WHERE id = v_template.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate RE-Forms for ALL teams (for cron job)
CREATE OR REPLACE FUNCTION generate_all_recurring_forms(
  p_target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS TABLE(team_id TEXT, generated_count INTEGER) AS $$
DECLARE
  v_team TEXT;
  v_count INTEGER;
BEGIN
  FOR v_team IN
    SELECT DISTINCT tre.team_id
    FROM team_recurring_expenses tre
    WHERE tre.is_active = true
      AND tre.deleted_at IS NULL
      AND tre.superseded_at IS NULL
  LOOP
    v_count := generate_recurring_forms(v_team, p_target_month);
    IF v_count > 0 THEN
      team_id := v_team;
      generated_count := v_count;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_recurring_forms IS
'Generates monthly RE-Forms (team_expenses with status=recurent) for a team. Call at the start of each month.';

COMMENT ON FUNCTION generate_all_recurring_forms IS
'Generates RE-Forms for all teams. Use with pg_cron or an API endpoint for monthly automation.';
