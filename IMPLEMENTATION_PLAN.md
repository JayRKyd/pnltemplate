# Recurring Expenses Implementation Plan

## Overview
Implement the instance-based recurring expenses system with conversion workflow, following existing UI patterns.

---

## Phase 1: Backend Actions (TypeScript Server Actions)

### 1.1 New File: `app/actions/recurring-instances.ts`

**Functions to implement:**

```typescript
// Get all instances for a template with status
export async function getRecurringInstances(
  templateId: string,
  teamId: string,
  year?: number
): Promise<RecurringInstance[]>

// Get open instances that need attention (for warnings)
export async function getOpenInstances(
  teamId: string,
  beforeMonth?: { year: number; month: number }
): Promise<RecurringInstanceWithWarning[]>

// Get single instance by ID
export async function getInstanceById(
  instanceId: string,
  teamId: string
): Promise<RecurringInstance | null>

// MAIN WORKFLOW: Convert open instance to final expense
export async function convertToFinalExpense(
  instanceId: string,
  teamId: string,
  expenseData: ExpenseInput,
  confirmAmountDifference?: boolean
): Promise<ConvertResult>

// Reopen instance when final expense is deleted
export async function reopenInstance(
  instanceId: string,
  teamId: string
): Promise<void>

// Generate instances for a specific month
export async function generateMonthlyInstances(
  teamId: string,
  targetMonth: Date
): Promise<number>
```

**Types needed:**

```typescript
interface RecurringInstance {
  id: string;
  team_id: string;
  template_id: string;
  instance_year: number;
  instance_month: number;
  status: 'open' | 'closed';

  // Expected values (snapshot from template)
  expected_amount: number;
  expected_amount_without_vat: number | null;
  expected_amount_with_vat: number | null;
  expected_vat_rate: number | null;
  expected_vat_deductible: boolean;
  expected_currency: string;
  expected_category_id: string | null;
  expected_subcategory_id: string | null;
  expected_supplier: string | null;
  expected_description: string | null;

  // Closing data
  final_expense_id: string | null;
  closed_at: string | null;
  closed_by: string | null;
  amount_difference_percent: number | null;

  created_at: string;
  updated_at: string;
}

interface ConvertResult {
  requiresConfirmation?: boolean;
  amountDifferencePercent?: number;
  expectedAmount?: number;
  actualAmount?: number;
  expense?: TeamExpense;
  suggestNewTemplate?: boolean;
}
```

**Convert workflow logic:**

1. Fetch instance and validate it's open
2. Calculate amount difference (use P&L amount: without_vat if deductible, with_vat otherwise)
3. If difference > 10% and not confirmed:
   - Return `{ requiresConfirmation: true, amountDifferencePercent, ... }`
4. Create final expense with:
   - `status = 'final'`
   - `recurring_instance_id = instanceId`
   - All data from expenseData
5. Update instance:
   - `status = 'closed'`
   - `final_expense_id = expense.id`
   - `closed_at = now()`
   - `amount_difference_percent = calculated`
6. Return `{ expense, suggestNewTemplate: diffPercent > 10 }`

---

### 1.2 Modify: `app/actions/recurring-expenses.ts`

**Add versioning functions:**

```typescript
// Update template with versioning (FR-8)
export async function updateRecurringTemplateVersioned(
  id: string,
  teamId: string,
  updates: Partial<RecurringExpenseInput>
): Promise<RecurringExpense>

// Get version history for a template
export async function getTemplateVersionHistory(
  templateId: string,
  teamId: string
): Promise<RecurringExpense[]>
```

**Logic for updateRecurringTemplateVersioned:**

1. Get current template
2. Mark as superseded:
   - `superseded_at = NOW()`
   - `is_active = false`
3. Create new template:
   - Copy all fields from old
   - Apply updates
   - `version = old.version + 1`
   - `previous_version_id = old.id`
   - `is_active = true`
4. Update old template:
   - `superseded_by_id = new.id`
5. Return new template

**Note:** Past instances remain unchanged (they have snapshot values).

---

### 1.3 Modify: `app/actions/expenses.ts`

**Update `deleteExpense` function (FR-7):**

