-- Replace placeholder generation function to create instances instead of expenses
-- This function is called monthly (via cron or manual trigger) to generate instances

CREATE OR REPLACE FUNCTION generate_recurring_instances(
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
BEGIN
  -- Extract year and month as integers
  v_year := EXTRACT(YEAR FROM p_target_month)::INTEGER;
  v_month := EXTRACT(MONTH FROM p_target_month)::INTEGER;

  -- Loop through all active, non-superseded recurring templates
  FOR v_template IN
    SELECT * FROM team_recurring_expenses
    WHERE team_id = p_team_id
      AND is_active = true
      AND deleted_at IS NULL
      AND superseded_at IS NULL  -- Only active version
      AND start_date <= (p_target_month + INTERVAL '1 month - 1 day')::DATE
      AND (end_date IS NULL OR end_date >= p_target_month)
  LOOP
    -- Check if instance already exists for this month
    SELECT COUNT(*) INTO v_existing_count
    FROM recurring_instances
    WHERE template_id = v_template.id
      AND instance_year = v_year
      AND instance_month = v_month;

    -- Skip if already generated
    IF v_existing_count > 0 THEN
      CONTINUE;
    END IF;

    -- Create instance with snapshot of template values
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
      expected_description
    ) VALUES (
      v_template.team_id,
      v_template.id,
      v_year,
      v_month,
      'open',  -- Always starts as open
      v_template.amount,
      v_template.amount_without_vat,
      v_template.amount_with_vat,
      v_template.vat_rate,
      v_template.vat_deductible,
      v_template.currency,
      v_template.category_id,
      v_template.subcategory_id,
      v_template.supplier,
      v_template.description
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

-- Function to generate instances for ALL teams (for CRON job)
CREATE OR REPLACE FUNCTION generate_all_recurring_instances(
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
    v_count := generate_recurring_instances(v_team, p_target_month);
    IF v_count > 0 THEN
      team_id := v_team;
      generated_count := v_count;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_recurring_instances IS
'Generates monthly recurring instances for a team. Call this at the start of each month.';

COMMENT ON FUNCTION generate_all_recurring_instances IS
'Generates instances for all teams. Use with pg_cron for automation.';
