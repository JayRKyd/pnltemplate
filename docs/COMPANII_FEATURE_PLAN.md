# Companii (Companies) Feature - Implementation Plan

## ✅ IMPLEMENTATION COMPLETE

All core features have been implemented:

1. ✅ Database tables created (`super_admins`, `companies`)
2. ✅ Server actions for Super Admin & Companies management
3. ✅ "Companii" link in user dropdown (Super Admin only)
4. ✅ Companies list page (`/companies`)
5. ✅ Add company page (`/companies/new`)
6. ✅ Company detail page (`/companies/[id]`)
7. ✅ Invitation acceptance page (`/invite/company/[token]`)
8. ✅ Email invitation system (via Resend API)
9. ✅ Chris F (chris@bono.ro) seeded as initial Super Admin

---

## Overview
This feature allows Super Admins to manage companies/tenants within the Bono P&L application. Only Super Admins can access this section, add new companies, and manage company administrators.

---

## 🔍 Questions Before Implementation

### 1. Company vs Team Relationship
**Question**: Is a "Company" the same as a "Team" in the current Stack Auth setup?
- Currently, the app uses `team_id` for multi-tenancy
- Should each Company = one Team, or is Company a higher-level grouping?

**My Assumption**: Company = Team (1:1 relationship). Each company gets its own `team_id`.

### 2. Super Admin Definition
**Question**: How is Super Admin defined?
- Is it a global role (not tied to a specific team)?
- Should Super Admin be stored in a separate `super_admins` table or as a special role in `team_memberships`?

**My Assumption**: Create a new `super_admins` table with email/user_id to identify Super Admins globally.

### 3. Pre-populated Data
**Question**: Should Bono (your company) be pre-populated?
- You mentioned "the list includes only Bono - our company initially"
- Should your user be auto-assigned as Super Admin?

**My Assumption**: Yes, we'll add a migration to seed Bono as the first company and your email as the first Super Admin.

### 4. Invitation Flow
**Question**: What happens when company admin confirms invitation?
- Do they set a password?
- Do they use Google login?
- What page do they land on?

**My Assumption**: 
1. Admin receives email with invite link
2. Clicks link → lands on invitation acceptance page
3. Sets password OR uses Google OAuth
4. Gets redirected to their company's dashboard
5. Company list shows ✓ checkmark next to confirmed admins

### 5. Budget Structure Display
**Question**: Is the budget structure read-only or editable from this page?
- The second image shows "Structura buget 2026" with categories

**My Assumption**: Read-only display. Budget is created/edited in P&L section, displayed here for reference.

### 6. "Super Admin can add other Super Admins"
**Question**: Where is this UI?
- Is it a separate section?
- Or part of the company admin role dropdown?

**My Assumption**: The "Rol" dropdown in "Adauga companie" shows "Super Admin" option ONLY if the current user is a Super Admin.

---

## 📋 Database Changes

### New Tables

#### 1. `super_admins` table
```sql
CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT -- who added them as super admin
);
```

#### 2. `companies` table (if Company ≠ Team)
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL UNIQUE, -- links to Stack Auth team
  name TEXT NOT NULL,
  admin_name TEXT,
  admin_email TEXT NOT NULL,
  admin_phone TEXT,
  admin_user_id TEXT, -- populated after admin confirms
  status TEXT DEFAULT 'pending', -- pending, active, suspended
  invitation_token TEXT,
  invitation_sent_at TIMESTAMPTZ,
  invitation_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT NOT NULL -- super admin who created it
);
```

### Seed Data
```sql
-- Seed Bono as first company
INSERT INTO companies (team_id, name, admin_name, admin_email, status, created_by)
VALUES (
  '2f7dd8f4-fd8e-4838-b703-e8f4fc5d3a43', 
  'Bono', 
  'Chris F',
  'chris@bono.ro', 
  'active', 
  'system'
);

