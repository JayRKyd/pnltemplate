# P&L / Recurring Expenses — Full Testing Guide

> This guide covers the complete P&L / Recurring Expenses system end-to-end,
> organized by the specification sections (§1–§15).

---

## Prerequisites

1. All SQL migrations applied (up to `0037_generate_recurring_forms_function.sql`)
2. Server running: `npm run dev`
3. A test team with at least one admin user and one regular user
4. Supabase Dashboard access for SQL verification
5. `CRON_SECRET` env variable set (for cron endpoint testing)

---

## Quick Master Checklist

- [ ] §3–4: Create a RE-Template, verify RE-Forms are generated
- [ ] §5: Cron generates RE-Forms on the 1st of the month
- [ ] §6: All 3 statuses (Recurent, Draft, Final) appear in P&L
- [ ] §7: Locked fields on RE-Form (Supplier, Account, Subaccount, P&L Month)
- [ ] §8: Editing a RE-Form transitions Recurent → Draft / Final
- [ ] §9.1: RE-Forms visible in General Expenses List with "Recurent" badge
- [ ] §9.2: RE-Forms visible in Recurring Expenses list with X/✓ marks
- [ ] §9.3: RE-Forms visible in RE-Template page with X/✓ marks (12 months)
- [ ] §10: Modifying a RE-Template → double confirmation + month picker + versioning
- [ ] §10: Inactive template version links shown on new template page
- [ ] §11: ±10% amount change popup on RE-Form save
- [ ] §12: X/✓ shown continuously across template versions
- [ ] §13: Delete & Inactivate with double confirmation + permission gate
- [ ] §13: Deleting a finalized RE-Form regenerates it as Recurent
- [ ] §14: Template changes only apply forward, past RE-Forms unchanged
- [ ] §15: Soft-delete everywhere, admin filter for deleted items

---

## §3–4: RE-Template & RE-Form Creation

### Test 3.1 — Create a RE-Template

1. Navigate to **Dashboard → Expenses → Recurente tab**
2. Click **"Recurent Nou +"**
3. Fill in:
   - Furnizor: `Test Telecom SRL`
   - Suma cu TVA: `1.190,00`
   - Suma fără TVA: `1.000,00`
   - TVA Deductibil: `Da`
   - Cont: pick any category
   - Subcont: pick any subcategory
   - Descriere: `Abonament lunar telefon`
4. Click **Salvează**

**Expected:**
- [ ] Template appears in the Recurente list
- [ ] Navigating to the template shows a 12-month grid
- [ ] Current and past months (since template start) show **red X** marks
- [ ] Future months show **dashed empty circles**

### Test 3.2 — Verify RE-Forms Were Auto-Generated

```sql
SELECT id, status, accounting_period, supplier, amount_with_vat, recurring_expense_id
FROM team_expenses
WHERE recurring_expense_id = '<TEMPLATE_ID>'
  AND deleted_at IS NULL
ORDER BY expense_date;
```

**Expected:**
- [ ] One row per month since the template start date
- [ ] All rows have `status = 'recurent'`
- [ ] `supplier`, `amount_with_vat`, `accounting_period` match the template

---

## §5: Monthly Auto-Generation (Cron)

