# Utilizatori Modal - Live Data Implementation Plan

## 📋 Overview

Convert the Utilizatori (Users) modal from mock data to real team member data from Supabase.

**Current State**: Mock Romanian names hardcoded in `testcode/utilizatori.tsx`  
**Target State**: Real-time team member data with full CRUD operations

---

## 🔍 Investigation Summary

### Current Component (`testcode/utilizatori.tsx`)

| Feature | Current Implementation |
|---------|----------------------|
| Data Source | Hardcoded `mockUsers` array |
| User Fields | firstName, lastName, email, role, active, hasAvatar, lastChanged |
| Roles | Admin, Editor, Viewer (Romanian UI labels) |
| Tabs | Activi (Active) / Inactivi (Inactive) |
| Actions | Activate, Deactivate, Add colleague |

### Existing Database Schema

**`team_memberships` table:**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| team_id | text | FK to team |
| user_id | text | FK to stack_users |
| role | text | "admin", "member", "owner" |
| permissions | jsonb | Additional permissions |
| invited_by | text | Who invited |
| joined_at | timestamp | Join date |
| updated_at | timestamp | Last modified |

**`stack_users` table:**
| Column | Type | Notes |
|--------|------|-------|
| id | text | Stack Auth user ID |
| email | text | User's email |
| name | text | Full name (not split) |
| avatar_url | text | Profile picture |
| team_id | text | Default team |
| created_at | timestamp | Account creation |

### Existing Server Actions (`app/actions/team-members.ts`)

✅ Already implemented:
- `getTeamMembers(teamId)` - Fetches members with profiles
- `updateMemberRole(teamId, userId, newRole)` - Change roles
- `removeTeamMember(teamId, userId)` - Remove from team
- `createTeamInvite(teamId, email, role)` - Send invites
- `getTeamInvites(teamId)` - List pending invites

---

## 🚧 Implementation Tasks

### Phase 1: Database Schema Update

**Task 1.1: Add `is_active` column to `team_memberships`**

```sql
-- Migration: add_is_active_to_memberships.sql
ALTER TABLE team_memberships 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Index for filtering
CREATE INDEX idx_team_memberships_is_active 
ON team_memberships(team_id, is_active);
```

**Why**: The current schema has no concept of "active vs inactive" users. We need this to support the Activi/Inactivi tabs.

---

### Phase 2: Server Actions

**Task 2.1: Update `getTeamMembers()` return type**

Add `is_active`, `updated_at` to `TeamMemberWithProfile` interface.

**Task 2.2: Create `setMemberActiveStatus()` action**

```typescript
export async function setMemberActiveStatus(
  teamId: string, 
  userId: string, 
  isActive: boolean
): Promise<void>
```

**Task 2.3: Update `getTeamMembers()` query**

Include `is_active` and `updated_at` in the returned data.

---

### Phase 3: Component Integration

**Task 3.1: Add `teamId` prop to Utilizatori**

The component needs to know which team's members to display.

```typescript
interface UtilizatoriProps {
  onClose?: () => void;
  teamId: string;  // NEW
}
```

**Task 3.2: Replace mock data with real fetch**

```typescript
const [activeUsers, setActiveUsers] = useState<UserType[]>([]);
const [inactiveUsers, setInactiveUsers] = useState<UserType[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadMembers();
}, [teamId]);

async function loadMembers() {
  const members = await getTeamMembers(teamId);
  setActiveUsers(members.filter(m => m.is_active));
  setInactiveUsers(members.filter(m => !m.is_active));
}
```

**Task 3.3: Data mapping**

Map database fields to component's expected format:

| Component Field | Database Source | Transformation |
|-----------------|-----------------|----------------|
| `firstName` | `stack_users.name` | Split on first space |
| `lastName` | `stack_users.name` | Everything after first space |
| `email` | `stack_users.email` | Direct |
| `role` | `team_memberships.role` | Map: admin→Admin, member→Editor, viewer→Viewer |
| `active` | `team_memberships.is_active` | Direct boolean |
| `hasAvatar` | `stack_users.avatar_url` | `!!avatar_url` |
| `lastChanged` | `team_memberships.updated_at` | Format as "DD-MMM-YY" Romanian |