```typescript
// After soft-deleting the expense (setting deleted_at):
if (expense.recurring_instance_id) {
  await reopenInstance(expense.recurring_instance_id);
}
```

---

### 1.4 Modify: `app/actions/pnl-data.ts`

**Update the expense query in `_fetchPnlDashboardData` and `getPnlData`:**

**Current query:**
```typescript
supabase
  .from("team_expenses")
  .select(...)
  .in("status", ["approved", "paid", "pending", "draft", "recurent", "final"])
```

**New query logic (UNION approach):**

```typescript
// Build expense list with instance/final logic
const expensesData = await buildPnlExpenses(teamId, prevYear, baseYear);

async function buildPnlExpenses(teamId: string, prevYear: number, baseYear: number) {
  // 1. Get final expenses from closed instances
  const { data: finalExpenses } = await supabase
    .from("team_expenses")
    .select("*, recurring_instances!inner(status)")
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .eq("recurring_instances.status", "closed")
    .or(`expense_date.gte.${prevYear}-01-01,accounting_period.gte.${prevYear}-01`)
    .or(`expense_date.lte.${baseYear}-12-31,accounting_period.lte.${baseYear}-12`);

  // 2. Get open instances as pseudo-expenses
  const { data: openInstances } = await supabase
    .from("recurring_instances")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "open")
    .gte("instance_year", prevYear)
    .lte("instance_year", baseYear);

  // 3. Get regular expenses (not part of recurring system)
  const { data: regularExpenses } = await supabase
    .from("team_expenses")
    .select(...)
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .is("recurring_instance_id", null)
    .is("recurring_expense_id", null)
    .in("status", ["approved", "paid", "pending", "draft", "final"])
    .or(`expense_date.gte.${prevYear}-01-01,accounting_period.gte.${prevYear}-01`)
    .or(`expense_date.lte.${baseYear}-12-31,accounting_period.lte.${baseYear}-12`);

  // Convert open instances to expense-like format
  const instanceExpenses = openInstances?.map(ri => ({
    id: ri.id,
    expense_date: `${ri.instance_year}-${String(ri.instance_month).padStart(2, '0')}-01`,
    accounting_period: `${ri.instance_year}-${String(ri.instance_month).padStart(2, '0')}`,
    amount: ri.expected_amount,
    amount_without_vat: ri.expected_amount_without_vat,
    amount_with_vat: ri.expected_amount_with_vat,
    vat_deductible: ri.expected_vat_deductible,
    category_id: ri.expected_category_id,
    subcategory_id: ri.expected_subcategory_id,
    supplier: ri.expected_supplier,
    description: ri.expected_description,
    status: 'recurent',
    is_recurring_placeholder: true,
  })) || [];

  return [...finalExpenses, ...instanceExpenses, ...regularExpenses];
}
```

**Key change:** P&L now shows exactly one value per month per template:
- Closed instance → shows final expense
- Open instance → shows expected amount from instance

---

## Phase 2: UI Components

### 2.1 New Component: `components/expenses/convert-recurring-dialog.tsx`

**Purpose:** Modal dialog for converting open instance to final expense.

**UI Pattern (matching existing modals):**
- Fixed position overlay with backdrop blur
- White card (border-radius: 16px)
- Two-button footer (Anulează / Confirmă)
- Form prefilled from instance data

**Props:**
```typescript
interface ConvertRecurringDialogProps {
  isOpen: boolean;
  onClose: () => void;
  instance: RecurringInstance;
  teamId: string;
  onSuccess: (expense: TeamExpense) => void;
}
```

**Layout:**
```
┌─────────────────────────────────────┐
│ ✕  Confirmă Cheltuială Recurentă   │
├─────────────────────────────────────┤
│                                     │
│ Furnizor: [prefilled]               │
│ Suma așteptată: 1.234,56 Lei        │
│                                     │
│ 📎 Încarcă Document (required)      │
│                                     │
│ Suma finală cu TVA: [editable]      │
│ Suma fără TVA: [editable]           │
│ TVA Deductibil: Da/Nu toggle        │
│                                     │
│ Cont: [dropdown, prefilled]         │
│ Subcont: [dropdown, prefilled]      │
│                                     │
│ ┌ Anulează ┐  ┌ Confirmă ┐          │
│ └──────────┘  └──────────┘          │
└─────────────────────────────────────┘
```