### Test 5.1 — Cron API Endpoint

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/generate-recurring
```

**Expected response:**
```json
{
  "success": true,
  "targetMonth": "2026-02-01",
  "teamsProcessed": 1,
  "totalFormsGenerated": 0,
  "details": []
}
```

- [ ] Returns `totalFormsGenerated: 0` if all RE-Forms already exist for this month
- [ ] If you delete an existing RE-Form first, re-running generates it again

### Test 5.2 — Cron Without Auth

```bash
curl http://localhost:3000/api/cron/generate-recurring
```

**Expected:** `401 Unauthorized` (if `CRON_SECRET` is set)

### Test 5.3 — DB Function Directly

```sql
SELECT * FROM generate_all_recurring_forms(DATE_TRUNC('month', CURRENT_DATE));
```

**Expected:** Returns rows with `(team_id, generated_count)` for any teams that got new forms.

---

## §6: Statuses & P&L Impact

### Test 6.1 — All 3 Statuses Appear in P&L

1. Ensure you have at least one expense in each status: Recurent, Draft, Final
2. Navigate to **Dashboard → P&L**

**Expected:**
- [ ] Recurent expense amount appears in P&L for its month
- [ ] Draft expense amount appears in P&L for its month
- [ ] Final expense amount appears in P&L for its month
- [ ] Each month/account/subaccount shows exactly one amount per RE-Form (never doubled)

### Test 6.2 — Amount Update Reflects in P&L

1. Open a RE-Form in status Recurent (amount = 1.190,00)
2. Change amount to 1.500,00 and save as Draft
3. Check P&L

**Expected:**
- [ ] P&L for that month now shows 1.500,00 (not 1.190,00)
- [ ] Only one entry per month per template

---

## §7: Locked Fields on RE-Form

### Test 7.1 — Non-Editable Fields

1. Open any RE-Form (status Recurent) from the Expenses list
2. Inspect the form fields

**Expected (non-editable / greyed out):**
- [ ] **Furnizor** — locked
- [ ] **Cont** — locked
- [ ] **Subcont** — locked
- [ ] **Luna P&L** — locked

**Expected (editable):**
- [ ] Descriere
- [ ] Suma cu TVA / Suma fără TVA / TVA
- [ ] Document-related fields (Număr, Dată, Serie)
- [ ] Tags

---

## §8: Status Transition Recurent → Draft / Final

### Test 8.1 — Save as Draft

1. Open a RE-Form in status **Recurent**
2. Add a description and partially fill document fields
3. Click **Salvează** (the system should save as Draft since not all required fields are filled)

**Expected:**
- [ ] Status changes to **Draft**
- [ ] In Expenses list, the badge shows "Draft"
- [ ] In Recurring list, the month mark changes from **X** to **✓**

### Test 8.2 — Save as Final

1. Open a RE-Form in status **Recurent** (or Draft)
2. Fill in ALL fields (document number, date, amounts, etc.)
3. Click **Salvează**

**Expected:**
- [ ] Status changes to **Final**
- [ ] Badge in Expenses list shows "Final"
- [ ] Recurring list month mark shows **✓**

---

## §9: RE-Form Visibility

### Test 9.1 — General Expenses List

1. Navigate to **Dashboard → Expenses** (Cheltuieli tab)
2. Look for rows with status badge **"Recurent"**

**Expected:**
- [ ] RE-Forms appear alongside regular expenses
- [ ] Badge shows "Recurent" with distinct styling
- [ ] Clicking the row navigates to the expense form
- [ ] Status filter dropdown includes "Recurent" option

### Test 9.2 — Recurring Expenses List

1. Navigate to **Recurente** tab

**Expected:**
- [ ] Each RE-Template shown as a row
- [ ] Last 6 months displayed as columns
- [ ] **X** = RE-Form still in Recurent status (not yet edited)
- [ ] **✓** = RE-Form moved to Draft or Final
- [ ] Clicking X or ✓ navigates to that specific RE-Form

### Test 9.3 — RE-Template Detail Page

1. Click on a RE-Template in the Recurente list

**Expected:**
- [ ] Monthly grid shows **12 months** (not 6)
- [ ] Same X / ✓ logic as the list
- [ ] Clicking X or ✓ navigates to the RE-Form
- [ ] Dashed circles for months with no RE-Form yet

---

## §10: Modifying a RE-Template (Versioning)

### Test 10.1 — Amount Change → Double Confirmation + Month Picker

1. Open a RE-Template detail page
2. Change **Suma cu TVA** from `1.190,00` to `1.500,00`
3. Click **Salvează**

**Expected — Step 1 dialog:**
- [ ] Modal appears: "Modificare template"
- [ ] Text explains a new version will be created
- [ ] Warning: old template becomes inactive, past RE-Forms unchanged
- [ ] Buttons: **Anulează** / **Da, continuă**

4. Click **Da, continuă**

**Expected — Step 2 dialog (month picker):**
- [ ] Modal: "Selectează prima lună activă"
- [ ] Year navigation arrows (< 2026 >)
- [ ] 3×4 month grid (Ian, Feb, Mar, …, Dec)
- [ ] Current month pre-selected with teal highlight
- [ ] Buttons: **Anulează** / **Confirmă și salvează**

5. Select a month and click **Confirmă și salvează**

**Expected:**
- [ ] Redirected back to Recurente list
- [ ] New template appears as active

**Verify in SQL:**
```sql
SELECT id, version, is_active, superseded_at, superseded_by_id, start_date
FROM team_recurring_expenses
WHERE supplier = 'Test Telecom SRL'
ORDER BY version;
```
- [ ] Old template: `is_active = false`, `superseded_at` set, `superseded_by_id` = new ID
- [ ] New template: `is_active = true`, `version` incremented, `start_date` = selected month

### Test 10.2 — Non-Amount Change (No Versioning)

1. Open a RE-Template, change only the **Descriere** (not amounts)
2. Click **Salvează**

**Expected:**
- [ ] No confirmation dialog appears
- [ ] Template updates in-place (same ID, no new version)

### Test 10.3 — Inactive Template Version Links

1. After Test 10.1, navigate to the **new** template detail page
2. Scroll below the 12-month grid

**Expected:**
- [ ] Section "Versiuni anterioare (inactive):" is visible
- [ ] Shows the old template: version number, supplier, amount, inactivation date
- [ ] Clicking the link navigates to the old template's detail page

### Test 10.4 — Cancel at Step 1

1. Change amounts on a template, click **Salvează**
2. At Step 1 dialog, click **Anulează**

**Expected:**
- [ ] Dialog closes
- [ ] No changes saved
- [ ] Template remains unchanged

---

## §11: ±10% Amount Change Popup (RE-Form Save)

### Test 11.1 — Amount Differs > 10%

1. Open a RE-Form in **Recurent** status
2. Template amount is `1.190,00` cu TVA
3. Change to `1.500,00` cu TVA (~26% increase)
4. Fill required fields and click **Salvează**

**Expected:**
- [ ] RE-Form saves successfully (status → Draft or Final)
- [ ] **AmountDifferenceDialog** appears showing:
  - Expected amount from template
  - Actual amount entered
  - Difference percentage
- [ ] Two main options:
  - **"Actualizează template"** → calls `updateRecurringTemplateVersioned`, creates new version
  - **"Confirmă"** → keeps save as-is, does not modify template

### Test 11.2 — Amount Differs ≤ 10%

1. Open a RE-Form in **Recurent** status
2. Template amount is `1.190,00`
3. Change to `1.200,00` (~0.8% increase)
4. Save

**Expected:**
- [ ] RE-Form saves, transitions to Draft/Final
- [ ] **No** amount difference dialog appears
- [ ] Success modal shown directly

### Test 11.3 — Amount Unchanged

1. Open a RE-Form, don't change amounts, just add description
2. Save

**Expected:**
- [ ] No popup, normal save flow
- [ ] Success modal shown

### Test 11.4 — Update Template from Popup

1. Trigger the ±10% popup (Test 11.1)
2. Click **"Actualizează template"**

**Expected:**
- [ ] Template is versioned (old inactive, new active with updated amount)
- [ ] Success modal appears
- [ ] Verify in SQL that a new template version was created

---

## §12: Behavior Across Template Versions

### Test 12.1 — Continuous X/✓ Display

1. Create a RE-Template in January
2. Let it generate RE-Forms for Jan, Feb, Mar
3. Finalize the Jan and Feb RE-Forms (✓)
4. Modify the template (create version 2 starting from March)
5. Navigate to the **new** template in the Recurente list

**Expected (last 6 months columns):**
- [ ] Jan: ✓ (from old template's RE-Form)
- [ ] Feb: ✓ (from old template's RE-Form)
- [ ] Mar: X (from new template's RE-Form)
- [ ] Months shown continuously, even though Jan/Feb were generated by the old template

### Test 12.2 — RE-Template Page (12 months)

Same as 12.1 but on the template detail page with 12 months visible.

**Expected:**
- [ ] All 12 months shown with appropriate X/✓
- [ ] Past months from old template versions included seamlessly

---

## §13: Deletion & Inactivation Rules

### Test 13.1 — Delete RE-Template (Double Confirmation)

1. Open a RE-Template as the **creator** or an **admin**
2. Click **Șterge**

**Expected — Step 1:**
- [ ] Modal: "Confirmă ștergerea"
- [ ] Buttons: **Anulează** / **Da, continuă**

3. Click **Da, continuă**

**Expected — Step 2:**
- [ ] Modal: "Confirmare finală" (red heading)
- [ ] Warning about irreversible action and associated expenses
- [ ] Buttons: **Anulează** / **Șterge definitiv**

4. Click **Șterge definitiv**

**Expected:**
- [ ] Template soft-deleted (`deleted_at` set)
- [ ] Redirected to Recurente list
- [ ] Template no longer visible (unless admin filter active)
- [ ] Past RE-Forms **NOT** deleted — still visible in Expenses list

### Test 13.2 — Inactivate RE-Template (Double Confirmation)

1. Open a RE-Template, toggle **Activ → Inactiv**
2. Click **Salvează**

**Expected — Step 1:**
- [ ] Modal: "Dezactivare template"
- [ ] Buttons: **Anulează** / **Da, dezactivează**

3. Click **Da, dezactivează**

**Expected — Step 2:**
- [ ] Modal: "Confirmare finală dezactivare" (amber heading)
- [ ] Buttons: **Anulează** / **Confirmă dezactivare**

4. Click **Confirmă dezactivare**

**Expected:**
- [ ] Template becomes inactive (`is_active = false`)
- [ ] No new RE-Forms will be generated for future months
- [ ] Past RE-Forms unchanged

### Test 13.3 — Permission Gate (Non-Creator, Non-Admin)

1. Log in as a **regular user** who did NOT create the template
2. Open someone else's RE-Template

**Expected:**
- [ ] **Șterge** button is **not visible**
- [ ] **Inactiv** toggle button is **greyed out** / disabled
- [ ] Tooltip: "Doar creatorul sau un admin poate dezactiva"

### Test 13.4 — Permission Gate (Admin)

1. Log in as an **admin** user
2. Open any RE-Template (even one created by another user)

**Expected:**
- [ ] **Șterge** button is visible
- [ ] **Inactiv** toggle is enabled
- [ ] Both actions work with double confirmation

### Test 13.5 — Delete Finalized RE-Form → Regenerate as Recurent

1. Find a RE-Form that was modified (status = Draft or Final)
2. Delete it

**Expected:**
- [ ] The modified RE-Form is soft-deleted
- [ ] A **new RE-Form** is generated for that month with status **Recurent**
- [ ] The new RE-Form has values from the RE-Template (original amounts restored)
- [ ] In the Recurring list, that month's mark reverts to **X**

**Verify:**
```sql
-- Deleted RE-Form
SELECT id, status, deleted_at FROM team_expenses
WHERE id = '<DELETED_EXPENSE_ID>';

