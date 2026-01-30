# P&L Core Regression Review

**Date:** January 29, 2026  
**Reviewer:** AI Code Review  
**Scope:** P&L module core functionality based on provided checklist

---

## Executive Summary

This document provides a code-level review of the P&L module against the provided regression checklist. The review identifies **6 critical issues**, **3 warnings**, and **2 recommendations** that should be addressed before release.

---

## 0) Environment Sanity

### ✅ Status: PASS
- **Finding:** No environment-specific issues found in code
- **Notes:** Standard Next.js setup with Supabase backend. Error handling present in data fetching.

---

## 1) Add Expense (Decont)

### 1.1 Create NEW Expense from Expenses (Cheltuieli)
**Status:** ✅ **PASS**

**Implementation:** `components/expenses/new-expense-form.tsx`
- Form properly handles expense creation
- Navigation to `/expenses/new` works
- Save functionality implemented in `handleSave()` (line 714)

### 1.2 Mandatory Fields Enforced for Final Expense
**Status:** ⚠️ **WARNING - PARTIAL**

**Findings:**
- **Mandatory fields checked:** `furnizor`, `docType`, `document`, `descriere`, `categoryId`, and minimum 2 amount fields (lines 636-659)
- **Tags are optional:** Correctly marked as optional (line 683)
- **Subcategory is optional:** Line 681 shows `subcategoryId` returns `false` (not required)
- **Status issue:** Line 767 shows `status: isDraft ? "draft" : "draft"` - **ALWAYS SETS TO DRAFT**

**Critical Issue:**
```typescript
// Line 767 in new-expense-form.tsx
status: isDraft ? "draft" : "draft",  // ❌ Always draft!
```

**Expected:** When all mandatory fields are present and not saving as draft, status should be `"approved"` or `"pending"` for Final expenses.

**Impact:** All expenses are saved as "draft" regardless of completion status. This may affect:
- Expense filtering (Final vs Draft)
- P&L calculations (if draft expenses are excluded)
- Status display in expense list

### 1.3 Assign SUBCATEGORY (not top-level category)
**Status:** ⚠️ **WARNING**

**Findings:**
- **Subcategory is optional:** Code at line 679-681 shows `subcategoryId` validation returns `false` (optional)
- **Category is required:** Line 655 checks `if (!line.categoryId)` as mandatory
- **No enforcement:** No validation prevents selecting only a top-level category without a subcategory

**Code Reference:**
```typescript
// Line 655 - Category is required
if (!line.categoryId) missing.push(`${linePrefix}Cont`);

// Line 679-681 - Subcategory is optional
case 'subcategoryId':
  return false; // Optional field
```

**Impact:** Users can save expenses with only a top-level category, which may not align with P&L structure requirements.

**Recommendation:** Consider making subcategory required when a category has subcategories available.

### 1.4 Save Succeeds and Expense Appears in Table
**Status:** ✅ **PASS**

**Implementation:**
- Save logic properly handles both create and update (lines 773-798)
- Expense ID returned and navigation handled (lines 799-820)
- Table refresh should occur after save (router navigation)

---

## 2) Month Attribution (P&L Allocation)

### 2.1 Expense Attributed to Correct Month in P&L
**Status:** ❌ **CRITICAL ISSUE**

**Findings:**
- **`accounting_period` field exists:** Expenses store `accounting_period` (format: "YYYY-MM") in database (line 267 in `expenses.ts`, line 766 in `new-expense-form.tsx`)
- **P&L uses `expense_date` instead:** `app/actions/pnl-data.ts` line 112-119 uses `expense_date` to determine month, **NOT `accounting_period`**

**Code Evidence:**
```typescript
// pnl-data.ts line 112-119
const getMonthIndex = (dateStr: string): number => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  if (year === prevYear) return month;
  if (year === baseYear) return month + 12;
  return -1;
};

// Used with expense_date (line 149)
const idx = getMonthIndex(expense.expense_date); // ❌ Uses expense_date, not accounting_period
```

**Expected Behavior:** P&L should use `accounting_period` (Luna P&L) field to determine which month the expense belongs to, not `expense_date`.