**Features:**
- File upload required (no documents = error)
- Amount fields editable
- VAT calculation same as NewExpenseForm
- On save:
  1. Call `convertToFinalExpense()`
  2. If `requiresConfirmation`, show amount diff dialog
  3. If success, close and refresh list

---

### 2.2 New Component: `components/expenses/amount-difference-dialog.tsx`

**Purpose:** Confirmation when amount differs >10% from expected.

**UI Pattern:**
- Same modal style as existing confirmation dialogs
- Red warning badge
- Three buttons: Anulează / Confirmă oricum / Actualizează template

**Props:**
```typescript
interface AmountDifferenceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  expectedAmount: number;
  actualAmount: number;
  differencePercent: number;
  onConfirm: () => void;
  onUpdateTemplate: () => void;
}
```

**Layout:**
```
┌─────────────────────────────────────┐
│  ⚠️  Diferență de sumă detectată    │
├─────────────────────────────────────┤
│                                     │
│ Suma reală (1.500,00 Lei) diferă    │
│ cu 15% față de suma așteptată       │
│ (1.300,00 Lei).                     │
│                                     │
│ Vrei să actualizezi template-ul     │
│ recurent cu noua sumă?              │
│                                     │
│ ┌─────────┐ ┌────────────┐ ┌──────┐│
│ │Anulează │ │Confirmă    │ │Update││
│ │         │ │oricum      │ │Templ.││
│ └─────────┘ └────────────┘ └──────┘│
└─────────────────────────────────────┘
```

**Button actions:**
- Anulează → close dialog, go back to edit amounts
- Confirmă oricum → call `convertToFinalExpense(confirmDiff=true)`
- Actualizează template → call `updateRecurringTemplateVersioned()` with new amount, then convert

---

### 2.3 Modify: `app/dashboard/[teamId]/expenses/page.tsx` (Expense List)

**Changes needed:**

1. **Add warning indicator for overdue open instances**

```typescript
// In the expense row rendering:
{expense.status === 'recurent' && isOverdue(expense) && (
  <div style={{
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#FEE2E2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <X size={12} style={{ color: '#DC2626' }} />
  </div>
)}

function isOverdue(expense: any): boolean {
  // If expense is recurring instance, check if month is past
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Parse expense month from accounting_period or expense_date
  const expenseDate = new Date(expense.expense_date);
  const expenseYear = expenseDate.getFullYear();
  const expenseMonth = expenseDate.getMonth() + 1;

  return (expenseYear < currentYear) ||
         (expenseYear === currentYear && expenseMonth < currentMonth);
}
```

2. **Make clicking open instance open convert dialog**

```typescript
const handleRowClick = (expense: TeamExpenseListItem) => {
  if (expense.status === 'recurent' && expense.recurring_instance_id) {
    // Open convert dialog
    setSelectedInstance(expense.recurring_instance_id);
    setShowConvertDialog(true);
  } else {
    // Navigate to detail page
    router.push(`/dashboard/${teamId}/expenses/${expense.id}`);
  }
};
```

3. **Add filter for "Neconfirmate" (unconfirmed)**

```typescript
// Add to filter panel
<button
  onClick={() => setStatusFilter('neconfirmate')}
  style={{
    padding: '8px 16px',
    borderRadius: '9999px',
    backgroundColor: statusFilter === 'neconfirmate' ? 'rgba(252, 231, 243, 1)' : 'white',
    border: '1px solid rgba(229, 231, 235, 1)',
    color: statusFilter === 'neconfirmate' ? 'rgba(190, 24, 93, 1)' : 'rgba(107, 114, 128, 1)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  }}
>
  Neconfirmate
</button>

// In filter logic:
if (statusFilter === 'neconfirmate') {
  filtered = filtered.filter(e => e.status === 'recurent');
}
```

---

### 2.4 Modify: `app/dashboard/[teamId]/expenses/recurring/[id]/page.tsx`

**Changes needed:**

1. **Show instance status grid instead of just payment status**

Replace the monthly payments grid (right column) with instance status grid:

