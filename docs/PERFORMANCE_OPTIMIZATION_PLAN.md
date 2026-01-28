# Performance Optimization Plan

## Executive Summary
The application is experiencing slow data loading times due to several database and application-level performance issues. This plan outlines a comprehensive strategy to improve load times by 60-80%.

## Current Performance Issues Identified

### 1. Database-Level Issues

#### A. Missing Indexes on Foreign Keys
**Impact:** HIGH - Foreign key lookups are slow without indexes
**Tables Affected:**
- `team_expenses` (subcategory_id, category_id, recurring_expense_id)
- `team_expense_categories` (parent_id)
- `expense_attachments` (expense_id)
- `expense_audit_log` (expense_id)
- `team_recurring_expenses` (category_id, subcategory_id)
- And 15+ more tables

**Solution:** Add indexes on all foreign key columns

#### B. Multiple Permissive RLS Policies
**Impact:** MEDIUM - Each policy must be evaluated for every query
**Tables Affected:**
- `exchange_rates` (4 policies for SELECT)
- `team_expense_categories` (4 policies for SELECT)

**Solution:** Consolidate multiple permissive policies into single policies

#### C. No Query Pagination
**Impact:** HIGH - Loading all expenses at once
**Current Behavior:**
- `getTeamExpenses()` loads ALL expenses without limit
- `getTeamMembers()` loads all members
- `getCategoryTree()` loads all categories

**Solution:** Implement server-side pagination with limit/offset

### 2. Application-Level Issues

#### A. Sequential Data Loading (Waterfall)
**Impact:** HIGH - Each request waits for previous to complete
**Current Pattern:**
```typescript
useEffect(() => {
  loadExpenses();      // Waits for completion
  loadRecurringExpenses(); // Then starts
}, []);
```

**Solution:** Parallel loading with Promise.all() or React Query

#### B. No Caching Strategy
**Impact:** MEDIUM - Same data fetched repeatedly
**Current Behavior:**
- Categories fetched on every page load
- Team members fetched on every modal open
- No client-side caching

**Solution:** Implement React Query or SWR for intelligent caching

#### C. N+1 Query Pattern
**Impact:** MEDIUM - Multiple round trips
**Example:** `getTeamMembers()` does:
1. Query team_memberships
2. Extract user_ids
3. Query stack_users with IN clause

**Solution:** Use JOIN queries or database views

#### D. Large Payload Sizes
**Impact:** MEDIUM - Transferring unnecessary data
**Current Behavior:**
- `getTeamExpenses()` selects `*` (all columns)
- No field selection optimization

**Solution:** Select only required fields

### 3. Client-Side Rendering Issues

#### A. No Optimistic Updates
**Impact:** LOW - Perceived slowness
**Current Behavior:** UI waits for server response before updating

**Solution:** Implement optimistic UI updates

#### B. No Loading States Optimization
**Impact:** LOW - Poor UX during loading
**Current Behavior:** Generic loading spinner

**Solution:** Skeleton loaders and progressive loading

## Optimization Plan

### Phase 1: Database Optimizations (High Impact, Low Risk)

#### 1.1 Add Missing Indexes
**Priority:** CRITICAL
**Estimated Impact:** 40-60% faster queries
**Implementation:**
```sql
-- Critical indexes for team_expenses
CREATE INDEX idx_team_expenses_team_id_deleted ON team_expenses(team_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_team_expenses_category_id ON team_expenses(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_team_expenses_subcategory_id ON team_expenses(subcategory_id) WHERE subcategory_id IS NOT NULL;
CREATE INDEX idx_team_expenses_status ON team_expenses(status);
CREATE INDEX idx_team_expenses_expense_date ON team_expenses(expense_date DESC);
CREATE INDEX idx_team_expenses_payment_status ON team_expenses(payment_status);

-- Foreign key indexes
CREATE INDEX idx_expense_attachments_expense_id ON expense_attachments(expense_id);
CREATE INDEX idx_expense_audit_log_expense_id ON expense_audit_log(expense_id);
CREATE INDEX idx_team_expense_categories_parent_id ON team_expense_categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_team_recurring_expenses_category_id ON team_recurring_expenses(category_id);
CREATE INDEX idx_team_recurring_expenses_subcategory_id ON team_recurring_expenses(subcategory_id);

-- Composite indexes for common queries
CREATE INDEX idx_team_expenses_team_status_date ON team_expenses(team_id, status, expense_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_team_memberships_team_active ON team_memberships(team_id, is_active) WHERE is_active = true;
```

