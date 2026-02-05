# Recurring Expenses - Testing Guide

## Prerequisites

Before testing, ensure:
1. ✅ All 6 SQL migrations have been run successfully
2. ✅ Database tables created: `recurring_instances`, versioning columns added
3. ✅ Server is running: `npm run dev`
4. ✅ You have access to a test team in the application

---

## Quick Test Checklist

- [ ] Database migrations applied
- [ ] Generate instances for current month
- [ ] Create a recurring template
- [ ] View instances in recurring detail page
- [ ] Convert open instance to final expense
- [ ] Verify P&L shows correct values
- [ ] Test amount difference warning (>10%)
- [ ] Delete final expense and verify instance reopens
- [ ] Edit template (versioning)

---

## Step-by-Step Testing

### 1. Run Database Migrations

```bash
cd c:\Users\ryahj\CascadeProjects\Multi-Tenant-Kit\multi-tenant-starter-template

# If using Supabase CLI
supabase db push

# Or apply migrations manually in Supabase Dashboard > SQL Editor
# Run each migration in order: 0030, 0031, 0032, 0033, 0034, 0035
```

**Verify:**
- Check Supabase Dashboard > Table Editor
- Confirm `recurring_instances` table exists
- Confirm `team_recurring_expenses` has new columns: `version`, `previous_version_id`, `superseded_at`, `superseded_by_id`
- Confirm `team_expenses` has `recurring_instance_id` column

---

### 2. Generate Instances for Current Month

Open Supabase SQL Editor and run:

```sql
-- Replace 'YOUR_TEAM_ID' with your actual team ID
SELECT generate_recurring_instances(
  'YOUR_TEAM_ID',
  DATE_TRUNC('month', CURRENT_DATE)
);
```

**Expected Result:** Returns number of instances created (e.g., `5` if you have 5 active recurring templates)

**Verify:**
```sql
SELECT * FROM recurring_instances WHERE team_id = 'YOUR_TEAM_ID';
```

You should see instances with:
- `status = 'open'`
- `instance_year` = current year
- `instance_month` = current month
- `expected_amount`, `expected_supplier`, etc. populated

---

### 3. Create a New Recurring Template

**Navigate:** Dashboard > Expenses > Recurente tab > "Adaugă Recurent"

**Fill in:**
- Furnizor: "Telefonia SA"
- Suma cu TVA: 1000
- Suma fără TVA: 840.34
- TVA Deductibil: Da
- Cont: Select a category
- Start Date: First day of current month

**Click:** "Salveaza"

**Verify:**
- Template appears in Recurente list
- Navigate to the template detail page
- Monthly grid shows current month with **red X** (open instance)

---

### 4. View Instances in Recurring Detail Page

**Navigate:** Dashboard > Expenses > Recurente > Click on a recurring template

**Expected UI:**
- Left side: Template form (Furnizor, Suma, etc.)
- Right side: **Monthly instance grid**
  - Green checkmark ✓ = Closed (has final expense)
  - Red X = Open (waiting for document)
  - Empty dashed circle = No instance yet (future month)

**Verify:**
- Current month shows red X (open)
- Hovering over open month changes background color slightly
- Clicking open month opens "Confirmă Cheltuială Recurentă" dialog

---

### 5. Convert Open Instance to Final Expense

**Action:** Click on an **open month** (red X) in the monthly grid

**Expected:** Modal dialog opens titled "Confirmă Cheltuială Recurentă"

**Fill in:**
- Month info shown at top (e.g., "Februarie 2026")
- Furnizor: Pre-filled from template
- Număr Document: "FAC-2026-02"
- Upload Documents: Click and upload a PDF or image (required)
- Suma cu TVA: Pre-filled, can edit
- Suma fără TVA: Pre-filled, can edit
- TVA Deductibil: Pre-selected

**Click:** "Confirmă"

**Expected Result:**
- If amount matches template (±10%): Success!
  - Dialog closes
  - Month in grid changes from red X to green ✓
  - New expense appears in main Expenses list with status "Final"

**Verify in SQL:**
```sql
-- Check instance is closed
SELECT * FROM recurring_instances
WHERE team_id = 'YOUR_TEAM_ID' AND status = 'closed';

-- Check final expense was created
SELECT * FROM team_expenses
WHERE recurring_instance_id = 'INSTANCE_ID_FROM_ABOVE';
```

---

### 6. Test Amount Difference Warning (>10%)

**Action:** Click another open month, but this time enter amounts >10% different from template