-- Seed Chris as first Super Admin
INSERT INTO super_admins (user_id, email, full_name)
VALUES (
  '47211099-073b-4d48-b106-7de248b07880', 
  'chris@bono.ro', 
  'Chris F'
);
```

---

## 📁 Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `app/actions/companies.ts` | Server actions for company CRUD |
| `app/actions/super-admin.ts` | Super admin check/management |
| `app/dashboard/[teamId]/companies/page.tsx` | Companies list page |
| `app/dashboard/[teamId]/companies/new/page.tsx` | Add company page |
| `app/invite/company/[token]/page.tsx` | Company admin invitation acceptance |
| `supabase/migrations/XXXX_create_companies.sql` | Database migration |

### Modified Files

| File | Changes |
|------|---------|
| `components/user-dropdown.tsx` | Add "Companii" link (Super Admin only) |
| `app/actions/permissions.ts` | Add `super_admin` role, `canManageCompanies` permission |
| `app/actions/send-invitation.ts` | Add company admin invitation email |

---

## 🎨 UI Components

### 1. Companies List Page (`/dashboard/[teamId]/companies`)
Based on first image:
- Header with X close button and "Companii" title
- White card container with table
- "+ Adauga companie" button (teal gradient)
- Table columns: COMPANIE, ADMIN, EMAIL, USERI
- Each row shows:
  - Company icon (teal circle with building icon)
  - Company name
  - Admin name
  - Admin email
  - User count (in rounded pill)

### 2. Add Company Page (`/dashboard/[teamId]/companies/new`)
Based on second image:
- Header with X close button and "Adauga companie" title
- Two-column layout:

**Left Column - "Informatii companie":**
- Companie (text input)
- Admin (text input)
- Mobil (phone input)
- Rol (dropdown with all roles):
  - Admin
  - Member
  - Approver
  - Level 2
  - Accounting Viewer
  - Super Admin* (only visible if current user is Super Admin)
- Email (text input)
- "Trimite invitatie" button (outline, with send icon)
- "Salveaza" button (teal gradient)

**Right Column - "Structura buget [Year]":**
- CATEGORIE header
- Pulls from company's budget template (`team_budgets` table)
- Categories displayed with codes (e.g., 100, 200, 300...)
- Each has expand arrow (>) for subcategories
- If no budget defined: "Structura buget nu a fost definită încă."

*Super Admin option only visible to Super Admins

---

## 🔐 Access Control

### Super Admin Check
```typescript
// app/actions/super-admin.ts
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('super_admins')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
}
```

### Navigation Visibility
```typescript
// In user-dropdown.tsx
const showCompaniesLink = await isSuperAdmin(currentUser.id);
```

---

## 📧 Email Invitation Flow

### 1. Super Admin clicks "Trimite invitatie"
```
POST /api/companies/invite
{
  companyId: "xxx",
  adminEmail: "admin@newcompany.ro"
}
```

### 2. System generates invitation
- Creates unique token
- Saves to `companies.invitation_token`
- Sends email via Resend

### 3. Email Content
```
Subject: Invitație pentru administrarea companiei [Company Name] în Bono

Body:
Bună ziua [Admin Name],

Ați fost invitat/ă să administrați compania [Company Name] în aplicația Bono P&L.

Apăsați linkul de mai jos pentru a vă activa contul:
[Accept Invitation Button]

Dacă nu ați solicitat această invitație, ignorați acest email.
```

### 4. Admin clicks link → lands on `/invite/company/[token]`
- Validates token
- Shows setup form (password or Google OAuth)
- On success:
  - Updates `companies.status = 'active'`
  - Updates `companies.admin_user_id`
  - Updates `companies.invitation_accepted_at`
  - Creates team membership
  - Redirects to company dashboard

### 5. Companies list shows ✓ for confirmed
- Status column or checkmark icon for `status = 'active'`

---

## 📊 Budget Structure Display

### Data Source
- Reads from `team_budgets` table for the company's team and current year
- Falls back to `team_expense_categories` if no budget exists yet

### Display Logic
```typescript
// Get budget categories for company
const budgetCategories = await getBudgetStructure(company.team_id, currentYear);

