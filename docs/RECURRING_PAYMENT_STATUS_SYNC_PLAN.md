# Recurring Payment Status Synchronization Plan

## Problem Statement

Payment status icons (check ✓ / X) for recurring expenses are not synchronized across the three pages where they appear:

1. **List View** (`/expenses?tab=Recurente`) - Shows 6 months (Jul-Dec)
2. **New Recurring** (`/expenses/recurring/new`) - Shows 12 months (Jan-Dec)
3. **Edit Recurring** (`/expenses/recurring/[id]`) - Shows 12 months (Jan-Dec)

### Current Behavior (Broken)
- Toggling a month on one page doesn't reflect on other pages
- When creating a new recurring expense with some months toggled, those toggles are lost
- When editing, the previously saved toggles don't load correctly

### Expected Behavior
- Toggle a month on ANY page → status persists and shows correctly on ALL pages
- Last 6 months (Jul-Dec) should be fully synced across all 3 pages
- First 6 months (Jan-Jun) should persist between New and Edit pages

---

## Root Cause Analysis

### Issue 1: New Recurring Page Doesn't Save Payment Status
**Location:** `/expenses/recurring/new/page.tsx`

The "New Recurring" page allows toggling months, but when you click "Save":
- Only the recurring expense template is created
- The monthly payment toggles are NOT saved to the database
- No expenses are created for the toggled months

### Issue 2: Edit Page Doesn't Load Payment Status Correctly
**Location:** `/expenses/recurring/[id]/page.tsx`

The edit page tries to load payment status from `getGeneratedExpenses()`, but:
- It checks `exp.status === 'paid' || !exp.is_recurring_placeholder`
- If no expenses exist for a month, it shows as unpaid (X)
- The year being queried might not match the year displayed

### Issue 3: List View and Edit Page Use Different Data Sources
- **List View** uses `getRecurringExpensesWithPayments()` with `year = new Date().getFullYear()`
- **Edit Page** generates months locally and queries `getGeneratedExpenses()`
- Different logic for determining "paid" status

---

## Proposed Solution

### Step 1: Ensure Consistent Year Handling

All three pages should use the same year (current year = 2026) for payment status:

```
List View:    selectedYear = new Date().getFullYear() // 2026
New Page:     year = new Date().getFullYear() // 2026  
Edit Page:    year = new Date().getFullYear() // 2026
```

### Step 2: Save Payment Status When Creating New Recurring Expense

When user creates a new recurring expense with months toggled:

1. Create the recurring expense template (existing behavior)
2. **NEW:** For each month marked as "paid", create an expense record:
   ```
   {
     recurring_expense_id: <new recurring ID>,
     expense_date: <first day of that month>,
     status: 'paid',
     is_recurring_placeholder: false,
     ... (copy other fields from template)
   }
   ```

This ensures the "create" page toggles are persisted.

### Step 3: Ensure Edit Page Loads Correct Data

The edit page should:

1. Use the same year as list view (current year)
2. Query `getGeneratedExpenses()` for that year
3. Map payment status using the same logic as `getRecurringExpensesWithPayments()`:
   ```javascript
   paid = !exp.is_recurring_placeholder || exp.status === 'paid'
   ```

### Step 4: Ensure Toggle Updates Work From All Pages

When toggling payment status on any page, use `updateRecurringPaymentStatus()`:

- **List View:** Already calls this ✓
- **Edit Page:** Already calls this ✓  
- **New Page:** Need to save toggles on submit (Step 2)

### Step 5: Consistent Month-to-Database Mapping

Create a shared utility for mapping months:

```typescript
// Romanian month name → month index (0-11)
const ROMANIAN_MONTHS = {
  'Ianuarie': 0, 'Februarie': 1, 'Martie': 2, 'Aprilie': 3,
  'Mai': 4, 'Iunie': 5, 'Iulie': 6, 'August': 7,
  'Septembrie': 8, 'Octombrie': 9, 'Noiembrie': 10, 'Decembrie': 11
};

// Month key (from list view) → month index
const MONTH_KEYS = {
  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
  'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
};
```

---

## Implementation Checklist

### Files to Modify

| File | Changes |
|------|---------|
| `app/dashboard/[teamId]/expenses/recurring/new/page.tsx` | Save toggled months on submit |
| `app/dashboard/[teamId]/expenses/recurring/[id]/page.tsx` | Fix payment status loading logic |
| `app/actions/recurring-expenses.ts` | Add function to create expenses for toggled months |

### Detailed Changes

#### 1. `recurring/new/page.tsx` - Save Toggles on Submit

```typescript
const handleSave = async () => {
  // 1. Create recurring expense (existing)
  const recurring = await createRecurringExpense({...});
  
  // 2. NEW: For each toggled month, create an expense
  const currentYear = new Date().getFullYear();
  for (const mp of monthlyPayments) {
    if (mp.paid) {
      await updateRecurringPaymentStatus(
        recurring.id,
        params.teamId,
        mp.year,
        getMonthIndex(mp.month),
        true // paid
      );
    }
  }
  
  router.push(`/dashboard/${params.teamId}/expenses?tab=Recurente`);
};
```

#### 2. `recurring/[id]/page.tsx` - Fix Loading Logic

Ensure the edit page:
- Uses current year (2026) consistently
- Shows 12 months of current year (Jan 2026 - Dec 2026)
- Loads payment status from same data source as list view

```typescript
// Load payment status for current year
const year = new Date().getFullYear();
const generatedExpenses = await getGeneratedExpenses(params.id, params.teamId);

// Build payment map using same logic as list view
const paymentMap = new Map<number, boolean>();
generatedExpenses.forEach(exp => {
  const expDate = new Date(exp.expense_date);
  if (expDate.getFullYear() === year) {
    const month = expDate.getMonth();
    paymentMap.set(month, !exp.is_recurring_placeholder || exp.status === 'paid');
  }
});

// Apply to month list
setMonthlyPayments(prev => prev.map(mp => ({
  ...mp,
  paid: paymentMap.get(getMonthIndex(mp.month)) || false
})));
```

---

## Testing Scenarios

### Scenario 1: Create → List → Edit
1. Go to `/expenses/recurring/new`
2. Toggle Jul, Aug, Dec as paid
3. Save
4. Check list view shows ✓ for Jul, Aug, Dec
5. Click to edit
6. Verify Jul, Aug, Dec still show ✓

### Scenario 2: Create → Edit → List
1. Create new recurring (all months unpaid)
2. Edit it, toggle Sep, Oct as paid
3. Save
4. Check list view shows ✓ for Sep, Oct

### Scenario 3: List → Edit Consistency
1. On list view, toggle Nov as paid
2. Click to edit
3. Verify Nov shows ✓
4. Toggle Nov back to unpaid
5. Save
6. Verify list view shows ✗ for Nov

### Scenario 4: First 6 Months (Jan-Jun)
1. Create new recurring, toggle Mar as paid
2. Save
3. Edit the recurring
4. Verify Mar still shows ✓
5. (These won't show on list view, but should persist between new/edit)

---

## Summary

The fix requires:
1. **New page:** Actually save the toggled months when creating
2. **Edit page:** Load payment status using same logic as list view
3. **All pages:** Use consistent year (current year)
4. **All pages:** Use same "paid" determination logic

No UI changes needed - just backend data consistency.
