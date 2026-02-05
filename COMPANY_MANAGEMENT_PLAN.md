# Company Management Implementation Plan

## Executive Summary

This plan implements a **three-tier role-based company management system**:
1. **Super-Admin** (Global) - BONO internal team, manages all companies
2. **Company Admin** - Manages their own company, users, and budget
3. **Company User** - View-only access to their company

---

## Current State Analysis

### ✅ What Exists

| Component | Status | Notes |
|-----------|--------|-------|
| Multi-tenant foundation | ✅ Complete | Stack Auth + Supabase |
| Role system (5 roles) | ✅ Complete | admin, approver, member, level2, accounting_viewer |
| Company CRUD | ✅ Partial | Super-admin can create/view companies |
| Team member management | ✅ Exists | `/dashboard/[teamId]/team` page |
| User whitelist | ✅ Recent | Added 2026-01-19 |
| Permission checks | ✅ Complete | `getUserPermissions()`, `canPerformAction()` |

### ❌ What's Missing

| Component | Gap | Priority |
|-----------|-----|----------|
| Companies table migration | Not in migration files | 🔴 Critical |
| Super-Admin dashboard | No global analytics/overview | 🟡 High |
| Company Admin dashboard | No company-specific admin home | 🔴 Critical |
| Role assignment UI | Backend exists, no UI | 🟡 High |
| Company settings page | Can't edit company after creation | 🔴 Critical |
| Budget management UI | Referenced but not built | 🟡 High |
| Audit logs | No tracking of admin actions | 🟢 Medium |

---

## Roles & Permissions Matrix

### Role Mapping

| Your Spec Role | Maps To | Existing System |
|----------------|---------|-----------------|
| **Super-Admin** | NEW | Super-admin table exists, minimal functionality |
| **Company Admin** | **admin** role | Exists in permissions.ts, has full access |
| **Company User** | **member** or **accounting_viewer** | member (create expenses) or accounting_viewer (view-only) |
| **Accountant** | **accounting_viewer** | View-only, can download attachments |

### Permissions by Role

| Capability | Super-Admin | Company Admin | Company User |
|-----------|-------------|---------------|--------------|
| **Global Level** | | | |
| See Companies list | ✅ | ❌ | ❌ |
| Create company | ✅ | ❌ | ❌ |
| Manage Super-Admins | ✅ | ❌ | ❌ |
| View all company stats | ✅ | ❌ | ❌ |
| **Company Level** | | | |
| Access company page | ✅ | ✅ | ✅ (view-only) |
| Edit company info | ✅ | ✅ | ❌ |
| Manage users | ✅ | ✅ | ❌ |
| Assign roles | ✅ | ✅ | ❌ |
| Manage budget | ✅ | ✅ | ❌ |
| View budget | ✅ | ✅ | ✅ |
| View P&L | ✅ | ✅ | Depends on role |
| **User Management** | | | |
| Invite users | ✅ | ✅ | ❌ |
| Activate/Deactivate users | ✅ | ✅ | ❌ |
| Change roles | ✅ | ✅ | ❌ |

---

## Implementation Phases

### Phase 1: Database Foundation (Critical)

**Priority:** 🔴 Critical
**Estimated Time:** 2-3 hours

#### 1.1 Ensure Tables Exist

Create migrations for tables that may be missing:

**File:** `supabase/migrations/0036_ensure_company_tables.sql`

```sql
-- Ensure companies table exists
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  admin_phone TEXT,
  admin_user_id TEXT,
  admin_role TEXT DEFAULT 'admin',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  invitation_token TEXT UNIQUE,
  invitation_sent_at TIMESTAMPTZ,
  invitation_accepted_at TIMESTAMPTZ,
  created_by TEXT, -- super_admin user_id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure super_admins table exists
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_by TEXT, -- previous super_admin user_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_companies_team_id ON companies(team_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON companies(created_by);
CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON super_admins(user_id);

-- RLS Policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Super-admins can do everything
CREATE POLICY IF NOT EXISTS "Super-admins can manage companies"
  ON companies FOR ALL
  USING (true) -- Will check super-admin status in app layer
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Super-admins can manage super-admins"
  ON super_admins FOR ALL
  USING (true)
  WITH CHECK (true);
```