```typescript
// Load instances instead of generated expenses
const [instances, setInstances] = useState<RecurringInstance[]>([]);

useEffect(() => {
  async function loadInstances() {
    const currentYear = new Date().getFullYear();
    const instances = await getRecurringInstances(params.id, params.teamId, currentYear);
    setInstances(instances);
  }
  loadInstances();
}, [params.id, params.teamId]);

// Render 12 months with instance status
const romanianMonths = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];

{romanianMonths.map((monthName, monthIndex) => {
  const instance = instances.find(i => i.instance_month === monthIndex + 1);
  const isClosed = instance?.status === 'closed';
  const isOpen = instance?.status === 'open';

  return (
    <div
      key={monthName}
      onClick={() => instance && isOpen && openConvertDialog(instance)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        cursor: isOpen ? 'pointer' : 'default',
        borderBottom: monthIndex < 11 ? '1px solid rgba(243, 244, 246, 1)' : 'none'
      }}
    >
      <span style={{ fontSize: '14px', color: 'rgba(55, 65, 81, 1)' }}>
        {monthName} {currentYear}
      </span>

      {isClosed && (
        <div style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          backgroundColor: 'rgba(209, 250, 229, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Check size={14} style={{ color: 'rgba(5, 150, 105, 1)' }} />
        </div>
      )}

      {isOpen && (
        <div style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          backgroundColor: 'rgba(254, 226, 226, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <X size={14} style={{ color: 'rgba(220, 38, 38, 1)' }} />
        </div>
      )}

      {!instance && (
        <div style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          backgroundColor: 'rgba(243, 244, 246, 1)',
          border: '1px dashed rgba(209, 213, 220, 1)'
        }} />
      )}
    </div>
  );
})}
```

2. **Click open month opens convert dialog**

```typescript
const [showConvertDialog, setShowConvertDialog] = useState(false);
const [selectedInstance, setSelectedInstance] = useState<RecurringInstance | null>(null);

function openConvertDialog(instance: RecurringInstance) {
  setSelectedInstance(instance);
  setShowConvertDialog(true);
}

// Render dialog
{showConvertDialog && selectedInstance && (
  <ConvertRecurringDialog
    isOpen={showConvertDialog}
    onClose={() => setShowConvertDialog(false)}
    instance={selectedInstance}
    teamId={params.teamId}
    onSuccess={() => {
      setShowConvertDialog(false);
      // Reload instances
      loadInstances();
    }}
  />
)}
```

3. **Edit button shows versioning confirmation**

```typescript
const [showEditConfirm, setShowEditConfirm] = useState(false);

// Edit confirmation dialog
{showEditConfirm && (
  <div style={{ /* modal styles */ }}>
    <h2>Confirmă modificarea</h2>
    <p>
      Modificările se vor aplica doar de la luna curentă înainte.
      Lunile anterioare rămân neschimbate.
    </p>
    <p style={{ fontSize: '14px', color: 'rgba(107, 114, 128, 1)' }}>
      Se va crea o nouă versiune a template-ului recurent.
    </p>
    <button onClick={handleSaveVersioned}>Confirmă</button>
  </div>
)}

async function handleSaveVersioned() {
  await updateRecurringTemplateVersioned(params.id, params.teamId, {
    // updated fields
  });
  router.push(`/dashboard/${params.teamId}/expenses?tab=Recurente`);
}
```

---

## Phase 3: Testing Checklist

### Database
- [ ] Run all 6 migrations successfully
- [ ] Verify `recurring_instances` table created
- [ ] Verify unique constraint on (template_id, year, month)
- [ ] Verify data migration created instances from existing placeholders

### Backend Actions
- [ ] `generateMonthlyInstances()` creates instances for current month
- [ ] `getRecurringInstances()` returns instances with correct status
- [ ] `getOpenInstances()` filters by month correctly
- [ ] `convertToFinalExpense()` creates expense and closes instance
- [ ] Amount difference >10% returns requiresConfirmation
- [ ] `reopenInstance()` reopens when final expense deleted
- [ ] `updateRecurringTemplateVersioned()` creates new version