-- New regenerated RE-Form
SELECT id, status, accounting_period, amount_with_vat
FROM team_expenses
WHERE recurring_expense_id = '<TEMPLATE_ID>'
  AND accounting_period = '<SAME_MONTH>'
  AND deleted_at IS NULL;
```

---

## §14: Scope of Changes Over Time

### Test 14.1 — Past RE-Forms Unchanged After Template Edit

1. Create a template, let it generate Jan, Feb, Mar RE-Forms
2. Finalize Jan RE-Form with amount `1.000,00`
3. Edit the template → change amount to `2.000,00` starting from March

**Expected:**
- [ ] Jan RE-Form still shows `1.000,00`
- [ ] Feb RE-Form still shows original template amount (unmodified)
- [ ] Only March onward gets `2.000,00`
- [ ] P&L for Jan/Feb reflects original amounts

### Test 14.2 — Inactivation Doesn't Modify Past RE-Forms

1. Inactivate a template
2. Check all past RE-Forms

**Expected:**
- [ ] All RE-Forms still exist with their original status and amounts
- [ ] P&L unchanged for past months

---

## §15: Audit & Admin Visibility

### Test 15.1 — Deleted Expenses Admin Filter (Cheltuieli Tab)

1. Log in as **admin**
2. Navigate to **Cheltuieli** tab
3. In the Status filter dropdown, look for **"Șterse"** option

**Expected:**
- [ ] "Șterse" option visible only to admins
- [ ] Selecting it shows soft-deleted expenses
- [ ] Deleted rows have **muted opacity**, **strikethrough text**, and **no click navigation**

### Test 15.2 — Deleted RE-Templates Admin Filter (Recurente Tab)

1. Log in as **admin**
2. Navigate to **Recurente** tab
3. Look for checkbox: **"Afișează template-uri șterse / inactive"**

**Expected:**
- [ ] Checkbox visible only to admins
- [ ] When checked, deleted and inactive templates appear in the list
- [ ] Deleted templates: **50% opacity**, **strikethrough**, **"Șters" badge** (red)
- [ ] Inactive templates: **50% opacity**, **"Inactiv" badge** (amber)
- [ ] Clicking disabled rows does nothing (no navigation)

### Test 15.3 — Non-Admin Cannot See Deleted Items

1. Log in as a **regular user**

**Expected:**
- [ ] No "Șterse" option in status dropdown
- [ ] No "Afișează template-uri șterse" checkbox
- [ ] Deleted items completely invisible

---

## Edge Cases

### EC-1: Two Templates Same Supplier
Create two templates for "Telefonia SA" with different accounts.
- [ ] Both generate independent RE-Forms
- [ ] P&L shows both under correct accounts

### EC-2: Template Created Mid-Month
Create a template on the 15th with start date = current month.
- [ ] RE-Form generated for the current month
- [ ] P&L month = current month (not next)

### EC-3: Delete and Re-Delete
1. Delete a finalized RE-Form (regenerated as Recurent)
2. Delete the regenerated Recurent RE-Form
- [ ] Should regenerate again as Recurent
- [ ] Infinite regeneration cycle protection (check only one active RE-Form per month)

### EC-4: Version Chain > 2 Deep
1. Create template v1
2. Edit → v2
3. Edit v2 → v3
- [ ] v3 detail page shows links to v1 and v2
- [ ] X/✓ marks shown continuously across all 3 versions

### EC-5: Amount = 0
Create a template with amount 0.
- [ ] RE-Forms generated with amount 0
- [ ] No ±10% popup (division by zero protection)

---

## SQL Verification Queries

### Overview of Templates & RE-Forms
```sql
-- All templates for your team
SELECT id, supplier, amount_with_vat, version, is_active,
       deleted_at IS NOT NULL as is_deleted, start_date