#### 1.2 Add Audit Log Table

**File:** `supabase/migrations/0037_company_audit_log.sql`

```sql
CREATE TABLE company_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'user_invited', 'role_changed', etc.
  entity_type TEXT NOT NULL, -- 'company', 'user', 'role', 'budget'
  entity_id TEXT,
  changes JSONB, -- Before/after values
  metadata JSONB, -- Additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_team ON company_audit_log(team_id, created_at DESC);
CREATE INDEX idx_audit_user ON company_audit_log(user_id);
CREATE INDEX idx_audit_action ON company_audit_log(action);

ALTER TABLE company_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company audit log"
  ON company_audit_log FOR SELECT
  USING (true);
```

#### 1.3 Add Company Metadata Columns

**File:** `supabase/migrations/0038_company_metadata.sql`

```sql
-- Add company metadata fields
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();
```

---

### Phase 2: Backend Actions (Core Logic)

**Priority:** 🔴 Critical
**Estimated Time:** 4-5 hours

#### 2.1 New File: `app/actions/company-settings.ts`

Company admin actions for managing their company:

```typescript
"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";
import { getUserRole } from "./permissions";
import { logCompanyAudit } from "./audit";

export interface CompanyInfo {
  id: string;
  team_id: string;
  name: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string | null;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  address: string | null;
  tax_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// Get company info (Super-Admin or Company Admin)
export async function getCompanyInfo(teamId: string): Promise<CompanyInfo | null>

// Update company info (Super-Admin or Company Admin only)
export async function updateCompanyInfo(
  teamId: string,
  updates: Partial<CompanyInfo>
): Promise<CompanyInfo>

// Get company statistics
export async function getCompanyStats(teamId: string): Promise<{
  totalUsers: number;
  activeUsers: number;
  totalExpenses: number;
  monthlyExpenses: number;
  pendingApprovals: number;
  budgetUtilization: number;
}>
```

#### 2.2 Modify: `app/actions/super-admin.ts`

Add Super-Admin dashboard functions:

```typescript
// Get all companies with stats
export async function getAllCompaniesWithStats(): Promise<CompanyWithStats[]>

// Get platform-level analytics
export async function getPlatformAnalytics(): Promise<{
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  revenueThisMonth: number;
  growthRate: number;
}>

// Manage super-admin assignments
export async function addSuperAdmin(userId: string, email: string): Promise<void>
export async function removeSuperAdmin(userId: string): Promise<void>
export async function listSuperAdmins(): Promise<SuperAdmin[]>
```

#### 2.3 Modify: `app/actions/permissions.ts`

Add company admin permission checks:

```typescript
// Check if user is company admin for specific team
export async function isCompanyAdmin(teamId: string): Promise<boolean> {
  const role = await getUserRole(teamId);
  return role === 'admin';
}

// Check if user can manage company settings
export async function canManageCompany(teamId: string): Promise<boolean> {
  const isSuperAdmin = await checkCurrentUserIsSuperAdmin();
  if (isSuperAdmin) return true;

  return await isCompanyAdmin(teamId);
}

// Check if user can manage users in company
export async function canManageUsers(teamId: string): Promise<boolean> {
  return await canManageCompany(teamId);
}
```

#### 2.4 New File: `app/actions/audit.ts`

Audit logging functions:

```typescript
"use server";

export async function logCompanyAudit(params: {
  teamId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}): Promise<void>

export async function getCompanyAuditLog(
  teamId: string,
  filters?: {
    entityType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<AuditLogEntry[]>
```

---

### Phase 3: UI Components (Pages & Components)

**Priority:** 🔴 Critical
**Estimated Time:** 6-8 hours

#### 3.1 New Page: `/app/dashboard/[teamId]/company/page.tsx`