**Migration File:** `supabase/migrations/0021_add_performance_indexes.sql`

#### 1.2 Consolidate RLS Policies
**Priority:** MEDIUM
**Estimated Impact:** 10-15% faster queries
**Implementation:**
- Merge multiple permissive policies into single policies using OR conditions
- Review and optimize policy expressions

**Migration File:** `supabase/migrations/0022_consolidate_rls_policies.sql`

### Phase 2: Query Optimizations (High Impact, Medium Risk)

#### 2.1 Implement Server-Side Pagination
**Priority:** CRITICAL
**Estimated Impact:** 70-90% faster initial load
**Implementation:**

**Update `getTeamExpenses()`:**
```typescript
export async function getTeamExpenses(
  teamId: string,
  filters?: ExpenseFilters,
  pagination?: { limit: number; offset: number }
): Promise<{ data: TeamExpense[]; total: number }> {
  let query = supabase
    .from("team_expenses")
    .select("*", { count: 'exact' })
    .eq("team_id", teamId)
    .is("deleted_at", null);

  // Apply filters...
  
  // Apply pagination
  if (pagination) {
    query = query
      .range(pagination.offset, pagination.offset + pagination.limit - 1)
      .order("expense_date", { ascending: false });
  }

  const { data, error, count } = await query;
  
  return { data: data || [], total: count || 0 };
}
```

**Update Client:**
- Default to 20 items per page
- Implement "Load More" or pagination controls
- Cache paginated results

#### 2.2 Optimize Team Members Query
**Priority:** MEDIUM
**Estimated Impact:** 30-40% faster
**Implementation:**

**Option A: Use JOIN (Recommended)**
```sql
CREATE VIEW team_members_with_profiles AS
SELECT 
  tm.user_id,
  tm.role,
  tm.joined_at,
  tm.updated_at,
  tm.is_active,
  su.email,
  su.name,
  su.avatar_url
FROM team_memberships tm
LEFT JOIN stack_users su ON tm.user_id = su.id;
```

**Option B: Optimize Current Query**
- Use single query with proper JOIN in Supabase
- Cache results for 5 minutes

#### 2.3 Select Only Required Fields
**Priority:** MEDIUM
**Estimated Impact:** 20-30% smaller payloads
**Implementation:**
- Replace `select("*")` with specific field lists
- Create lightweight DTOs for list views
- Full objects only when needed (detail views)

### Phase 3: Application-Level Optimizations (Medium Impact, Low Risk)

#### 3.1 Implement React Query / SWR
**Priority:** HIGH
**Estimated Impact:** 50-70% faster subsequent loads
**Implementation:**

**Install:**
```bash
npm install @tanstack/react-query
```