FROM team_recurring_expenses
WHERE team_id = 'YOUR_TEAM_ID'
ORDER BY supplier, version;

-- All RE-Forms for a specific template (including version chain)
SELECT te.id, te.status, te.accounting_period, te.amount_with_vat,
       te.deleted_at IS NOT NULL as is_deleted, te.recurring_expense_id
FROM team_expenses te
WHERE te.recurring_expense_id IN (
  SELECT id FROM team_recurring_expenses WHERE supplier = 'Test Telecom SRL'
)
ORDER BY te.expense_date;
```

### P&L Accuracy Check
```sql
-- Should show exactly ONE active RE-Form per month per template
SELECT recurring_expense_id, accounting_period, COUNT(*) as count
FROM team_expenses
WHERE team_id = 'YOUR_TEAM_ID'
  AND recurring_expense_id IS NOT NULL
  AND deleted_at IS NULL
GROUP BY recurring_expense_id, accounting_period
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)
```

### Version Chain Check
```sql
WITH RECURSIVE chain AS (
  SELECT id, supplier, version, previous_version_id, is_active
  FROM team_recurring_expenses
  WHERE id = '<LATEST_TEMPLATE_ID>'
  UNION ALL
  SELECT t.id, t.supplier, t.version, t.previous_version_id, t.is_active
  FROM team_recurring_expenses t
  JOIN chain c ON t.id = c.previous_version_id
)
SELECT * FROM chain ORDER BY version;
```

---

## Test Completion Sign-Off

| Section | Description | Pass? |
|---------|-------------|-------|
| §3–4 | RE-Template creation & RE-Form generation | |
| §5 | Cron monthly auto-generation | |
| §6 | All statuses in P&L | |
| §7 | Locked fields on RE-Form | |
| §8 | Status transitions | |
| §9.1 | Expenses list visibility | |
| §9.2 | Recurring list X/✓ (6 months) | |
| §9.3 | Template page X/✓ (12 months) | |
| §10 | Template modification + versioning | |
| §11 | ±10% amount popup | |
| §12 | Cross-version continuity | |
| §13 | Delete/Inactivate + permissions | |
| §14 | Forward-only changes | |
| §15 | Admin soft-delete filters | |
