# Recurring Expenses Testing Guide

## Overview
This guide covers testing for all 4 phases of recurring expense functionality:
1. Valid From Month Picker (new template creation)
2. Template Modification Constraint (versioning)
3. VAT Calculation Logic (4-field auto-calculation)
4. Skip Month Functionality

---

## Phase 1: Valid From Month Picker

### Test 1.1: Create New Recurring Template with Month Selection

**Steps:**
1. Navigate to `/dashboard/[teamId]/expenses?tab=Recurente`
2. Click **"Recurent Nou +"** button
3. Fill in basic fields:
   - Nume Furnizor: "Test Supplier"
   - Descriere: "Monthly subscription"
   - Select a category and subcategory
   - Set TVA Deductibil to "Da"
   - Enter amounts (e.g., Suma cu TVA: 1000, Cota TVA: 21%)

**Expected Before Month Selection:**
- Right column should show a **month picker** (calendar view with year navigation)
- No month list should be visible yet

**Steps (continued):**
4. Click on a month in the picker (e.g., **November 2025**)

**Expected After Selection:**
- Month picker disappears
- Month list appears showing months from **November 2025** to **current month** (max 12 months)
- Each month shows a **red X icon** (light red background circle with bold red X)
- A small **pencil icon** appears at the top to edit the selection

**Steps (continued):**
5. Click the **pencil icon**

**Expected:**
- Month list disappears
- Month picker reappears
- You can select a different month

6. Select a different month (e.g., **January 2026**)
7. Click **"Salvează"**

**Expected:**
- Template is saved with `start_date` = first day of selected month
- RE-Forms are generated for all months from selected month to current month (max 12)
- Redirects to Recurente tab
- New template appears in the list

---

### Test 1.2: Verify Generated RE-Forms

**Steps:**
1. From Recurente tab, click on the newly created template

**Expected:**
- Right column shows months from selected start month to current month
- All months show **red X icon** (status = 'recurent')
- Clicking any month opens the expense form for that month
- Form shows template values (supplier, amounts, etc.)

---

## Phase 2: Template Modification Constraint

### Test 2.1: Modify Template - Current Month Available

**Setup:**
- Use a template where the current month's RE-Form has status = 'recurent' (not edited)

**Steps:**
1. Open the template detail page
2. Change one of the amount fields (e.g., increase Suma cu TVA from 1000 to 1200)
3. Click **"Salvează"**

**Expected:**
- Version confirmation modal appears (Step 1)
- Click **"Confirmă"**
- Step 2 modal appears with month picker
- **Current month should be enabled** (not grayed out)
- **Past months should be disabled** (grayed out, cannot select)
- Current month should be auto-selected

4. Confirm the version update

**Expected:**
- New version is created (e.g., "v1" appears in version history)
- New RE-Forms are generated from current month onward with new amounts
- Previous months retain old version values

---

### Test 2.2: Modify Template - Current Month Finalized

**Setup:**
1. Open a template
2. Click on the current month's RE-Form
3. Edit any field (e.g., change description)
4. Save (this changes status from 'recurent' to 'draft')
5. Go back to template detail page

**Steps:**
1. Change an amount field
2. Click **"Salvează"**

**Expected:**
- Version confirmation modal appears
- In Step 2 month picker:
  - **Current month is disabled** (grayed out)
  - **Next month is auto-selected** (earliest available)
  - Past months are disabled

3. Confirm the version update

**Expected:**
- New version applies from next month onward
- Current month keeps its edited form (not affected by new version)

---

## Phase 3: VAT Calculation Logic

### Test 3.1: Calculate from Amount incl. VAT + VAT Rate

**Steps:**
1. Create a new expense (regular or recurring)
2. Set TVA Deductibil = **"Da"**
3. Enter **Suma cu TVA** = `1210`
4. Tab/click out of the field
5. Enter **Cota TVA (%)** = `21`
6. Tab/click out of the field

