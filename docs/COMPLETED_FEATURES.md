# Completed Features Documentation

> **Last Updated:** January 26, 2026  
> **Version:** 1.0

---

## Table of Contents

1. [Recurring Expenses Feature](#-recurring-expenses-feature)
2. [P&L Integration (Real Data)](#-pl-integration-real-data)
3. [Budget Template System](#-budget-template-system)
4. [Companies (Companii) Feature](#-companies-companii-feature)
5. [Document Preview](#-document-preview)

---

## 🔄 Recurring Expenses Feature

### Overview
The recurring expenses feature allows users to create and manage expenses that repeat monthly (e.g., rent, subscriptions, salaries). Each recurring expense generates monthly placeholders that can be marked as paid or unpaid.

### Backend Implementation

#### Database Table
- **Table:** `team_recurring_expenses`
- **Migration:** `0017_fix_recurring_expenses_refs.sql` - Fixed foreign key references to `team_expense_categories`

#### Server Actions (`app/actions/recurring-expenses.ts`)

| Function | Description |
|----------|-------------|
| `getRecurringExpensesWithPayments()` | Fetches all recurring expenses for a team with their monthly payment statuses |
| `updateRecurringPaymentStatus()` | Toggles payment status (paid/unpaid) for a specific month |
| `createRecurringExpense()` | Creates a new recurring expense record |
| `updateRecurringExpense()` | Updates an existing recurring expense |
| `deleteRecurringExpense()` | Soft-deletes a recurring expense |

#### RPC Function
- **Function:** `generate_recurring_placeholders`
- Generates monthly placeholder expenses from recurring templates

#### Bug Fixes
- ✅ Fixed table name inconsistencies (`recurring_expenses` → `team_recurring_expenses`)
- ✅ Fixed RPC function name reference
- ✅ Fixed foreign key references to use `team_expense_categories`

### UI Implementation

#### Pages

**1. Recurring Expense Detail/Edit Page**
- **Path:** `/expenses/recurring/[id]/page.tsx`
- **Features:**
  - Two-column layout (form fields + monthly status grid)
  - X close button with navigation back to expenses
  - "DECONT RECURENT" title header
  - Activ/Inactiv toggle switch
  - "Salveaza" button with loading state
  - 12-month payment status grid (Jan-Dec)
  - Clickable checkmark/X icons to toggle payment status

**2. New Recurring Expense Page**
- **Path:** `/expenses/recurring/new/page.tsx`
- **Features:**
  - Identical UI to edit page
  - Creates new recurring expense on save
  - Form fields: Furnizor, Suma cu TVA, Suma fara TVA, TVA Deductibil, Cota TVA, Cont, Subcont, Descriere

#### Expenses List Integration
- **Path:** `/expenses/page.tsx` (Recurente tab)
- **Features:**
  - Table displays real data from `getRecurringExpensesWithPayments()`
  - Monthly payment status icons (✓/✕) for each row
  - Icons are clickable with confirmation modal
  - Row click navigates to detail page
  - Pagination shows correct count for recurring expenses

#### Payment Status Modal
- Confirmation dialog before changing payment status
- Shows expense name, amount, and target month
- "Confirma" and "Anuleaza" buttons

---

## 📊 P&L Integration (Real Data)

### Overview
The P&L (Profit & Loss) feature displays financial data across three views: Realizat (Actual), Budget, and Delta (Variance). All views now pull real data from the database.

### Server Actions (`app/actions/pnl-data.ts`)

#### Data Interfaces

```typescript
interface PnlCategory {
  id: string;
  name: string;
  values: number[]; // 24 months (12 prev year + 12 current year)
  subcategories: { id: string; name: string; values: number[]; }[];
}

interface PnlData {
  cheltuieli: number[];      // Total expenses per month
  categories: PnlCategory[]; // Expense categories with values
  venituri: number[];        // Revenue per month
  budget: number[];          // Budget per month
  budgetCategories: PnlCategory[];
  expenses: PnlExpense[];    // Detailed expenses for popup
}
```

#### Functions

| Function | Description |
|----------|-------------|
| `getPnlData(teamId, year)` | Fetches complete P&L data for a team and year |
| `updateRevenue(teamId, year, month, amount)` | Saves revenue changes to database |

### P&L Page Updates (`app/dashboard/[teamId]/pnl/page.tsx`)

- Fetches real data on component mount
- Passes data to `PLStatement` component
- Handles revenue updates with `handleVenituriChange`
- Handles budget template saves with `handleSaveBudgetTemplate`

### PLStatement Component Updates (`testcode/plstatement.tsx`)

#### Props Added
```typescript
interface PLStatementProps {
  // ... existing props
  realData?: RealPnlData;
  teamId?: string;
  onSaveBudgetTemplate?: (teamId: string, template: BudgetTemplate) => Promise<{ success: boolean; error?: string }>;
}
```

#### Tab Functionality

| Tab | Data Source | Features |
|-----|-------------|----------|
| **Realizat** | Real expenses from DB | Shows actual expense totals by category |
| **Budget** | Budget values from DB | Displays planned budget values |
| **Delta** | Calculated difference | Shows variance between actual and budget |

#### Invoice Popup
- Clicking on a category value opens popup
- Shows real expense records for that category/month
- Displays: Date, Supplier, Description, Invoice Number, Amount, Status

### Bug Fixes
- ✅ Fixed type error with `ExpenseRecord` interface for nullable arrays

---

## 💰 Budget Template System

### Overview
The budget template system allows teams to define their expense category structure (Venituri and Cheltuieli categories with subcategories). This structure is used for expense categorization and P&L reporting.

### Database Changes

#### Migration: `0018_add_category_type_column.sql`
```sql
ALTER TABLE public.team_expense_categories
ADD COLUMN IF NOT EXISTS category_type TEXT DEFAULT 'cheltuieli';

-- Constraint for valid values
ALTER TABLE public.team_expense_categories
ADD CONSTRAINT chk_category_type CHECK (category_type IN ('venituri', 'cheltuieli'));
```

### Server Actions (`app/actions/budget-template.ts`)

| Function | Description |
|----------|-------------|
| `loadBudgetTemplate(teamId)` | Loads existing category structure from DB |
| `saveBudgetTemplate(teamId, template)` | Saves category structure to DB |
| `getExpenseCategories(teamId)` | Gets expense (cheltuieli) categories |
| `getPnlCategories(teamId)` | Gets revenue (venituri) categories |

### Budget Page (`app/dashboard/[teamId]/budget/page.tsx`)

#### Features
- Loads existing template on mount
- Shows loading spinner during fetch
- Displays save progress overlay
- Error messages for failed operations
- Success alert on save

#### Data Flow
1. Page loads → calls `loadBudgetTemplate(teamId)`
2. User edits categories in form
3. User clicks "Salvează Template"
4. Form calls `onSave` prop → page calls `saveBudgetTemplate()`
5. Data persisted to `team_expense_categories` table

### BudgetTemplateForm Component (`testcode/budgettemplateform.tsx`)

#### Updates
- `handleSave` is now `async`
- Awaits `onSave` prop before completing
- Prevents premature form close

### P&L Integration
- Budget template form accessible from P&L page
- Changes saved via `onSaveBudgetTemplate` prop
- Success/error alerts shown to user

---

## 🏢 Companies (Companii) Feature

### Overview
Super Admins can manage companies (teams) in the system, including creating new companies and inviting their first administrators.

### Access Control
- Only Super Admins can access `/companies` routes
- Super Admin check via `super_admins` table

### Companies List Page (`/companies`)

#### Features
- Lists all companies in the system
- Shows company name, admin email, user count
- "Adaugă companie" button to create new company
- Clean UI matching Figma mockups

### Add Company Page (`/companies/new`)

#### Form Fields
- Company Name
- Admin Email
- Admin Full Name
- Role Selection (dropdown with available roles)

#### Features
- Form validation
- Send invitation email on submit
- Budget structure preview (empty state for new companies)
- Cancel/Save buttons

### Invitation System
- New admin receives email invitation
- Admin can accept and set password
- Invitation status tracked in database

### Testing
- `knowlesjrtest@gmail.com` added as Super Admin for testing

---

## 🖼️ Document Preview

### Overview
The expense entry form includes a document preview panel that displays uploaded invoices, receipts, and other documents.

### Location
- **Component:** `components/expenses/new-expense-form.tsx`
- **Position:** Right panel of expense form

### Supported Formats

| Format | Viewer | Features |
|--------|--------|----------|
| **PDF** | iframe | Native browser PDF controls |
| **Images** | img tag | Custom zoom controls |

### Image Preview Features

#### Zoom Controls
- **Fit** - Fits image to container width (100%)
- **150%** - 1.5x zoom
- **200%** - 2x zoom
- Visual indicator for active zoom level

#### Scrolling
- Container uses `overflow: scroll` when zoomed
- Image wrapped in container with `minWidth` based on zoom
- Both horizontal and vertical scrolling enabled
- Smooth transition on zoom change

#### Implementation
```typescript
<div style={{ 
  flex: 1, 
  overflow: imageZoom > 1 ? 'scroll' : 'auto',
  position: 'relative',
  padding: '60px 16px'
}}>
  <div style={{
    minWidth: imageZoom > 1 ? `${700 * imageZoom}px` : '100%',
    display: 'flex',
    justifyContent: imageZoom > 1 ? 'flex-start' : 'center',
    alignItems: imageZoom > 1 ? 'flex-start' : 'center'
  }}>
    <img 
      src={preview} 
      style={{ 
        width: imageZoom === 1 ? '100%' : `${700 * imageZoom}px`,
        transition: 'width 0.2s ease'
      }} 
    />
  </div>
</div>
```

### Multi-File Support

#### Features
- Upload multiple documents per expense
- Navigation dots at bottom of preview
- Click dot to switch between files
- Zoom resets to 100% when switching files

#### File Management
- Shows filename with delete (✕) icon
- Re-upload replaces file at same index
- Files shared across all line items in multi-line expenses

---

## File References

### Server Actions
- `app/actions/recurring-expenses.ts`
- `app/actions/pnl-data.ts`
- `app/actions/budget-template.ts`

### Pages
- `app/dashboard/[teamId]/expenses/page.tsx`
- `app/dashboard/[teamId]/expenses/recurring/[id]/page.tsx`
- `app/dashboard/[teamId]/expenses/recurring/new/page.tsx`
- `app/dashboard/[teamId]/pnl/page.tsx`
- `app/dashboard/[teamId]/budget/page.tsx`
- `app/companies/page.tsx`
- `app/companies/new/page.tsx`

### Components
- `testcode/plstatement.tsx`
- `testcode/budgettemplateform.tsx`
- `components/expenses/new-expense-form.tsx`

### Migrations
- `supabase/migrations/0017_fix_recurring_expenses_refs.sql`
- `supabase/migrations/0018_add_category_type_column.sql`

---

## Notes

- All features are fully functional with real database operations
- Mock data is only used as fallback when real data is empty
- Current month is set to **January 2026** for P&L views
- All dates and year references updated to 2025-2026 timeframe
