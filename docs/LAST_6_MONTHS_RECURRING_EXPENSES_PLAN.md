# Plan: Dynamic Last 6 Months Display for Recurring Expenses

## Current Implementation
- **Hardcoded months**: `['JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']` (display)
- **Hardcoded month keys**: `['jul', 'aug', 'sep', 'oct', 'nov', 'dec']` (data mapping)
- **Hardcoded month indices**: `[6, 7, 8, 9, 10, 11]` (0-indexed, July-December)
- **Year-based fetching**: `getRecurringExpensesWithPayments(teamId, year)` fetches entire year (Jan 1 - Dec 31)

## Requirements
- Display the **last 6 months** from the current date
- Use **UTC** to avoid timezone issues
- Automatically shift as time progresses (rolling window)

## Implementation Plan

### 1. Frontend: Calculate Last 6 Months (UTC-based)

**Location**: `app/dashboard/[teamId]/expenses/page.tsx`

**Logic**:
```typescript
// Calculate last 6 months from current UTC date
const now = new Date();
const currentUTCMonth = now.getUTCMonth(); // 0-11
const currentUTCYear = now.getUTCFullYear();

// Generate array of last 6 months
const last6Months = [];
for (let i = 5; i >= 0; i--) {
  const monthDate = new Date(Date.UTC(currentUTCYear, currentUTCMonth - i, 1));
  const monthIndex = monthDate.getUTCMonth();
  const year = monthDate.getUTCFullYear();
  
  last6Months.push({
    index: monthIndex, // 0-11 for data mapping
    year: year,
    displayName: ['IAN', 'FEB', 'MAR', 'APR', 'MAI', 'IUN', 'IUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][monthIndex],
    key: ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'][monthIndex]
  });
}
```

**Example** (if today is January 29, 2026 UTC):
- Month 1: August 2025 (index: 7, year: 2025, display: 'AUG', key: 'aug')
- Month 2: September 2025 (index: 8, year: 2025, display: 'SEP', key: 'sep')
- Month 3: October 2025 (index: 9, year: 2025, display: 'OCT', key: 'oct')
- Month 4: November 2025 (index: 10, year: 2025, display: 'NOV', key: 'nov')
- Month 5: December 2025 (index: 11, year: 2025, display: 'DEC', key: 'dec')
- Month 6: January 2026 (index: 0, year: 2026, display: 'IAN', key: 'ian')

### 2. Backend: Update Date Range Fetching

**Location**: `app/actions/recurring-expenses.ts`

**Current**: `getRecurringExpensesWithPayments(teamId, year)` fetches Jan 1 - Dec 31 of that year

**New Approach**: 
- Option A: Keep year-based but fetch expenses for the date range that covers all 6 months
- Option B: Change function signature to accept `startDate` and `endDate`

**Recommended: Option A** (minimal changes)
- Calculate the date range from the 6 months
- Fetch expenses from `firstMonthStart` to `lastMonthEnd`
- Example: If months span Aug 2025 - Jan 2026, fetch from `2025-08-01` to `2026-01-31`

**Implementation**:
```typescript
// In frontend, calculate date range
const firstMonth = last6Months[0];
const lastMonth = last6Months[last6Months.length - 1];
const startDate = `${firstMonth.year}-${String(firstMonth.index + 1).padStart(2, '0')}-01`;
const lastDayOfMonth = new Date(Date.UTC(lastMonth.year, lastMonth.index + 1, 0)).getUTCDate();
const endDate = `${lastMonth.year}-${String(lastMonth.index + 1).padStart(2, '0')}-${lastDayOfMonth}`;

// Pass to backend (modify function to accept date range)
await getRecurringExpensesWithPayments(params.teamId, startDate, endDate);
```

### 3. Backend: Modify Function Signature

**Location**: `app/actions/recurring-expenses.ts`

**Change**:
```typescript
// OLD
export async function getRecurringExpensesWithPayments(
  teamId: string,
  year: number
): Promise<RecurringExpenseWithPayments[]>

// NEW
export async function getRecurringExpensesWithPayments(
  teamId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
): Promise<RecurringExpenseWithPayments[]>
```

**Update query**:
```typescript
// Replace:
const startDate = `${year}-01-01`;
const endDate = `${year}-12-31`;

// With:
// Use provided startDate and endDate parameters
```

### 4. Frontend: Update Month Display & Mapping

**Location**: `app/dashboard/[teamId]/expenses/page.tsx`

**Replace hardcoded arrays**:
```typescript
// OLD
{['JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map(month => ...)}
const monthKeys = ['jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
const monthIndices = [6, 7, 8, 9, 10, 11];

// NEW
{last6Months.map(month => (
  <th key={`${month.year}-${month.index}`}>
    {month.displayName}
  </th>
))}
```

**Update payment status mapping**:
```typescript
// OLD
const monthKey = monthKeys[monthIndex];
payments[monthKey] = exp.payment_status === 'paid';

// NEW
// Need to map expense_date to the correct month in last6Months
last6Months.forEach(monthInfo => {
  const expenseMonth = new Date(exp.expense_date).getUTCMonth();
  const expenseYear = new Date(exp.expense_date).getUTCFullYear();
  
  if (expenseMonth === monthInfo.index && expenseYear === monthInfo.year) {
    payments[monthInfo.key] = exp.payment_status === 'paid';
  }
});
```

### 5. Update Payment Status Toggle

**Location**: `app/dashboard/[teamId]/expenses/page.tsx` and `app/actions/recurring-expenses.ts`

**Current**: Uses `selectedYear` and `monthIndex` (0-11)

**New**: Pass the actual year and month from the clicked cell
```typescript
// When clicking a month cell, pass:
onClick={(e) => {
  e.stopPropagation();
  const monthInfo = last6Months[monthIndex];
  setRecurringPaymentModal({
    // ...
    year: monthInfo.year,
    monthIndex: monthInfo.index
  });
}}
```

### 6. Edge Cases to Handle

1. **Year boundary crossing**: Months can span two years (e.g., Nov 2025 - Apr 2026)
2. **UTC consistency**: Always use UTC methods (`getUTCMonth()`, `getUTCFullYear()`, `Date.UTC()`)
3. **Month calculation**: When subtracting months, handle year rollover correctly
4. **Date range**: Ensure backend fetches all expenses that fall within the 6-month window

## Summary of Changes

### Files to Modify:
1. **`app/dashboard/[teamId]/expenses/page.tsx`**
   - Add `useMemo` to calculate `last6Months` array
   - Replace hardcoded month arrays with dynamic `last6Months`
   - Update date range calculation for backend call
   - Update payment status mapping logic
   - Update month cell click handler

2. **`app/actions/recurring-expenses.ts`**
   - Change function signature from `(teamId, year)` to `(teamId, startDate, endDate)`
   - Update date filtering logic
   - Update payment mapping to handle year boundaries

### Testing Considerations:
- Test with current date in different months
- Test year boundary crossing (e.g., December → January)
- Verify UTC handling doesn't cause timezone issues
- Ensure payment status updates work correctly for all 6 months

## Benefits
- ✅ Always shows relevant recent months
- ✅ Automatically updates as time progresses
- ✅ UTC-based prevents timezone confusion
- ✅ Works across year boundaries