### P&L Integration
- [ ] P&L shows only one value per month per template
- [ ] Closed instance shows final expense amount
- [ ] Open instance shows expected amount
- [ ] Regular expenses still appear correctly
- [ ] Category totals correct with instances

### UI - Expense List
- [ ] Open instances show "Recurent" status badge (pink)
- [ ] Overdue open instances show red X warning
- [ ] Clicking open instance opens convert dialog
- [ ] "Neconfirmate" filter shows only open instances

### UI - Recurring Detail Page
- [ ] Monthly grid shows Check (green) for closed instances
- [ ] Monthly grid shows X (red) for open instances
- [ ] Clicking open month opens convert dialog
- [ ] Edit shows versioning confirmation

### UI - Convert Dialog
- [ ] Form prefills from instance data
- [ ] File upload required
- [ ] Amount difference >10% shows confirmation dialog
- [ ] Success closes dialog and refreshes list

### Edge Cases
- [ ] Concurrent instance close (two users convert same instance)
- [ ] Delete final expense reopens instance
- [ ] Template edit doesn't affect past instances
- [ ] Timezone handling (use integer year/month)
- [ ] Multiple templates for same supplier don't conflict

---

## Implementation Order

1. ✅ **Database migrations** (DONE - already run)
2. **Backend actions** (3-4 hours):
   - Create `recurring-instances.ts`
   - Modify `recurring-expenses.ts` (versioning)
   - Modify `expenses.ts` (reopen on delete)
   - Modify `pnl-data.ts` (instance/final logic)
3. **UI components** (4-5 hours):
   - Create `convert-recurring-dialog.tsx`
   - Create `amount-difference-dialog.tsx`
4. **UI modifications** (2-3 hours):
   - Modify expense list (warnings, click handler, filter)
   - Modify recurring detail (instance grid, convert trigger)
5. **Testing** (2-3 hours):
   - Test full workflow end-to-end
   - Test edge cases
   - Verify P&L correctness

**Total estimate:** 11-15 hours

---

## Files to Create/Modify

### New Files (2):
- `app/actions/recurring-instances.ts`
- `components/expenses/convert-recurring-dialog.tsx`
- `components/expenses/amount-difference-dialog.tsx`

### Modified Files (4):
- `app/actions/recurring-expenses.ts` (add versioning)
- `app/actions/expenses.ts` (add reopen on delete)
- `app/actions/pnl-data.ts` (update query logic)
- `app/dashboard/[teamId]/expenses/page.tsx` (add warnings, convert trigger)
- `app/dashboard/[teamId]/expenses/recurring/[id]/page.tsx` (instance grid)

---

## UI Design Patterns to Follow

**Colors:**
- Primary gradient: `linear-gradient(180deg, rgba(0, 212, 146, 1) 0%, rgba(81, 162, 255, 1) 100%)`
- Teal accent: `rgba(17, 198, 182, 1)`
- Status badges:
  - Final (green): `linear-gradient(180deg, rgba(192, 245, 229, 1) 0%, rgba(122, 231, 201, 1) 100%)`
  - Draft (yellow): `linear-gradient(180deg, rgba(255, 247, 196, 1) 0%, rgba(255, 209, 111, 1) 100%)`
  - Recurent (pink): `linear-gradient(180deg, rgba(255, 224, 238, 1) 0%, rgba(255, 179, 217, 1) 100%)`

**Typography:**
- Font: Inter, sans-serif
- Base size: 14px
- Headings: 15-20px, weight 600
- Labels: 14px, weight 400, color rgba(107, 114, 128, 1)

**Components:**
- Input border-radius: 10px
- Button border-radius: 9999px (pill shape)
- Card border-radius: 20px
- Modal border-radius: 16px
- Modal backdrop: `rgba(0, 0, 0, 0.3)` with `backdrop-filter: blur(4px)`

**Spacing:**
- Base unit: 4px
- Common gaps: 8px, 12px, 16px, 20px, 28px
- Card padding: 28px
- Modal padding: 32px

**All text in Romanian** - Use existing patterns for Romanian translations.

---

## Next Step

Ready to implement? I'll start with:
1. Backend actions (`recurring-instances.ts`)
2. Then UI components
3. Then modifications to existing files

Confirm to proceed with coding! 🚀
