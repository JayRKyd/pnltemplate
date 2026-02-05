-- Update P&L aggregation to use instance/final logic
-- P&L shows exactly ONE value per month per template:
--   - If instance is closed: show final expense amount
--   - If instance is open: show expected (recurring) amount

CREATE OR REPLACE FUNCTION get_pnl_aggregated(
  p_team_id UUID,
  p_base_year INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_prev_year INTEGER := p_base_year - 1;
  v_result JSON;
BEGIN
  -- Build unified expense view
  WITH pnl_expenses AS (
    -- 1. Final expenses from closed recurring instances
    SELECT
      te.id,
      te.expense_date,
      te.accounting_period,
      te.amount,
      te.amount_without_vat,
      te.amount_with_vat,
      te.vat_deductible,
      te.category_id,
      te.subcategory_id,
      te.supplier,
      te.description,
      te.doc_number,
      te.status,
      'final' as source_type,
      true as is_recurring_related
    FROM team_expenses te
    JOIN recurring_instances ri ON te.id = ri.final_expense_id
    WHERE te.team_id = p_team_id
      AND te.deleted_at IS NULL
      AND ri.status = 'closed'

    UNION ALL

    -- 2. Open recurring instances (expected amounts)
    SELECT
      ri.id::text as id,
      make_date(ri.instance_year, ri.instance_month, 1) as expense_date,
      TO_CHAR(make_date(ri.instance_year, ri.instance_month, 1), 'YYYY-MM') as accounting_period,
      ri.expected_amount as amount,
      ri.expected_amount_without_vat as amount_without_vat,
      ri.expected_amount_with_vat as amount_with_vat,
      ri.expected_vat_deductible as vat_deductible,
      ri.expected_category_id as category_id,
      ri.expected_subcategory_id as subcategory_id,
      ri.expected_supplier as supplier,
      ri.expected_description as description,
      NULL as doc_number,
      'recurent' as status,
      'recurring' as source_type,
      true as is_recurring_related
    FROM recurring_instances ri
    WHERE ri.team_id = p_team_id
      AND ri.status = 'open'

    UNION ALL

    -- 3. Regular expenses (not part of recurring system)
    SELECT
      te.id,
      te.expense_date,
      te.accounting_period,
      te.amount,
      te.amount_without_vat,
      te.amount_with_vat,
      te.vat_deductible,
      te.category_id,
      te.subcategory_id,
      te.supplier,
      te.description,
      te.doc_number,
      te.status,
      'regular' as source_type,
      false as is_recurring_related
    FROM team_expenses te
    WHERE te.team_id = p_team_id
      AND te.deleted_at IS NULL
      AND te.recurring_instance_id IS NULL
      AND te.recurring_expense_id IS NULL
      AND te.status IN ('approved', 'paid', 'pending', 'draft', 'final')
  ),

  -- Calculate monthly totals
  monthly_totals AS (
    SELECT
      CASE
        WHEN accounting_period IS NOT NULL THEN
          EXTRACT(YEAR FROM TO_DATE(accounting_period, 'YYYY-MM'))::INTEGER
        ELSE
          EXTRACT(YEAR FROM expense_date)::INTEGER
      END as expense_year,
      CASE
        WHEN accounting_period IS NOT NULL THEN
          EXTRACT(MONTH FROM TO_DATE(accounting_period, 'YYYY-MM'))::INTEGER
        ELSE
          EXTRACT(MONTH FROM expense_date)::INTEGER
      END as expense_month,
      CASE
        WHEN vat_deductible = true THEN
          COALESCE(amount_without_vat, amount, 0)
        ELSE
          COALESCE(amount_with_vat, amount, 0)
      END as total_amount,
      category_id,
      subcategory_id
    FROM pnl_expenses
    WHERE (
      (accounting_period IS NOT NULL AND accounting_period >= v_prev_year::text || '-01' AND accounting_period <= p_base_year::text || '-12')
      OR
      (accounting_period IS NULL AND expense_date >= (v_prev_year || '-01-01')::DATE AND expense_date <= (p_base_year || '-12-31')::DATE)
    )
  )

  -- Aggregate and return JSON
  SELECT json_build_object(
    'cheltuieli', (
      SELECT json_agg(COALESCE(month_total, 0) ORDER BY month_idx)
      FROM generate_series(0, 23) AS month_idx
      LEFT JOIN (
        SELECT
          CASE WHEN expense_year = v_prev_year THEN expense_month - 1 ELSE expense_month + 11 END as idx,
          SUM(total_amount) as month_total
        FROM monthly_totals
        GROUP BY expense_year, expense_month
      ) totals ON totals.idx = month_idx
    ),
    'categories', (
      SELECT json_agg(
        json_build_object(
          'id', cat.id,
          'name', cat.name,
          'values', cat_values,
          'subcategories', subcats
        )
      )
      FROM team_expense_categories cat
      WHERE cat.team_id = p_team_id
        AND cat.is_active = true
        AND cat.parent_id IS NULL
        AND cat.category_type = 'cheltuieli'
      CROSS JOIN LATERAL (
        -- Category monthly values
        SELECT json_agg(COALESCE(month_total, 0) ORDER BY month_idx) as cat_values
        FROM generate_series(0, 23) AS month_idx
        LEFT JOIN (
          SELECT
            CASE WHEN expense_year = v_prev_year THEN expense_month - 1 ELSE expense_month + 11 END as idx,
            SUM(total_amount) as month_total
          FROM monthly_totals
          WHERE category_id = cat.id OR subcategory_id IN (
            SELECT id FROM team_expense_categories WHERE parent_id = cat.id
          )
          GROUP BY expense_year, expense_month
        ) totals ON totals.idx = month_idx
      ) cat_vals
      CROSS JOIN LATERAL (
        -- Subcategories
        SELECT json_agg(
          json_build_object(
            'id', sub.id,
            'name', sub.name,
            'values', sub_values
          )
        ) as subcats
        FROM team_expense_categories sub
        WHERE sub.parent_id = cat.id AND sub.is_active = true
        CROSS JOIN LATERAL (
          SELECT json_agg(COALESCE(month_total, 0) ORDER BY month_idx) as sub_values
          FROM generate_series(0, 23) AS month_idx
          LEFT JOIN (
            SELECT
              CASE WHEN expense_year = v_prev_year THEN expense_month - 1 ELSE expense_month + 11 END as idx,
              SUM(total_amount) as month_total
            FROM monthly_totals
            WHERE subcategory_id = sub.id
            GROUP BY expense_year, expense_month
          ) totals ON totals.idx = month_idx
        ) sub_vals
      ) sub_cats
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pnl_aggregated IS
'Optimized P&L aggregation using instance/final logic. Shows one value per month per template.';