**Example:**
- Template has: 1000 Lei
- Enter: 1200 Lei (20% difference)

**Expected:**
- Warning dialog appears: "Diferență de sumă detectată"
- Shows: "Suma reală (1.200,00 Lei) diferă cu 20% față de suma așteptată (1.000,00 Lei)"
- Three buttons:
  1. **"Actualizează template & confirmă"** - Creates new template version
  2. **"Confirmă oricum"** - Proceeds without updating template
  3. **"Anulează"** - Cancels

**Test Each Button:**

#### Button 1: Update Template
- Click "Actualizează template & confirmă"
- Instance closes, expense created
- Template gets new version (check SQL: `version` increments)
- Old template: `superseded_at` populated, `is_active = false`

**Verify:**
```sql
SELECT id, version, is_active, superseded_at, superseded_by_id
FROM team_recurring_expenses
WHERE team_id = 'YOUR_TEAM_ID'
ORDER BY created_at DESC;
```

#### Button 2: Confirm Anyway
- Click "Confirmă oricum"
- Instance closes, expense created
- Template unchanged (no new version)

#### Button 3: Cancel
- Click "Anulează"
- Returns to convert form
- Can adjust amounts and try again

---

### 7. Verify P&L Shows Correct Values

**Navigate:** Dashboard > P&L

**Verify for each month:**
- Months with **closed instances**: Shows **final expense amount**
- Months with **open instances**: Shows **expected (template) amount**
- Regular expenses (non-recurring): Show as normal

**P&L Rule:** Exactly **ONE value per month per template**
- Not both open and closed
- Never doubled

**Test in SQL:**
```sql
-- This should show mixed expenses
SELECT
  id,
  expense_date,
  amount,
  status,
  CASE
    WHEN recurring_instance_id IS NOT NULL THEN 'from_instance'
    WHEN recurring_expense_id IS NOT NULL THEN 'legacy_recurring'
    ELSE 'regular'
  END as source
FROM team_expenses
WHERE team_id = 'YOUR_TEAM_ID'
  AND deleted_at IS NULL
ORDER BY expense_date;
```

---

### 8. Delete Final Expense → Instance Reopens (FR-7)

**Setup:** Have a closed instance (green ✓ in grid)

**Action:**
1. Navigate to main Expenses list
2. Find the final expense (status = "Final")
3. Click to open details
4. Delete the expense

**Expected:**
- Expense soft-deleted (`deleted_at` populated)
- Instance **automatically reopens** (`status = 'open'`, `final_expense_id = NULL`)
- In recurring detail page: month changes from green ✓ back to red X
- P&L updates: now shows expected amount instead of final amount

**Verify:**
```sql
-- Check instance reopened
SELECT id, status, final_expense_id, closed_at
FROM recurring_instances
WHERE id = 'INSTANCE_ID';

-- Expected:
-- status = 'open'
-- final_expense_id = NULL
-- closed_at = NULL
```

---

### 9. Edit Template (Versioning - FR-8)

**Navigate:** Recurring detail page > Edit fields > Click "Salveaza"

**Before First Save:**
- System should show confirmation: "Modificările se aplică doar de la luna curentă înainte"

**Expected Behavior:**
1. Old template:
   - `superseded_at` = NOW
   - `is_active = false`
   - `superseded_by_id` = new template ID

2. New template created:
   - `version` = old version + 1
   - `previous_version_id` = old template ID
   - `is_active = true`
   - All other fields copied + new changes

3. Past instances:
   - **Remain unchanged** (they have snapshot values)
   - Old closed instances still reference old template

**Verify:**
```sql
-- Check version chain
SELECT
  id,
  version,
  amount,
  is_active,
  superseded_at,
  previous_version_id,
  created_at
FROM team_recurring_expenses
WHERE team_id = 'YOUR_TEAM_ID'
ORDER BY created_at DESC;

-- Should see: version 1, version 2, etc.
```

---

## Edge Cases to Test

### Concurrent Edits
**Test:** Two users try to close the same instance simultaneously
**Expected:** Second user gets error (optimistic locking via `updated_at`)

### Timezone Handling
**Test:** Create instance for month boundary (e.g., Dec 31 → Jan 1)
**Expected:** Uses integer `instance_year` and `instance_month`, no timezone issues

### Multiple Templates, Same Supplier
**Test:** Create 2 recurring templates for "Telefonia SA"
**Expected:** Each template has independent instances, no conflicts