**Setup:**
```typescript
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

**Usage:**
```typescript
// Use React Query hooks
const { data, isLoading } = useQuery({
  queryKey: ['expenses', teamId, filters],
  queryFn: () => getTeamExpenses(teamId, filters, { limit: 20, offset: 0 }),
});
```

**Benefits:**
- Automatic caching
- Background refetching
- Request deduplication
- Optimistic updates

#### 3.2 Parallel Data Loading
**Priority:** MEDIUM
**Estimated Impact:** 30-50% faster initial load
**Implementation:**

**Before:**
```typescript
useEffect(() => {
  loadExpenses();
  loadRecurringExpenses();
}, []);
```

**After:**
```typescript
useEffect(() => {
  Promise.all([
    loadExpenses(),
    loadRecurringExpenses(),
    loadCategories(),
  ]);
}, []);
```

#### 3.3 Implement Optimistic Updates
**Priority:** LOW
**Estimated Impact:** Better perceived performance
**Implementation:**
- Update UI immediately on user actions
- Rollback on error
- Use React Query's `useMutation` with optimistic updates

### Phase 4: Advanced Optimizations (Low Impact, High Complexity)

#### 4.1 Database Connection Pooling
**Priority:** LOW
**Estimated Impact:** 10-15% faster under load
**Implementation:**
- Configure Supabase connection pooler
- Use transaction pooling for better performance

#### 4.2 Implement Database Views
**Priority:** LOW
**Estimated Impact:** 15-20% faster complex queries
**Implementation:**
- Create materialized views for expensive queries
- Refresh views on schedule or trigger

#### 4.3 Add Query Result Caching (Redis)
**Priority:** LOW
**Estimated Impact:** 80-90% faster for cached queries
**Implementation:**
- Use Supabase Edge Functions with Redis
- Cache frequently accessed data (categories, team members)

## Implementation Priority

### Week 1: Critical Fixes
1. ✅ Add missing database indexes (Phase 1.1)
2. ✅ Implement server-side pagination (Phase 2.1)
3. ✅ Add React Query (Phase 3.1)

### Week 2: High-Impact Optimizations
4. ✅ Optimize team members query (Phase 2.2)
5. ✅ Select only required fields (Phase 2.3)
6. ✅ Parallel data loading (Phase 3.2)

### Week 3: Polish & Advanced
7. ✅ Consolidate RLS policies (Phase 1.2)
8. ✅ Optimistic updates (Phase 3.3)
9. ✅ Advanced optimizations (Phase 4) - if needed

## Expected Performance Improvements

| Metric | Current | After Phase 1 | After Phase 2 | After Phase 3 | Target |
|--------|---------|---------------|---------------|---------------|--------|
| Initial Page Load | ~3-5s | ~2-3s | ~1-2s | ~0.5-1s | <1s |
| Expense List Load | ~2-3s | ~1-2s | ~0.3-0.5s | ~0.1-0.3s | <0.5s |
| Category Load | ~1s | ~0.5s | ~0.3s | ~0.1s (cached) | <0.2s |
| Team Members Load | ~1-2s | ~0.5-1s | ~0.3-0.5s | ~0.1s (cached) | <0.3s |
| Subsequent Loads | ~2-3s | ~1-2s | ~0.5-1s | ~0.1-0.2s (cached) | <0.3s |

## Monitoring & Validation

### Key Metrics to Track
1. **Database Query Time**
   - Average query execution time
   - Slow query log (>100ms)
   - Index usage statistics

2. **API Response Times**
   - P95/P99 response times
   - Error rates
   - Cache hit rates

3. **Client-Side Metrics**
   - Time to First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Time to Interactive (TTI)

### Tools
- Supabase Dashboard: Query performance
- Next.js Analytics: Client-side metrics
- React Query DevTools: Cache inspection

## Risk Assessment

### Low Risk
- Adding indexes (read-only, no breaking changes)
- Adding React Query (additive change)
- Parallel loading (improvement only)

### Medium Risk
- Pagination changes (requires UI updates)
- RLS policy consolidation (security review needed)
- Query optimization (requires testing)

### High Risk
- Database view changes (requires migration testing)
- Caching layer (requires invalidation strategy)

## Success Criteria

✅ **Phase 1 Complete When:**
- All critical indexes added
- Query times reduced by 40%+
- No new slow queries introduced

✅ **Phase 2 Complete When:**
- Pagination implemented
- Initial load time < 1s
- Payload sizes reduced by 30%+

✅ **Phase 3 Complete When:**
- React Query integrated
- Cache hit rate > 70%
- Subsequent loads < 0.3s

## Notes

- All changes should be backward compatible
- Test with realistic data volumes (1000+ expenses)
- Monitor production metrics after each phase
- Rollback plan for each change
- Document all optimizations for future reference
