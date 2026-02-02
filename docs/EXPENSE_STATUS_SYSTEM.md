# Expense Status System Documentation

**Date:** January 30, 2026  
**Purpose:** Explains how Draft, Final, and Recurrent statuses work in the expense system

---

## Overview

The expense system uses three main statuses to track expense completion and type:
1. **Draft** (`draft`)
2. **Final** (`approved` or `final`)
3. **Recurent** (`recurent` or `placeholder`)

**Important:** Expense status (`status`) is **independent** from payment status (`payment_status`). These are two separate fields that serve different purposes.

---

## 1. Draft Status

### When It's Set
- Created automatically when required fields are missing
- User can explicitly save incomplete expenses as drafts
- Default status if no status is specified

### What It Means
- ✅ Expense is incomplete or not finalized
- ✅ Can be edited freely
- ✅ Included in P&L calculations (if status allows)
- ✅ Can be converted to "Final" when complete

### Code Logic
```typescript
// In expense form (new-expense-form.tsx)
const isDraft = forceDraft || missing.length > 0;
status: isDraft ? "draft" : "final"
```

### Display
- Shows as **"Draft"** badge in the expense list
- Can be filtered by status dropdown: "Draft"

---

## 2. Final Status

### When It's Set
- Created when all required fields are filled
- Set to `"final"` or `"approved"` in the database
- Displayed as **"Final"** in the UI

### What It Means
- ✅ Expense is complete and finalized
- ✅ All required information is present
- ✅ Included in P&L reports
- ✅ Can still be edited

**Important:** Payment status (`paid`/`unpaid`) is **separate** from expense status. An expense can be "Final" but unpaid.

### Code Logic
```typescript
// When saving complete expense
status: isDraft ? "draft" : "final"

// Display logic
displayStatus = exp.status === 'approved' ? 'Final' : ...
```

### Display
- Shows as **"Final"** badge in the expense list
- Can be filtered by status dropdown: "Final"

---

## 3. Recurrent Status

### When It's Set
- For recurring expense templates (monthly placeholders)
- Automatically set when creating recurring expense instances
- Shown as **"Recurent"** in the UI

### What It Means
- ✅ This is a recurring expense instance
- ✅ Linked to a recurring expense template via `recurring_expense_id`
- ✅ Starts as a template/placeholder (`is_recurring_placeholder = true`)
- ✅ Can be marked as paid, which changes payment status but keeps status as "Recurent"

### Status Flow for Recurring Expenses

1. **Created:**
   - Status = `"recurent"` or `"placeholder"`
   - Payment Status = `"unpaid"`

2. **When marked as paid:**
   - Status = STAYS `"recurent"`
   - Payment Status = Changes to `"paid"`

3. **Display:**
   - Always shows **"Recurent"** badge (pink), regardless of payment status

### Code Logic
```typescript
// When creating recurring expense instance
status: 'recurent' // Always recurent for recurring expenses
payment_status: 'paid' // Can be paid or unpaid
is_recurring_placeholder: true // Always true for recurring expenses

// Display logic
if (exp.recurring_expense_id) {
  if (exp.is_recurring_placeholder || exp.status === 'placeholder') {
    displayStatus = 'Recurent';
  } else if (exp.payment_status === 'paid' || exp.status === 'approved') {
    displayStatus = 'Final'; // Only if paid AND not a placeholder
  } else {
    displayStatus = 'Recurent';
  }
}
```

### Display
- Shows as **"Recurent"** badge (pink) in the expense list
- Can be filtered by status dropdown: "Recurent"
- Always shows "Recurent" even when paid

---

## Status vs Payment Status

These are **independent** fields:

- **Expense Status** (`status`): Draft, Final, or Recurrent — indicates completion/type
- **Payment Status** (`payment_status`): Paid or Unpaid — indicates if payment was made

### Examples

