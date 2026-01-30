# Fix Recurring Expenses with NULL accounting_period

## Problem Statement

Some recurring expenses in the database have `accounting_period = NULL`, which causes them to fall back to `expense_date` for P&L month attribution. This can result in expenses appearing in incorrect months in the P&L report.

**Impact:**
- Expenses may appear in wrong months in P&L Realizat view
- Totals may be incorrect for specific months
- User confusion when expenses don't match expected allocation

## Scope Analysis

### Affected Records
Based on database query, we found:
- Multiple recurring expenses with `recurring_expense_id IS NOT NULL` but `accounting_period = NULL`
- These expenses will use `expense_date` instead of proper P&L month allocation

### Data Pattern
```sql
-- Example affected records:
- Recurring expense with expense_date = "2026-01-01" but should be allocated to a specific month
- Some have accounting_period set (e.g., "2026-01") ✓
- Others have accounting_period = NULL ✗
```

## Solution Approach

### Strategy
1. **Identify** all recurring expenses with NULL `accounting_period`
2. **Determine** the correct `accounting_period` based on:
   - The recurring expense template's start date and frequency
   - The expense's `expense_date` (fallback)
3. **Update** records with calculated `accounting_period`
4. **Verify** calculations are correct

### Decision Logic
For each recurring expense with NULL `accounting_period`:
- If `expense_date` exists → Use `YYYY-MM` format from `expense_date`
- If `recurring_expense_id` exists → Check template for preferred allocation
- Priority: `expense_date` → `recurring_expense_id` template → Current date

## Implementation Plan

### Phase 1: Analysis & Preparation

#### Step 1.1: Identify Affected Records
```sql
-- Count affected records
SELECT 
  COUNT(*) as total_affected,
  COUNT(DISTINCT recurring_expense_id) as unique_templates
FROM team_expenses
WHERE recurring_expense_id IS NOT NULL
  AND accounting_period IS NULL
  AND deleted_at IS NULL;
```

#### Step 1.2: Sample Data Review
```sql
-- Review sample records to understand patterns
SELECT 
  id,
  supplier,
  description,
  expense_date,
  accounting_period,
  recurring_expense_id,
  status,
  created_at
FROM team_expenses
WHERE recurring_expense_id IS NOT NULL
  AND accounting_period IS NULL
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;
```

#### Step 1.3: Check Recurring Expense Templates
```sql
-- Verify recurring expense template structure (if table exists)
-- Note: May need to check team_expenses for template patterns
SELECT DISTINCT
  recurring_expense_id,
  COUNT(*) as expense_count,
  MIN(expense_date) as earliest_date,
  MAX(expense_date) as latest_date
FROM team_expenses
WHERE recurring_expense_id IS NOT NULL
  AND deleted_at IS NULL
GROUP BY recurring_expense_id;
```

### Phase 2: Data Migration

#### Step 2.1: Create Migration Script
Create migration file: `supabase/migrations/XXXX_fix_recurring_expenses_accounting_period.sql`

**Migration Logic:**
```sql
-- Fix recurring expenses with NULL accounting_period
-- Use expense_date to derive accounting_period in YYYY-MM format

UPDATE team_expenses
SET accounting_period = to_char(expense_date, 'YYYY-MM')
WHERE recurring_expense_id IS NOT NULL
  AND accounting_period IS NULL
  AND expense_date IS NOT NULL
  AND deleted_at IS NULL;

-- Verify update count
SELECT COUNT(*) as updated_count
FROM team_expenses
WHERE recurring_expense_id IS NOT NULL
  AND accounting_period IS NOT NULL
  AND deleted_at IS NULL;
```

#### Step 2.2: Handle Edge Cases
```sql
-- Handle expenses with NULL expense_date (shouldn't happen, but be safe)
-- Option 1: Use created_at date
UPDATE team_expenses
SET accounting_period = to_char(created_at, 'YYYY-MM')
WHERE recurring_expense_id IS NOT NULL
  AND accounting_period IS NULL
  AND expense_date IS NULL
  AND created_at IS NOT NULL
  AND deleted_at IS NULL;

-- Option 2: Mark for manual review (if created_at also NULL)
-- Add a comment/tag for manual review
```

### Phase 3: Validation

#### Step 3.1: Verify Updates
```sql
-- Check that all recurring expenses now have accounting_period
SELECT 
  COUNT(*) as total_recurring,
  COUNT(accounting_period) as with_accounting_period,
  COUNT(*) - COUNT(accounting_period) as still_null
FROM team_expenses
WHERE recurring_expense_id IS NOT NULL
  AND deleted_at IS NULL;
```