**Company Admin Dashboard (Home Page)**

**Access:** Super-Admin OR Company Admin only

**Layout:**
```
┌────────────────────────────────────────────────────┐
│ Company: Acme Corp                    [Edit]       │
├────────────────────────────────────────────────────┤
│                                                    │
│ Quick Stats (4 cards)                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│ │ 24 Users │ │ 156 Exp. │ │ 12 Pend. │ │ 85% Bdg │ │
│ └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
│                                                    │
│ Recent Activity                                    │
│ • User John invited (2 hours ago)                 │
│ • Budget approved for March (1 day ago)           │
│ • Role changed: Jane → Admin (3 days ago)         │
│                                                    │
│ Pending Actions                                    │
│ • 12 expenses waiting for approval                │
│ • 3 users pending invitation acceptance           │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Features:**
- Quick stats cards (users, expenses, pending, budget)
- Recent activity feed (last 10 actions)
- Pending actions list (requires attention)
- Edit button → Company settings page

**Code Structure:**
```typescript
export default async function CompanyDashboardPage({
  params: { teamId }
}: {
  params: { teamId: string }
}) {
  // Permission check
  const canManage = await canManageCompany(teamId);
  if (!canManage) {
    return <CompanyDashboardViewOnly teamId={teamId} />;
  }

  // Load data
  const [company, stats, activity, pending] = await Promise.all([
    getCompanyInfo(teamId),
    getCompanyStats(teamId),
    getCompanyAuditLog(teamId, { limit: 10 }),
    getPendingActions(teamId)
  ]);

  return <CompanyDashboardAdmin ... />;
}
```

#### 3.2 New Page: `/app/dashboard/[teamId]/company/settings/page.tsx`

**Company Settings Page**

**Access:** Super-Admin OR Company Admin only

**Tabs:**
1. **General** - Name, logo, description, website
2. **Contact** - Admin name, email, phone, address
3. **Legal** - Tax ID, registration number
4. **Security** - (Future: 2FA requirements, IP whitelist)

**Features:**
- Edit company info with validation
- Upload logo (Supabase Storage)
- Save button with confirmation
- Audit log of changes

#### 3.3 New Page: `/app/dashboard/[teamId]/admin/roles/page.tsx`

**Role Management Page**

**Access:** Super-Admin OR Company Admin only

**Layout:**
```
┌────────────────────────────────────────────────────┐
│ Manage User Roles                                  │
├────────────────────────────────────────────────────┤
│                                                    │
│ Search: [_____________]  [Filter by Role ▼]       │
│                                                    │
│ Users (24)                                         │
│ ┌──────────────────────────────────────────────┐  │
│ │ John Doe (john@acme.com)           [Admin ▼] │  │
│ │ Jane Smith (jane@acme.com)      [Approver ▼] │  │
│ │ Bob Johnson (bob@acme.com)        [Member ▼] │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ [Invite New User]                                  │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Features:**
- List all company users with role dropdown
- Change role → confirmation dialog → audit log
- Deactivate/Reactivate users
- Invite new users with role selection

#### 3.4 Modify: `/app/dashboard/[teamId]/layout.tsx`

Add conditional navigation items:

```typescript
// Sidebar navigation items
const navItems = [
  { name: 'Expenses', href: `/dashboard/${teamId}/expenses`, icon: ReceiptIcon },
  { name: 'Budget', href: `/dashboard/${teamId}/budget`, icon: ChartIcon },
  { name: 'P&L', href: `/dashboard/${teamId}/pnl`, icon: TrendingIcon },
  { name: 'Categories', href: `/dashboard/${teamId}/categories`, icon: FolderIcon },

  // Admin section (conditional)
  ...(isCompanyAdmin ? [
    { name: 'Company', href: `/dashboard/${teamId}/company`, icon: BuildingIcon },
    { name: 'Team', href: `/dashboard/${teamId}/team`, icon: UsersIcon },
    { name: 'Roles', href: `/dashboard/${teamId}/admin/roles`, icon: ShieldIcon },
  ] : []),

  { name: 'Profile', href: `/dashboard/${teamId}/profile`, icon: UserIcon },
];
```