**Expected:**
- **Suma fara TVA** auto-calculates to `1000` (read-only, gray background)
- **TVA** auto-calculates to `210` (read-only, gray background)
- Both calculated fields show a small **reset button** (↻)
- Calculated fields cannot be edited

---

### Test 3.2: Calculate from Amount excl. VAT + VAT Amount

**Steps:**
1. Click the **reset button** (↻) to clear all 4 fields
2. Enter **Suma fara TVA** = `750`
3. Tab out
4. Enter **TVA** = `82.50`
5. Tab out

**Expected:**
- **Suma cu TVA** auto-calculates to `832.50`
- **Cota TVA (%)** auto-calculates to `11` (82.50 / 750 = 11%)
- Both calculated fields are read-only

---

### Test 3.3: Invalid VAT Rate - Block Save

**Steps:**
1. Reset all fields
2. Enter **Suma cu TVA** = `2380`
3. Enter **Suma fara TVA** = `2000`
4. Tab out

**Expected:**
- **TVA** calculates to `380`
- **Cota TVA (%)** calculates to `19`
- **Cota TVA field shows red error** (19% is not 11% or 21%)
- Error message appears: "Cota TVA trebuie să fie 11% sau 21%"

5. Try to save the form

**Expected:**
- Save is **blocked** (button disabled or shows error)
- Form cannot be submitted with invalid VAT rate

---

### Test 3.4: Valid VAT Rate - Allow Save

**Steps:**
1. Reset all fields
2. Enter **Suma fara TVA** = `1000`
3. Enter **Cota TVA (%)** = `21`
4. Tab out

**Expected:**
- **TVA** calculates to `210`
- **Suma cu TVA** calculates to `1210`
- **No red error** on Cota TVA field
- Save button is enabled

5. Save the form

**Expected:**
- Form saves successfully

---

### Test 3.5: Reset Button Functionality

**Steps:**
1. Fill in 2 fields and let the other 2 auto-calculate
2. Click the **reset button** (↻) on any calculated field

**Expected:**
- **All 4 VAT fields clear** (Suma cu TVA, Suma fara TVA, TVA, Cota TVA)
- All fields become editable again (no read-only state)
- User can start a fresh calculation

---

## Phase 4: Skip Month Functionality

### Test 4.1: Skip a Recurent Month (Right-Click)

**Steps:**
1. Open a recurring template detail page
2. Find a month with **red X icon** (status = 'recurent')
3. **Right-click** on that month row

**Expected:**
- Month status changes to **'skipped'**
- Icon changes to **gray circle with dash (–)**
- Month text shows **strikethrough** and gray color
- Row opacity reduces to 50%
- Clicking the month does nothing (no navigation)

---

### Test 4.2: Unskip a Skipped Month (Right-Click)

**Steps:**
1. Find a month with **gray dash icon** (status = 'skipped')
2. **Right-click** on that month row

**Expected:**
- Month status changes back to **'recurent'**
- Icon changes back to **red X**
- Strikethrough and gray styling removed
- Row becomes clickable again

---

### Test 4.3: Skipped Month in Recurente Tab List

**Steps:**
1. Go to `/dashboard/[teamId]/expenses?tab=Recurente`
2. Find a recurring template with a skipped month
3. Look at the month columns (last 6 months)

**Expected:**
- Skipped months show **gray circle with dash (–)** icon
- Clicking the gray dash does **not navigate** to the expense form
- Other months show normal X or ✓ icons

---

### Test 4.4: Skipped Months Excluded from P&L

**Steps:**
1. Create a recurring template with monthly amount = 1000 RON
2. Skip the current month (right-click → skip)
3. Navigate to P&L dashboard
4. Check the current month's total expenses

**Expected:**
- Current month's P&L **does not include** the 1000 RON from the skipped recurring expense
- If you unskip the month, the 1000 RON should appear in P&L

**Verification Query (optional):**
```sql
-- Skipped expenses should have status = 'skipped'
SELECT * FROM team_expenses 
WHERE recurring_expense_id = '[template-id]' 
  AND accounting_period = '2026-02'
  AND status = 'skipped';
```