**Task 3.4: Wire up activate/deactivate handlers**

```typescript
const handleActivate = async (user: UserType) => {
  await setMemberActiveStatus(teamId, user.id, true);
  loadMembers(); // Refresh
};

const handleDeactivate = async (user: UserType) => {
  await setMemberActiveStatus(teamId, user.id, false);
  loadMembers(); // Refresh
};
```

**Task 3.5: Wire up "Adauga coleg" (Add colleague) button**

Options:
1. Open invite modal inline (reuse `createTeamInvite`)
2. Navigate to `/dashboard/[teamId]/team` page
3. Show simplified invite form in a nested modal

**Recommendation**: Option 1 - Add inline invite form for better UX.

---

### Phase 4: Update User Dropdown Integration

**Task 4.1: Pass `teamId` to Utilizatori**

In `components/user-dropdown.tsx`:

```typescript
<Utilizatori 
  onClose={() => setShowUtilizatori(false)} 
  teamId={currentTeamId}  // NEW
/>
```

---

## 📊 Role Mapping

The database uses English roles, the UI shows Romanian labels:

| Database Role | UI Label | Badge Color |
|---------------|----------|-------------|
| `owner` | Admin | Purple (#F3E8FF) |
| `admin` | Admin | Purple (#F3E8FF) |
| `member` | Editor | Blue (#DBEAFE) |
| `viewer` | Viewer | Gray (#F3F4F6) |

**Note**: Consider adding "Viewer" as a distinct role in the database, or treat "member" with limited permissions as viewer.

---

## 🔒 Permissions Considerations

Before deactivating a user, check:
1. Current user must be admin/owner
2. Cannot deactivate self
3. Cannot deactivate the last admin

---

## ⏱️ Estimated Effort

| Task | Time |
|------|------|
| Phase 1: Database migration | 15 min |
| Phase 2: Server actions | 30 min |
| Phase 3: Component integration | 1-2 hours |
| Phase 4: Testing & polish | 30 min |
| **Total** | **~2.5-3 hours** |

---

## 🔄 Data Flow Diagram

```
┌─────────────────────┐
│   User Dropdown     │
│ (user-dropdown.tsx) │
└──────────┬──────────┘
           │ onClick "Utilizatori"
           │ passes teamId
           ▼
┌─────────────────────┐
│    Utilizatori      │
│ (utilizatori.tsx)   │
└──────────┬──────────┘
           │ useEffect → loadMembers()
           ▼
┌─────────────────────┐
│   Server Actions    │
│ (team-members.ts)   │
│                     │
│ • getTeamMembers()  │
│ • setMemberActive() │
│ • createTeamInvite()│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     Supabase        │
│                     │
│ • team_memberships  │
│ • stack_users       │
│ • team_invites      │
└─────────────────────┘
```

---

## 🎯 Success Criteria

- [ ] Utilizatori modal shows real team members
- [ ] Active/Inactive tabs filter correctly
- [ ] Activate/Deactivate buttons work and persist
- [ ] Role badges display correctly
- [ ] "Add colleague" sends real invites
- [ ] Last changed date reflects actual `updated_at`
- [ ] Loading state while fetching
- [ ] Error handling for failed operations

---

## 📝 Notes

1. **Existing Team Page**: There's already a functional `/dashboard/[teamId]/team/page.tsx` that uses real data. We could potentially share server actions and just update the UI in Utilizatori.

2. **Stack Auth Sync**: When deactivating a user in Supabase, consider whether to also remove them from the Stack Auth team, or just mark them inactive.

3. **Invite Flow**: Pending invites could also be shown in the Inactivi tab or as a separate section.