### Delete Template
**Test:** Delete recurring template
**Expected:**
- Template soft-deleted
- Instances cascade delete (ON DELETE CASCADE)
- Past final expenses remain (but orphaned)

---

## SQL Debugging Queries

### Check Instance Status
```sql
SELECT
  ri.id,
  ri.instance_year,
  ri.instance_month,
  ri.status,
  ri.expected_amount,
  ri.final_expense_id,
  te.expense_uid,
  te.amount as final_amount
FROM recurring_instances ri
LEFT JOIN team_expenses te ON ri.final_expense_id = te.id
WHERE ri.team_id = 'YOUR_TEAM_ID'
ORDER BY ri.instance_year, ri.instance_month;
```

### Check P&L Data
```sql
-- Open instances (expected amounts)
SELECT
  'OPEN' as type,
  instance_year || '-' || LPAD(instance_month::text, 2, '0') as month,
  expected_amount as amount,
  expected_supplier as supplier
FROM recurring_instances
WHERE team_id = 'YOUR_TEAM_ID' AND status = 'open'

UNION ALL

-- Closed instances (final amounts)
SELECT
  'CLOSED' as type,
  TO_CHAR(te.expense_date, 'YYYY-MM') as month,
  te.amount,
  te.supplier
FROM team_expenses te
JOIN recurring_instances ri ON te.id = ri.final_expense_id
WHERE te.team_id = 'YOUR_TEAM_ID' AND ri.status = 'closed'

ORDER BY month;
```

### Check for Duplicate Values (Should be empty!)
```sql
-- This should return 0 rows (no month should have both open and closed)
SELECT
  ri1.instance_year,
  ri1.instance_month,
  ri1.template_id,
  COUNT(*) as duplicate_count
FROM recurring_instances ri1
WHERE ri1.team_id = 'YOUR_TEAM_ID'
GROUP BY ri1.instance_year, ri1.instance_month, ri1.template_id
HAVING COUNT(*) > 1;
```

---

## Common Issues & Solutions

### Issue: "Cannot find module '@/app/actions/recurring-instances'"
**Solution:** Restart Next.js dev server
```bash
npm run dev
```

### Issue: Modal doesn't open when clicking month
**Solution:**
- Check browser console for errors
- Verify `useUser()` hook returns user
- Check `instances` state is populated

### Issue: P&L shows doubled amounts
**Solution:**
- Check SQL: Verify no duplicate instances for same month
- Run P&L debugging query above
- Ensure migration 0034 (P&L function) ran successfully

### Issue: Amount difference dialog doesn't appear
**Solution:**
- Check convertToFinalExpense logic
- Ensure difference calculation uses P&L amounts (with_vat if not deductible, without_vat if deductible)
- Console log `diffPercent` value

### Issue: Instance doesn't reopen after delete
**Solution:**
- Check deleteExpense function has reopen logic
- Verify expense has `recurring_instance_id` field populated
- Check browser console for errors

---

## Success Criteria

✅ **All tests pass when:**
1. Can create recurring template
2. Instances generate monthly
3. Can convert open instance to final expense
4. Amount difference warning works (>10%)
5. P&L shows exactly one value per month
6. Delete final expense reopens instance
7. Edit template creates new version
8. Past instances remain unchanged after edit
9. No duplicate values in P&L
10. UI is responsive and intuitive

---

## Next Steps

After all tests pass:
1. ✅ Test with production data snapshot
2. ✅ Performance test with 100+ recurring templates
3. ✅ User acceptance testing
4. ✅ Deploy to staging
5. ✅ Monitor P&L calculations for accuracy

---

## Need Help?

**Check Logs:**
```bash
# Browser console for frontend errors
# Check Network tab for API failures

# Server logs
npm run dev
# Look for [convertToFinalExpense], [reopenInstance], etc.
```

**Database State:**
```sql
-- Get overview
SELECT
  'Templates' as type, COUNT(*) as count FROM team_recurring_expenses WHERE team_id = 'YOUR_TEAM_ID'
UNION ALL
SELECT 'Instances', COUNT(*) FROM recurring_instances WHERE team_id = 'YOUR_TEAM_ID'
UNION ALL
SELECT 'Open Instances', COUNT(*) FROM recurring_instances WHERE team_id = 'YOUR_TEAM_ID' AND status = 'open'
UNION ALL
SELECT 'Closed Instances', COUNT(*) FROM recurring_instances WHERE team_id = 'YOUR_TEAM_ID' AND status = 'closed';
```

Good luck testing! 🚀