---

### Test 4.5: Cannot Skip Draft/Final Forms

**Steps:**
1. Open a recurring template
2. Click on a month with **green ✓** (status = 'draft' or 'final')
3. Try to **right-click** on it

**Expected:**
- Right-click context menu does **not appear** (or skip action is disabled)
- Only 'recurent' and 'skipped' months can be toggled

---

## Phase 5: Edit Page Month Grid (Rolling 12 Months)

### Test 5.1: Verify Month Display Range

**Steps:**
1. Open any recurring template detail page
2. Look at the right column month list

**Expected:**
- Shows **12 months total**
- **Top month** = current month (e.g., Februarie 2026)
- **Bottom month** = 11 months ago (e.g., Martie 2025)
- Months are in **reverse chronological order** (newest first)
- Each month shows the correct year

---

### Test 5.2: Cross-Year Boundary

**Setup:**
- Test in January 2026

**Expected:**
- Month list shows:
  - Ianuarie 2026
  - Decembrie 2025
  - Noiembrie 2025
  - ... down to ...
  - Februarie 2025

---

## Edge Cases & Error Scenarios

### Edge 1: Template with No RE-Forms
**Steps:**
1. Create a template but don't save it properly (or delete all RE-Forms manually via DB)
2. Open the template

**Expected:**
- System auto-generates RE-Forms for months from start_date to current month
- Month grid populates with X icons

---

### Edge 2: Future Start Date
**Steps:**
1. Try to create a template with start_date in the future (if UI allows)

**Expected:**
- Should either block future dates or generate no RE-Forms until that month arrives

---

### Edge 3: Multiple Manual Edits
**Steps:**
1. Enter Suma cu TVA
2. Enter Suma fara TVA (triggers calculation)
3. Try to manually edit the calculated TVA field

**Expected:**
- Field is **read-only** (cannot edit)
- Must use reset button to start over

---

## Summary Checklist

- [ ] Phase 1: Month picker appears on new template, generates correct RE-Forms
- [ ] Phase 1: Pencil icon allows re-selection of start month
- [ ] Phase 2: Version picker disables past months
- [ ] Phase 2: If current month is final, only next month+ is selectable
- [ ] Phase 3: Any 2 of 4 VAT fields → auto-calc other 2
- [ ] Phase 3: Invalid VAT rate (not 11% or 21%) shows red error + blocks save
- [ ] Phase 3: Reset button clears all 4 fields
- [ ] Phase 4: Right-click on recurent month → skips (gray dash icon)
- [ ] Phase 4: Right-click on skipped month → unskips (red X icon)
- [ ] Phase 4: Skipped months show gray dash in Recurente tab list
- [ ] Phase 4: Skipped months excluded from P&L calculations
- [ ] Phase 5: Edit page shows current month + past 11 months (rolling window)

---

## Test Data Setup

### Sample Recurring Template
```
Nume Furnizor: "Google Workspace"
Descriere: "Monthly subscription"
Cont: "4. Sediu"
Subcont: "Utilitati"
TVA Deductibil: Da
Suma cu TVA: 1210
Cota TVA: 21%
Start Date: November 2025
```

### Sample VAT Calculations
| Input 1 | Input 2 | Expected TVA | Expected Rate | Valid? |
|---------|---------|--------------|---------------|--------|
| Suma cu TVA: 1210 | Cota TVA: 21% | 210 | 21% | ✅ |
| Suma fara TVA: 1000 | TVA: 110 | - | 11% | ✅ |
| Suma cu TVA: 2380 | Suma fara TVA: 2000 | 380 | 19% | ❌ |
| TVA: 157.50 | Cota TVA: 21% | - | 21% | ✅ |

---

## Reporting Issues

When reporting bugs, include:
1. **Phase/Test number** (e.g., "Phase 3, Test 3.3")
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Screenshots** (especially for UI issues)
6. **Browser/environment** (if relevant)

---

**Last Updated:** Feb 15, 2026