#### Step 3.2: Validate Month Attribution
```sql
-- Verify accounting_period values are valid (YYYY-MM format)
SELECT 
  accounting_period,
  COUNT(*) as count
FROM team_expenses
WHERE recurring_expense_id IS NOT NULL
  AND accounting_period IS NOT NULL
  AND deleted_at IS NULL
GROUP BY accounting_period
ORDER BY accounting_period DESC
LIMIT 20;
```

#### Step 3.3: Cross-Check with P&L Logic
```sql
-- Verify expenses will appear in correct months
SELECT 
  accounting_period,
  COUNT(*) as expense_count,
  SUM(CASE WHEN vat_deductible THEN amount_without_vat ELSE amount_with_vat END) as total_amount
FROM team_expenses
WHERE recurring_expense_id IS NOT NULL
  AND accounting_period IS NOT NULL
  AND deleted_at IS NULL
  AND status IN ('approved', 'paid', 'pending', 'draft', 'recurent', 'final')
GROUP BY accounting_period
ORDER BY accounting_period;
```

### Phase 4: Testing

#### Test Case 1: Verify P&L Display
- [ ] Open P&L → Realizat view
- [ ] Select year that contains fixed recurring expenses
- [ ] Verify expenses appear in correct month columns
- [ ] Check category/subcategory totals are correct

#### Test Case 2: Verify Expense List
- [ ] Open Expenses list
- [ ] Filter by recurring expenses
- [ ] Verify all expenses have proper dates
- [ ] Check that "Luna P&L" field displays correctly

#### Test Case 3: Verify Drill-Down Popup
- [ ] Click on a month cell in P&L table
- [ ] Verify popup shows correct expenses for that month
- [ ] Check that recurring expenses are included

### Phase 5: Monitoring

#### Post-Migration Checks
- [ ] Monitor error logs for any issues
- [ ] Verify no performance degradation
- [ ] Check user reports for any discrepancies
- [ ] Review P&L totals match expectations

## Rollback Plan

If issues are discovered after migration:

### Option 1: Revert Migration
```sql
-- Set accounting_period back to NULL for affected records
-- Note: This requires tracking which records were updated
UPDATE team_expenses
SET accounting_period = NULL
WHERE recurring_expense_id IS NOT NULL
  AND accounting_period IS NOT NULL
  AND updated_at >= '<migration_timestamp>';
```

### Option 2: Manual Correction
- Identify specific problematic records
- Manually update `accounting_period` via admin interface
- Document corrections for future reference

## Implementation Checklist

- [ ] **Pre-Migration**
  - [ ] Backup database
  - [ ] Run analysis queries to understand scope
  - [ ] Review sample data
  - [ ] Get stakeholder approval

- [ ] **Migration**
  - [ ] Create migration file
  - [ ] Test migration on staging/dev environment
  - [ ] Run migration on production
  - [ ] Verify update counts

- [ ] **Post-Migration**
  - [ ] Run validation queries
  - [ ] Test P&L display
  - [ ] Test expense list
  - [ ] Test drill-down popup
  - [ ] Monitor for issues

- [ ] **Documentation**
  - [ ] Document any edge cases found
  - [ ] Update data model documentation if needed
  - [ ] Add validation rules to prevent future NULL values

## Prevention Strategy

### Future Prevention
1. **Application Level:**
   - Ensure expense creation always sets `accounting_period`
   - Add validation to prevent NULL `accounting_period` for recurring expenses
   - Add database constraint (if appropriate)

2. **Database Level:**
   - Consider adding CHECK constraint or trigger
   - Add NOT NULL constraint if business logic allows

3. **Monitoring:**
   - Add alert for new NULL `accounting_period` values
   - Regular data quality checks

## Estimated Timeline

- **Analysis:** 30 minutes
- **Migration Script:** 1 hour
- **Testing:** 1 hour
- **Deployment:** 15 minutes
- **Validation:** 30 minutes
- **Total:** ~3 hours

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Incorrect month attribution | High | Low | Validate against expense_date |
| Data loss | High | Very Low | Backup before migration |
| Performance impact | Low | Low | Run during low-traffic period |
| User confusion | Medium | Low | Clear communication if needed |

## Notes

- Migration should be run during low-traffic period
- Consider running on staging first
- Keep original `expense_date` unchanged (only update `accounting_period`)
- Document any manual corrections needed

## Related Files

- `app/actions/pnl-data.ts` - P&L data fetching logic
- `app/actions/recurring-expenses.ts` - Recurring expense logic
- `components/expenses/new-expense-form.tsx` - Expense creation form