#### 3.5 New Page: `/app/super-admin/dashboard/page.tsx`

**Super-Admin Global Dashboard**

**Access:** Super-Admin only

**Layout:**
```
┌────────────────────────────────────────────────────┐
│ Platform Overview                                  │
├────────────────────────────────────────────────────┤
│                                                    │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│ │ 47 Comp. │ │ 1,234 U. │ │ $42K MRR │ │ +12% ▲  │ │
│ └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
│                                                    │
│ Companies by Status                                │
│ • Active: 42                                       │
│ • Pending: 5                                       │
│ • Suspended: 0                                     │
│                                                    │
│ Recent Activity                                    │
│ • New company: Tech Startup Inc (2 hours ago)     │
│ • Admin John promoted to Super-Admin (1 day ago)  │
│                                                    │
│ [View All Companies] [Manage Super-Admins]         │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

### Phase 4: Navigation & Access Control

**Priority:** 🟡 High
**Estimated Time:** 2-3 hours

#### 4.1 Modify Sidebar Navigation

**File:** `components/sidebar-layout.tsx`

Add role-based menu sections:

```typescript
// Super-Admin section (only if isSuperAdmin)
{isSuperAdmin && (
  <div className="super-admin-section">
    <h3>Platform Admin</h3>
    <Link href="/super-admin/dashboard">Dashboard</Link>
    <Link href="/companies">Companies</Link>
    <Link href="/super-admin/admins">Super Admins</Link>
  </div>
)}

// Company Admin section (only if isCompanyAdmin)
{isCompanyAdmin && (
  <div className="company-admin-section">
    <h3>Company Management</h3>
    <Link href={`/dashboard/${teamId}/company`}>Company</Link>
    <Link href={`/dashboard/${teamId}/team`}>Team Members</Link>
    <Link href={`/dashboard/${teamId}/admin/roles`}>Roles</Link>
  </div>
)}

// Regular user section (always visible)
<div className="user-section">
  <Link href={`/dashboard/${teamId}/expenses`}>Expenses</Link>
  <Link href={`/dashboard/${teamId}/budget`}>Budget</Link>
  <Link href={`/dashboard/${teamId}/pnl`}>P&L</Link>