| Expense Status | Payment Status | Meaning |
|----------------|----------------|---------|
| Final | Unpaid | Complete expense, not yet paid |
| Final | Paid | Complete expense, paid |
| Draft | Unpaid | Incomplete expense, not paid |
| Recurrent | Unpaid | Recurring template, not paid |
| Recurrent | Paid | Recurring template, paid |

---

## Status Transitions

### Regular Expenses (Non-Recurring)

```
Create Expense
  ├─ Missing fields → "Draft"
  └─ All fields filled → "Final"
  
Edit Expense
  └─ Can change between "Draft" and "Final" manually
  
Payment Toggle (X ↔ ✓)
  └─ Only changes payment_status, NOT expense status
```

### Recurring Expenses

```
Create Recurring Template
  └─ Status: "recurent" (always)
  
Monthly Instances Created
  └─ Status: "recurent" or "placeholder"
  └─ Payment Status: "unpaid"
  
Mark as Paid (click payment icon)
  └─ Status: STAYS "recurent" 
  └─ Payment Status: Changes to "paid"
  
Unmark Payment
  └─ Status: STAYS "recurent"
  └─ Payment Status: Changes to "unpaid"
```

---

## P&L Inclusion

All three statuses can be included in P&L calculations:

- ✅ **Draft**: Included if status is in the allowed list
- ✅ **Final**: Included (approved expenses)
- ✅ **Recurrent**: Included (recurring expenses)

The P&L query includes:
```typescript
.in("status", ["approved", "paid", "pending", "draft", "recurent", "final"])
```

---

## Summary Table

| Status | When Set | Can Edit? | Payment Independent? | P&L Included? | Display Badge |
|--------|----------|-----------|---------------------|---------------|---------------|
| **Draft** | Missing fields | ✅ Yes | ✅ Yes | ✅ Yes | "Draft" |
| **Final** | All fields filled | ✅ Yes | ✅ Yes | ✅ Yes | "Final" |
| **Recurent** | Recurring expense | ✅ Yes | ✅ Yes | ✅ Yes | "Recurent" (pink) |

---

## Key Points to Remember

1. **Payment status does NOT change expense status**
   - Clicking the payment icon (X ↔ ✓) only toggles `payment_status`
   - It does NOT change the `status` field

2. **Recurring expenses always show "Recurent"**
   - Even when paid, they keep the "Recurent" badge
   - Payment status is tracked separately

3. **Draft can become Final**
   - Complete the required fields and save
   - Status will automatically change to "Final"

4. **Status is set at creation**
   - Based on whether required fields are filled
   - Can be manually changed when editing

---

## Database Fields

### Expense Status Field
- **Field Name:** `status`
- **Type:** `string`
- **Possible Values:** `"draft"`, `"approved"`, `"final"`, `"recurent"`, `"placeholder"`, `"pending"`, `"paid"`

### Payment Status Field
- **Field Name:** `payment_status`
- **Type:** `string`
- **Possible Values:** `"paid"`, `"unpaid"`

### Recurring Expense Fields
- **Field Name:** `recurring_expense_id`
- **Type:** `uuid` (nullable)
- **Purpose:** Links expense to recurring template

- **Field Name:** `is_recurring_placeholder`
- **Type:** `boolean`
- **Purpose:** Marks if expense is a recurring placeholder

---

## Related Files

- **Expense Form:** `components/expenses/new-expense-form.tsx`
- **Expense List:** `app/dashboard/[teamId]/expenses/page.tsx`
- **Expense Actions:** `app/actions/expenses.ts`
- **Recurring Expenses:** `app/actions/recurring-expenses.ts`
- **P&L Data:** `app/actions/pnl-data.ts`

---

## Status Filter Options

In the expense list, users can filter by:
- **"Toate"** (All) - Shows all expenses
- **"Draft"** - Shows only draft expenses
- **"Final"** - Shows only final/approved expenses
- **"Recurent"** - Shows only recurring expense placeholders

---

**Document Created:** January 30, 2026  
**Last Updated:** January 30, 2026