// Group by category with codes
// 100 - Cheltuieli de Personal
// 200 - Cheltuieli Operationale
// etc.
```

### User Count Query
```sql
-- Count users from both team_memberships and user_whitelist
SELECT 
  c.team_id,
  c.name,
  (
    SELECT COUNT(DISTINCT user_id) 
    FROM team_memberships 
    WHERE team_id = c.team_id
  ) + (
    SELECT COUNT(*) 
    FROM user_whitelist 
    WHERE team_id = c.team_id AND status = 'pending'
  ) as user_count
FROM companies c;
```

### Empty State
If no budget structure exists:
```
"Structura buget nu a fost definită încă.
Administratorul companiei poate să o creeze în secțiunea P&L."
```

---

## 🔄 Implementation Order

### Phase 1: Database & Backend (Day 1)
1. Create migration for `super_admins` and `companies` tables
2. Seed initial data (Bono + your Super Admin account)
3. Create `app/actions/super-admin.ts`
4. Create `app/actions/companies.ts`
5. Update `app/actions/permissions.ts` with Super Admin role

### Phase 2: UI - Companies List (Day 1-2)
1. Create `/companies` page with table
2. Add "Companii" link to user dropdown (Super Admin only)
3. Style to match Figma design

### Phase 3: UI - Add Company (Day 2)
1. Create `/companies/new` page
2. Left column: Company info form
3. Right column: Budget structure display
4. Form validation

### Phase 4: Invitation System (Day 2-3)
1. Update email templates for company invitations
2. Create invitation acceptance page
3. Handle OAuth + password setup
4. Update company status on acceptance

### Phase 5: Testing (Day 3)
1. Test Super Admin access control
2. Test company creation flow
3. Test invitation email delivery
4. Test invitation acceptance
5. Test budget structure display

---

## ⚠️ Potential Issues

1. **Stack Auth Integration**: Creating new teams programmatically may require Stack Auth API calls
2. **Email Delivery**: Resend needs proper configuration for production
3. **Budget Categories**: Need to decide if categories are per-company or global
4. **User Count**: Need query to count users per company/team

---

## 📝 Notes

- The "Companii" tab should only appear in the dropdown for Super Admins
- Each company admin can only see their own company's data
- Super Admin can see all companies
- Budget structure is created in P&L section, displayed here read-only

---

## ✅ Confirmed Answers

1. **Company = Team**: Yes, same thing - different words
2. **Super Admin**: The person who creates the company/team becomes Super Admin
3. **Bono Team ID**: `2f7dd8f4-fd8e-4838-b703-e8f4fc5d3a43` (has chris@bono.ro as admin)
4. **Budget Categories**: Each company defines their own via budget template (pull from their data)
5. **User Count Source**: Both `team_memberships` AND `user_whitelist` for comprehensive count
6. **Invitation Flow**: Send link → User signs up if needed → Accept in app → DB updates status
7. **Roles in Dropdown**: All existing roles (admin, member, approver, level2, accounting_viewer) + Super Admin (only visible to Super Admins)

---

## 📊 Database Findings

Current teams in database:

| Team ID | User | Email | Role |
|---------|------|-------|------|
| `2f7dd8f4-...` | Chris F | chris@bono.ro | admin |
| `2f7dd8f4-...` | Jay | knowlesjrtest@gmail.com | admin |
| `122bcc81-...` | Bogdan Georgescu | bogdan@bono.ro | member |
| `56b75947-...` | Chris F | chris@bono.ro | admin |
| `89f3a8c1-...` | Jay | knowlesjrtest@gmail.com | admin |
| `aeec4ad3-...` | Jordy Knowles | knowlesjr95@gmail.com | member |

**Main Bono Team**: `2f7dd8f4-fd8e-4838-b703-e8f4fc5d3a43`