</div>
```

#### 4.2 Add Access Guards

**File:** `app/dashboard/[teamId]/company/page.tsx`

```typescript
export default async function CompanyPage({ params }: { params: { teamId: string } }) {
  const user = await stackServerApp.getUser();
  if (!user) redirect('/sign-in');

  // Check permission
  const canManage = await canManageCompany(params.teamId);
  const isSuperAdmin = await checkCurrentUserIsSuperAdmin();

  if (!canManage && !isSuperAdmin) {
    // Show view-only version
    return <CompanyViewOnly teamId={params.teamId} />;
  }

  return <CompanyDashboard teamId={params.teamId} />;
}
```

---

## File Summary

### New Files to Create (12)

**Migrations (3):**
1. `supabase/migrations/0036_ensure_company_tables.sql` - Companies & super_admins tables
2. `supabase/migrations/0037_company_audit_log.sql` - Audit logging
3. `supabase/migrations/0038_company_metadata.sql` - Additional company fields

**Backend Actions (2):**
4. `app/actions/company-settings.ts` - Company admin CRUD
5. `app/actions/audit.ts` - Audit logging functions

**Pages (5):**
6. `app/dashboard/[teamId]/company/page.tsx` - Company admin dashboard
7. `app/dashboard/[teamId]/company/settings/page.tsx` - Company settings
8. `app/dashboard/[teamId]/admin/roles/page.tsx` - Role management
9. `app/super-admin/dashboard/page.tsx` - Super-admin dashboard
10. `app/super-admin/admins/page.tsx` - Manage super-admins

**Components (2):**
11. `components/company/company-stats-card.tsx` - Stats display
12. `components/company/activity-feed.tsx` - Recent activity

### Files to Modify (5)

1. `app/actions/super-admin.ts` - Add dashboard analytics
2. `app/actions/permissions.ts` - Add company admin checks
3. `app/dashboard/[teamId]/layout.tsx` - Conditional navigation
4. `components/sidebar-layout.tsx` - Role-based menu sections
5. `app/dashboard/[teamId]/team/page.tsx` - Integrate with role management

---

## Implementation Sequence

### Week 1: Foundation
- [ ] Day 1-2: Database migrations (Phase 1)
- [ ] Day 3-4: Backend actions (Phase 2)
- [ ] Day 5: Testing backend + migrations

### Week 2: UI
- [ ] Day 1-2: Company admin dashboard + settings
- [ ] Day 3: Role management page
- [ ] Day 4: Super-admin dashboard
- [ ] Day 5: Navigation & access control

### Week 3: Polish
- [ ] Day 1-2: Audit logging integration
- [ ] Day 3: UI polish + responsive design
- [ ] Day 4: End-to-end testing
- [ ] Day 5: Documentation

---

## Testing Checklist

### Super-Admin Flow
- [ ] Can access /companies page
- [ ] Can create new company
- [ ] Can see all companies with stats
- [ ] Can access any company's settings
- [ ] Can assign other super-admins
- [ ] Cannot be blocked by company-level permissions

### Company Admin Flow
- [ ] Can access /dashboard/[teamId]/company
- [ ] Can edit company info
- [ ] Can manage team members
- [ ] Can change user roles
- [ ] Can invite new users
- [ ] Can view budget structure
- [ ] Cannot see other companies
- [ ] Cannot access /companies list

### Company User Flow
- [ ] Can view company page (read-only)
- [ ] Can view team members list (read-only)
- [ ] Can view budget (read-only)
- [ ] Cannot edit company info
- [ ] Cannot manage users
- [ ] Cannot change roles
- [ ] Cannot see companies list

### Navigation
- [ ] Super-admin sees "Platform Admin" section in sidebar
- [ ] Company admin sees "Company Management" section
- [ ] Regular user sees limited menu
- [ ] All users see appropriate menu items for their role
- [ ] Clicking "Company" from company user → view-only page

---

## Security Considerations

### Access Control
1. **Server-side checks** - Every action validates user role
2. **RLS policies** - Database-level access control
3. **UI hiding** - Menu items hidden based on role (UX, not security)
4. **Audit logging** - Track all admin actions

### Data Isolation
1. **Team scoping** - All queries filtered by team_id
2. **Super-admin override** - Can access any team
3. **Role hierarchy** - Company admin can't promote to super-admin

### Best Practices
1. **No client-side role checks for security**
2. **Always validate on server**
3. **Log sensitive actions** (role changes, company edits)
4. **Email notifications** for role changes

---

## API Endpoints Summary

### Company Management
- `GET /api/company/[teamId]` - Get company info
- `PATCH /api/company/[teamId]` - Update company info
- `GET /api/company/[teamId]/stats` - Get company statistics

### User Management
- `GET /api/company/[teamId]/users` - List company users
- `PATCH /api/company/[teamId]/users/[userId]/role` - Change user role
- `POST /api/company/[teamId]/users/invite` - Invite new user
- `DELETE /api/company/[teamId]/users/[userId]` - Remove user

### Super-Admin
- `GET /api/super-admin/companies` - List all companies
- `GET /api/super-admin/analytics` - Platform analytics
- `POST /api/super-admin/admins` - Add super-admin
- `GET /api/super-admin/audit` - Global audit log

---

## Next Steps

Ready to implement? I recommend this order:

1. **Start with migrations** (Phase 1) - Foundation first
2. **Build backend actions** (Phase 2) - Logic layer
3. **Create company admin dashboard** (Phase 3.1) - User-facing feature
4. **Add navigation** (Phase 4) - Tie everything together

Would you like me to start implementing Phase 1 (migrations)?