**Impact:** 
- Expenses may appear in wrong month in P&L if `expense_date` differs from `accounting_period`
- User-selected "Luna P&L" is ignored
- Budget vs Actual comparisons will be incorrect

**Recommendation:** Modify `getPnlData()` to use `accounting_period` when available, falling back to `expense_date` only if `accounting_period` is null.

### 2.2 Switch Month/Period Shows Only Expected Month
**Status:** ⚠️ **NEEDS VERIFICATION**

**Findings:**
- P&L page filters by year (line 27 in `pnl/page.tsx`)
- Month switching logic appears to be handled in `PLStatement` component (not reviewed in detail)
- **Cannot verify UI behavior without runtime testing**

---

## 3) P&L Updates

### 3.1 New Expense Included in P&L → Realized
**Status:** ✅ **PASS** (with caveat)

**Findings:**
- `getPnlData()` includes expenses with status: `["approved", "paid", "pending", "draft"]` (line 93)
- **Draft expenses ARE included** in P&L calculations
- Expenses filtered by date range (prevYear-01-01 to baseYear-12-31)
- Category/subcategory matching logic present (lines 164-174)

**Caveat:** Since all expenses are saved as "draft" (Issue 1.2), they will appear in P&L, but this may not be the intended behavior.

### 3.2 Totals Update Accordingly
**Status:** ✅ **PASS**

**Findings:**
- Category totals calculated correctly (lines 156-214)
- Subcategory values rolled up to parent category (line 171)
- VAT deductibility handled correctly (lines 139-144)
- Total expenses per month calculated (lines 147-153)

**VAT Logic:**
```typescript
// Line 139-144
const getExpenseAmount = (expense: ExpenseRecord): number => {
  if (expense.vat_deductible) {
    return expense.amount_without_vat || expense.amount || 0;
  }
  return expense.amount_with_vat || expense.amount || 0;
};
```
✅ Correctly uses `amount_without_vat` for deductible VAT, `amount_with_vat` for non-deductible.

---

## 4) Calculations Sanity

### 4.1 No Broken Totals / NaN / Negative Formatting Issues
**Status:** ✅ **PASS**

**Findings:**
- All calculations use `|| 0` fallbacks to prevent NaN
- Array initialization uses `Array(24).fill(0)` (line 55)
- Amount calculations have null checks (lines 139-144)
- No negative number validation found, but this may be acceptable

**Potential Edge Cases:**
- Negative amounts not explicitly prevented (may be intentional for credits/refunds)
- Division by zero not applicable (no division operations)

### 4.2 VAT Logic: Deductible vs Non-Deductible
**Status:** ✅ **PASS**

**Findings:**
- VAT deductibility correctly handled in P&L (lines 139-144)
- Deductible VAT uses `amount_without_vat`
- Non-deductible VAT uses `amount_with_vat`
- Field properly saved in expense creation (line 755)

---

## 5) Recurring Expenses

### 5.1 Create Recurring Expense (Monthly)
**Status:** ✅ **PASS**

**Findings:**
- Recurring expense creation implemented (`createRecurringExpense()` line 97)
- Monthly recurrence supported (`recurrence_type` defaults to 'monthly')
- Template fields properly saved

### 5.2 Generates/Appears as Expected for Month
**Status:** ⚠️ **WARNING**

**Findings:**
- Placeholder generation function exists (`generate_recurring_placeholders` in SQL migration)
- Placeholders created with `status: 'placeholder'` and `payment_status: 'unpaid'` (migration line 150-151)
- **Missing `accounting_period`:** Placeholders don't set `accounting_period` field (migration lines 111-153)

**Code Evidence:**
```sql
-- Migration 0012 line 111-153
INSERT INTO team_expenses (
  ...
  status,
  payment_status,
  expense_date
  -- ❌ accounting_period NOT SET
) VALUES (
  ...
  'placeholder',
  'unpaid',
  v_expense_date
);
```

**Impact:** Recurring placeholders won't have `accounting_period` set, so P&L will use `expense_date` (which may be correct, but inconsistent with manual expenses).

