-- Create optimized P&L aggregation function
-- This function aggregates expenses by category/subcategory and month directly in PostgreSQL
-- Much faster than fetching all rows and aggregating in JavaScript

CREATE OR REPLACE FUNCTION get_pnl_aggregated(
  p_team_id UUID,
  p_base_year INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prev_year INTEGER := p_base_year - 1;
  v_result JSON;
BEGIN
  -- Build the complete P&L data in a single query
  WITH
  -- Get all expenses aggregated by category, subcategory, year, month
  expense_agg AS (
    SELECT
      e.category_id,
      e.subcategory_id,
      EXTRACT(YEAR FROM COALESCE(
        CASE WHEN e.accounting_period IS NOT NULL AND e.accounting_period ~ '^\d{4}-\d{2}$'
          THEN (e.accounting_period || '-01')::date
          ELSE NULL
        END,
        e.expense_date
      ))::INTEGER as exp_year,
      EXTRACT(MONTH FROM COALESCE(
        CASE WHEN e.accounting_period IS NOT NULL AND e.accounting_period ~ '^\d{4}-\d{2}$'
          THEN (e.accounting_period || '-01')::date
          ELSE NULL
        END,
        e.expense_date
      ))::INTEGER as exp_month,
      SUM(
        CASE
          WHEN e.vat_deductible = true THEN COALESCE(e.amount_without_vat, e.amount, 0)
          ELSE COALESCE(e.amount_with_vat, e.amount, 0)
        END
      ) as total_amount
    FROM team_expenses e
    WHERE e.team_id = p_team_id
      AND e.deleted_at IS NULL
      AND e.status IN ('approved', 'paid', 'pending', 'draft', 'recurent', 'final')
      AND EXTRACT(YEAR FROM COALESCE(
        CASE WHEN e.accounting_period IS NOT NULL AND e.accounting_period ~ '^\d{4}-\d{2}$'
          THEN (e.accounting_period || '-01')::date
          ELSE NULL
        END,
        e.expense_date
      )) IN (v_prev_year, p_base_year)
    GROUP BY e.category_id, e.subcategory_id, exp_year, exp_month
  ),

  -- Get category structure
  parent_cats AS (
    SELECT id, name, sort_order
    FROM team_expense_categories
    WHERE team_id = p_team_id
      AND is_active = true
      AND category_type = 'cheltuieli'
      AND parent_id IS NULL
    ORDER BY sort_order
  ),

  child_cats AS (
    SELECT id, name, parent_id, sort_order
    FROM team_expense_categories
    WHERE team_id = p_team_id
      AND is_active = true
      AND category_type = 'cheltuieli'
      AND parent_id IS NOT NULL
    ORDER BY sort_order
  ),

  -- Calculate monthly totals (24 months array)
  monthly_totals AS (
    SELECT
      json_build_array(
        -- Previous year (indices 0-11)
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = v_prev_year AND exp_month = 1), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = v_prev_year AND exp_month = 2), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = v_prev_year AND exp_month = 3), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = v_prev_year AND exp_month = 4), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = v_prev_year AND exp_month = 5), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = v_prev_year AND exp_month = 6), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = v_prev_year AND exp_month = 7), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = v_prev_year AND exp_month = 8), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = v_prev_year AND exp_month = 9), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = v_prev_year AND exp_month = 10), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = v_prev_year AND exp_month = 11), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = v_prev_year AND exp_month = 12), 0),
        -- Base year (indices 12-23)
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = p_base_year AND exp_month = 1), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = p_base_year AND exp_month = 2), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = p_base_year AND exp_month = 3), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = p_base_year AND exp_month = 4), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = p_base_year AND exp_month = 5), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = p_base_year AND exp_month = 6), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = p_base_year AND exp_month = 7), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = p_base_year AND exp_month = 8), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = p_base_year AND exp_month = 9), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = p_base_year AND exp_month = 10), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = p_base_year AND exp_month = 11), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg WHERE exp_year = p_base_year AND exp_month = 12), 0)
      ) as cheltuieli
  ),

  -- Get revenues
  revenue_totals AS (
    SELECT
      json_build_array(
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = v_prev_year AND month = 1), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = v_prev_year AND month = 2), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = v_prev_year AND month = 3), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = v_prev_year AND month = 4), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = v_prev_year AND month = 5), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = v_prev_year AND month = 6), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = v_prev_year AND month = 7), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = v_prev_year AND month = 8), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = v_prev_year AND month = 9), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = v_prev_year AND month = 10), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = v_prev_year AND month = 11), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = v_prev_year AND month = 12), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = p_base_year AND month = 1), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = p_base_year AND month = 2), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = p_base_year AND month = 3), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = p_base_year AND month = 4), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = p_base_year AND month = 5), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = p_base_year AND month = 6), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = p_base_year AND month = 7), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = p_base_year AND month = 8), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = p_base_year AND month = 9), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = p_base_year AND month = 10), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = p_base_year AND month = 11), 0),
        COALESCE((SELECT amount FROM team_revenues WHERE team_id = p_team_id AND year = p_base_year AND month = 12), 0)
      ) as venituri
  ),

  -- Build category data with subcategories
  category_data AS (
    SELECT
      pc.id,
      pc.name,
      pc.sort_order,
      json_build_array(
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = v_prev_year AND ea.exp_month = 1), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = v_prev_year AND ea.exp_month = 2), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = v_prev_year AND ea.exp_month = 3), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = v_prev_year AND ea.exp_month = 4), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = v_prev_year AND ea.exp_month = 5), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = v_prev_year AND ea.exp_month = 6), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = v_prev_year AND ea.exp_month = 7), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = v_prev_year AND ea.exp_month = 8), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = v_prev_year AND ea.exp_month = 9), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = v_prev_year AND ea.exp_month = 10), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = v_prev_year AND ea.exp_month = 11), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = v_prev_year AND ea.exp_month = 12), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = p_base_year AND ea.exp_month = 1), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = p_base_year AND ea.exp_month = 2), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = p_base_year AND ea.exp_month = 3), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = p_base_year AND ea.exp_month = 4), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = p_base_year AND ea.exp_month = 5), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = p_base_year AND ea.exp_month = 6), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = p_base_year AND ea.exp_month = 7), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = p_base_year AND ea.exp_month = 8), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = p_base_year AND ea.exp_month = 9), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = p_base_year AND ea.exp_month = 10), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = p_base_year AND ea.exp_month = 11), 0),
        COALESCE((SELECT SUM(total_amount) FROM expense_agg ea WHERE (ea.category_id = pc.id OR ea.subcategory_id IN (SELECT id FROM child_cats WHERE parent_id = pc.id)) AND ea.exp_year = p_base_year AND ea.exp_month = 12), 0)
      ) as values,
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', cc.id,
            'name', cc.name,
            'values', json_build_array(
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = v_prev_year AND ea.exp_month = 1), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = v_prev_year AND ea.exp_month = 2), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = v_prev_year AND ea.exp_month = 3), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = v_prev_year AND ea.exp_month = 4), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = v_prev_year AND ea.exp_month = 5), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = v_prev_year AND ea.exp_month = 6), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = v_prev_year AND ea.exp_month = 7), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = v_prev_year AND ea.exp_month = 8), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = v_prev_year AND ea.exp_month = 9), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = v_prev_year AND ea.exp_month = 10), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = v_prev_year AND ea.exp_month = 11), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = v_prev_year AND ea.exp_month = 12), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = p_base_year AND ea.exp_month = 1), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = p_base_year AND ea.exp_month = 2), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = p_base_year AND ea.exp_month = 3), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = p_base_year AND ea.exp_month = 4), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = p_base_year AND ea.exp_month = 5), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = p_base_year AND ea.exp_month = 6), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = p_base_year AND ea.exp_month = 7), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = p_base_year AND ea.exp_month = 8), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = p_base_year AND ea.exp_month = 9), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = p_base_year AND ea.exp_month = 10), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = p_base_year AND ea.exp_month = 11), 0),
              COALESCE((SELECT total_amount FROM expense_agg ea WHERE ea.subcategory_id = cc.id AND ea.exp_year = p_base_year AND ea.exp_month = 12), 0)
            )
          ) ORDER BY cc.sort_order
        ), '[]'::json)
        FROM child_cats cc
        WHERE cc.parent_id = pc.id
      ) as subcategories
    FROM parent_cats pc
  )

  SELECT json_build_object(
    'cheltuieli', (SELECT cheltuieli FROM monthly_totals),
    'venituri', (SELECT venituri FROM revenue_totals),
    'categories', (SELECT COALESCE(json_agg(
      json_build_object(
        'id', cd.id,
        'name', cd.name,
        'values', cd.values,
        'subcategories', cd.subcategories
      ) ORDER BY cd.sort_order
    ), '[]'::json) FROM category_data cd)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_pnl_aggregated(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pnl_aggregated(UUID, INTEGER) TO service_role;

-- Add comment
COMMENT ON FUNCTION get_pnl_aggregated IS 'Efficiently aggregates P&L data by category and month. Returns JSON with cheltuieli, venituri, and categories arrays for 24 months (prev year + base year).';
