# Expense Status Rules

## Two Separate Concepts

### 1. Status (Badge) - Shows expense origin
| Status | Source | When Applied |
|--------|--------|--------------|
| **Draft** | Manual | User saves expense via "Decont Nou +" with missing required fields |
| **Final** | Manual | User saves expense via "Decont Nou +" with all required fields complete |
| **Recurent** | Automatic | System generates expense from a Recurente template |

### 2. Plata (Payment Status) - Shows if paid
| Plata | Icon | Meaning |
|-------|------|---------|
| **Platit** | Green checkmark | Expense has been paid |
| **Neplatit** | Red X | Expense has not been paid |

**IMPORTANT:** Plata is INDEPENDENT from Status. Toggling Plata should ONLY change payment_status (paid/unpaid), never the expense status.

---

## Flows

### Manual Entry (Decont Nou +)
```
User fills form → Missing fields? → Yes → Status: Draft
                                  → No  → Status: Final

Plata toggle → Only changes payment_status (paid/unpaid)
```

### Recurring Entry (Recurente Tab)
```
User creates template in Recurente tab
    ↓
System generates expense for applicable months
    ↓
Expense appears in BOTH:
  - Recurente tab (grid with month checkmarks)
  - Cheltuieli tab (with pink "Recurent" badge)
    ↓
Status is always "Recurent" until user processes it
```

---

## Implementation Details

### Task 1: Plata Toggle - COMPLETED
**File:** `app/dashboard/[teamId]/expenses/page.tsx` (lines 655-680)
- Fixed: Plata toggle now ONLY changes `payment_status`
- Removed: Logic that was changing `status` to 'recurent' or 'approved'

### Task 2: Manual Expense Status - COMPLETED
**File:** `components/expenses/new-expense-form.tsx` (line 767)
- Fixed: Changed `status: isDraft ? "draft" : "recurent"` to `status: isDraft ? "draft" : "final"`
- Manual expenses now correctly save as Draft or Final only

### Task 3: Recurring Expense Flow - VERIFIED CORRECT
**File:** `app/actions/recurring-expenses.ts`
- Recurring expenses use `placeholder` status which displays as "Recurent" badge
- When marked paid in Recurente tab, status changes to `approved` ("Final" badge)
- This behavior is intentional for the Recurente tab month grid only