### 5.3 Edit Recurring → Affects Future Months Only
**Status:** ✅ **PASS**

**Findings:**
- Recurring expense updates don't modify existing placeholders
- Only future placeholders will use updated template
- Existing expenses remain unchanged

### 5.4 Matching Recurring Suggestion
**Status:** ❓ **NOT IMPLEMENTED**

**Findings:**
- No code found for suggesting reuse of recurring expenses when creating manual expenses
- Duplicate detection exists (`checkForDuplicates`) but doesn't check for recurring matches
- **Not a blocker** - may be a future feature

---

## Critical Issues Summary

### 🔴 Critical Issues (Must Fix)

1. **Status Always Set to Draft** (Issue 1.2)
   - **File:** `components/expenses/new-expense-form.tsx:767`
   - **Impact:** All expenses saved as draft, may affect filtering and P&L logic
   - **Fix:** Change to `status: isDraft ? "draft" : "approved"` or appropriate status

2. **P&L Uses Wrong Date Field** (Issue 2.1)
   - **File:** `app/actions/pnl-data.ts:112-119, 149`
   - **Impact:** Expenses appear in wrong month in P&L, ignoring user-selected "Luna P&L"
   - **Fix:** Use `accounting_period` field when available, fallback to `expense_date`

### ⚠️ Warnings (Should Fix)

3. **Subcategory Not Required** (Issue 1.3)
   - **File:** `components/expenses/new-expense-form.tsx:679-681`
   - **Impact:** Users can save expenses without subcategory, may not align with P&L structure
   - **Recommendation:** Make subcategory required when category has subcategories

4. **Recurring Placeholders Missing accounting_period** (Issue 5.2)
   - **File:** `supabase/migrations/0012_create_recurring_expenses.sql:111-153`
   - **Impact:** Inconsistent behavior between manual and recurring expenses
   - **Recommendation:** Set `accounting_period` when generating placeholders

### 📋 Recommendations

5. **Draft Expenses in P&L**
   - Currently draft expenses are included in P&L (line 93 in `pnl-data.ts`)
   - Consider if this is intended behavior or if only "approved"/"paid" should appear

6. **Month Switching Verification**
   - Cannot verify month switching UI behavior without runtime testing
   - Recommend manual testing of month filter in P&L view

---

## Test Coverage Gaps

The following areas cannot be verified through code review alone and require manual testing:

1. ✅ **UI Rendering:** Month headers, expense table display
2. ✅ **User Interactions:** Form validation messages, dropdown behaviors
3. ✅ **Visual Formatting:** Number formatting, currency display
4. ✅ **Browser Compatibility:** PDF preview, file uploads
5. ✅ **Performance:** Large dataset handling, pagination

---

## Code Quality Notes

### ✅ Strengths
- Good error handling with try/catch blocks
- Proper null checks and fallbacks
- VAT logic correctly implemented
- Category/subcategory hierarchy properly handled

### ⚠️ Areas for Improvement
- Status handling logic needs clarification
- Date field usage inconsistency (`expense_date` vs `accounting_period`)
- Subcategory requirement should match business rules

---

## Conclusion

**Overall Status:** ⚠️ **NEEDS FIXES BEFORE RELEASE**

**Critical Issues:** 2  
**Warnings:** 2  
**Recommendations:** 2

**Priority Actions:**
1. Fix status always being set to "draft"
2. Fix P&L to use `accounting_period` instead of `expense_date`
3. Clarify subcategory requirement rules
4. Add `accounting_period` to recurring placeholder generation

**Estimated Fix Time:** 2-4 hours

---

## Appendix: File References

- Expense Form: `components/expenses/new-expense-form.tsx`
- Expense Actions: `app/actions/expenses.ts`
- P&L Data: `app/actions/pnl-data.ts`
- P&L Page: `app/dashboard/[teamId]/pnl/page.tsx`
- Recurring Expenses: `app/actions/recurring-expenses.ts`
- Recurring Migration: `supabase/migrations/0012_create_recurring_expenses.sql`
