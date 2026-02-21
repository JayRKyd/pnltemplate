# Integration & Performance Improvement Plan

**Date:** February 21, 2026  
**Scope:** Bono Forex · Email Invoice OCR · Expense List Performance

---

## Summary

| Item | Current State | Effort | Priority |
|------|--------------|--------|----------|
| 1. Bono Forex Exchange Rates | ✅ Backend built, needs UI hookup + daily sync | Low | Medium |
| 2. Email → Invoice OCR | 📄 Fully documented, not built | High | Medium |
| 3. Performance (Expense/Recurring lists) | ⚠️ Bottlenecks identified, fixable | Low–Medium | High |

---

## 1. Bono Forex Exchange Rate Integration

### Current State

The Bono Forex service is **already fully implemented at the backend level**. No work is needed to integrate with the API itself.

| File | What It Does |
|------|-------------|
| `lib/forex-client.ts` | API client calling `https://forex.bono.ro/forex/rates` |
| `app/actions/exchange-rates.ts` | Server actions: `getExchangeRate()`, `convertToRon()`, `syncForexRates()` |
| `app/api/test-forex/route.ts` | Test endpoint at `/api/test-forex` |
| `supabase/migrations/0035_add_gbp_exchange_rate.sql` | Adds GBP support |

**Currencies supported:** EUR/RON, USD/RON, GBP/RON  
**Caching:** Rates are stored in an `exchange_rates` database table  
**Fallback:** Hardcoded defaults if API is unreachable

### What's Missing

The backend is done. These three pieces are not yet connected:

1. **No daily sync job** — Rates are fetched on-demand but there is no scheduled job to refresh them each morning automatically
2. **No UI display** — The current exchange rate is not shown anywhere in the dashboard or expense form
3. **No auto-conversion in expense form** — When a user selects EUR or USD as the currency, the RON equivalent is not automatically calculated using today's rate

### Plan

#### Step 1 — Daily Rate Sync via Supabase Edge Function
Create a scheduled Edge Function that calls `syncForexRates()` once per day.

```
supabase/functions/sync-forex-rates/index.ts
```

Schedule it via Supabase Dashboard → Edge Functions → Cron (e.g., every day at 09:00 EET).

The `syncForexRates()` action already exists in `app/actions/exchange-rates.ts` — the Edge Function just needs to call it.

#### Step 2 — Wire Up the Expense Form
When a user selects EUR or USD in the currency dropdown on the expense form, fetch today's rate and automatically compute the RON equivalent, showing it below the amount field.

**Files to change:**
- `components/expenses/new-expense-form.tsx` — call `getExchangeRate()` when currency changes, display RON equivalent
- No changes needed in `app/actions/exchange-rates.ts`

#### Step 3 — Optional: Rate Banner in Dashboard
Show a small "today's rates" banner or footer: `EUR: 4.97 RON · USD: 4.58 RON · GBP: 5.81 RON`. This improves transparency for users entering foreign-currency expenses.

### Estimated Effort

| Task | Effort |
|------|--------|
| Step 1 — Daily Edge Function cron | 1–2 hours |
| Step 2 — Expense form auto-conversion | 2–3 hours |
| Step 3 — Rate display in UI | 1–2 hours |
| **Total** | **4–7 hours** |

---

## 2. Email Invoice OCR → Auto-Create Expenses

### Current State

A comprehensive feature specification exists at `docs/EMAIL_INVOICE_OCR_FEATURE.md` (816 lines). **The feature is fully documented but zero lines of implementation code have been written.**

**Planned architecture (from spec):**
- User forwards an invoice email to a dedicated address (e.g. `facturi@yourdomain.com`)
- **Resend** receives the inbound email and fires a webhook
- PDF/image attachments are processed with **Google Cloud Vision OCR**
- Extracted text is sent to **GPT-4** to return structured JSON fields
- A draft expense is auto-created and the user is notified for review

**Database fields planned but migration not yet run:**
- `source` — manual / email / api / recurring
- `email_from`, `email_subject`, `email_received_at`
- `ocr_confidence`, `ocr_raw_data` (JSONB)

**Planned webhook:** `app/api/webhooks/email-invoice/route.ts` — does not exist yet

### Dependencies (All Blocked On External Keys)

| Dependency | Status | Notes |
|-----------|--------|-------|
| Resend inbound email | ❌ Not configured | Requires Resend API key + domain DNS setup |
| Google Cloud Vision API | ❌ Not configured | Requires GCP project + API key |
| OpenAI API (GPT-4) | ❌ Not configured | Requires OpenAI API key |
| Supabase Storage bucket | ❌ Not created | For storing attachment files |
| Database migration | ❌ Not run | Adds source/ocr fields to `team_expenses` |

> **All implementation is blocked until the three external API keys are provided.** This is the same Resend blocker noted in `docs/TODAY_COMPLETED_WORK_CHECKLIST.md`.

### Build Plan (Once Keys Are Available)

#### Phase 1 — Infrastructure (2–3 days)
- [ ] Configure Resend inbound routing for a dedicated inbox address
- [ ] Create Supabase Storage bucket for email attachments
- [ ] Run database migration to add `source`, `email_from`, `ocr_raw_data` fields
- [ ] Build webhook handler at `app/api/webhooks/email-invoice/route.ts`

#### Phase 2 — OCR & Parsing (2–3 days)
- [ ] Call Google Cloud Vision to extract text from PDF/image attachments
- [ ] Send extracted text to GPT-4 with a structured prompt to return:
  ```json
  {
    "supplier": "...",
    "amount": 1234.50,
    "vat_amount": 234.50,
    "date": "2026-02-15",
    "description": "...",
    "invoice_number": "INV-001"
  }
  ```
- [ ] Attach OCR confidence score to each extracted field
- [ ] Handle failures gracefully — create a draft with blanks if OCR confidence is too low

#### Phase 3 — Draft Expense + Notification (1–2 days)
- [ ] Auto-create a `Draft` expense from the parsed data
- [ ] Tag the expense with `source: 'email'` and store `email_from`, `email_subject`
- [ ] Send an in-app or email notification to the responsible user
- [ ] Add "From Email" badge to the expense row in the table

#### Phase 4 — Review UI (1 day)
- [ ] In the expense form, show the original email/attachment alongside the pre-filled fields
- [ ] Allow user to correct any OCR mistakes before saving as Final

### Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1 — Infrastructure | 2–3 days |
| Phase 2 — OCR & Parsing | 2–3 days |
| Phase 3 — Draft creation + notification | 1–2 days |
| Phase 4 — Review UI | 1 day |
| **Total** | **6–9 days** |

---

## 3. Performance — Expense & Recurring Expense List Load Time

**Reported issue:** Lists take 5–10 seconds to load.

### Root Cause Analysis

After reviewing the code, three specific bottlenecks are responsible.

#### Bottleneck 1 — Expenses Page Downloads 500 Rows, Then Paginates in the Browser

**File:** `app/dashboard/[teamId]/expenses/page.tsx`

The page calls `getTeamExpenses()` which fetches up to **500 rows** from the database and sends them all to the browser. The browser then cuts them into pages of 20 using JavaScript.

The problem: the user only ever sees 20 rows, but the network has to carry 500 rows worth of JSON every time any filter changes.

A server-side paginated version — `getTeamExpensesPaginated()` — **already exists** in `app/actions/expenses.ts` but is not being used by the page.

#### Bottleneck 2 — Recurring Expenses Uses `SELECT *`

**File:** `app/actions/recurring-expenses.ts`

`getRecurringExpenses()` selects every column in the `recurring_expenses` table using `SELECT *`. This fetches columns that are never displayed in the list view (e.g. full audit JSON, raw OCR data fields, etc.). It also has no pagination limit.

#### Bottleneck 3 — Team Members Re-Fetched on Every Keystroke During Search

**File:** `app/dashboard/[teamId]/expenses/page.tsx`

When the user types in the search box, the code calls `getTeamMembers()` inside the search handler. Team members rarely change, yet they are re-fetched from the database on every search interaction (after the 300ms debounce).

#### What's Already Good (No Changes Needed)

- Database indexes are comprehensive (`0021_add_performance_indexes.sql`)
- Field selection for expenses is already optimized (not `SELECT *`)
- Search input has a 300ms debounce
- `loadExpenses`, `loadRecurringExpenses`, and `loadCategories` run in parallel via `Promise.all`
- `useMemo` is used for derived data calculations

---

### Fix Plan

#### Fix 1 — Use Server-Side Pagination for Expenses (Highest Impact)

**File to change:** `app/dashboard/[teamId]/expenses/page.tsx`  
**Time to implement:** 1–2 hours

Replace the `getTeamExpenses()` call with `getTeamExpensesPaginated()`. Move the page state to server-driven instead of client-side slicing.

```typescript
// BEFORE — fetches 500, browser does the slicing
const result = await getTeamExpenses(teamId, filters);
// then in render: result.slice(page * 20, page * 20 + 20)

// AFTER — database returns only 20 rows
const { data, total, totalPages } = await getTeamExpensesPaginated(
  teamId,
  filters,
  { page: currentPage, pageSize: 20 }
);
```

**Expected improvement:** Load time drops from 5–10 seconds to under 1 second. The database query is the same; the difference is sending 20 rows vs 500 rows over the network.

---

#### Fix 2 — Select Only Required Fields for Recurring Expenses

**File to change:** `app/actions/recurring-expenses.ts`  
**Time to implement:** 1 hour

Replace `.select("*")` with an explicit field list covering only what the list view needs.

```typescript
// BEFORE
.select("*")

// AFTER
.select(`
  id, team_id, supplier, description, amount, amount_with_vat,
  currency, category_id, subcategory_id, recurrence_type,
  day_of_month, start_date, end_date, is_active, created_at,
  payment_status, status, is_recurring_placeholder
`)
```

**Expected improvement:** 30–50% reduction in payload size for recurring expense queries.

---

#### Fix 3 — Load Team Members Once on Page Mount

**File to change:** `app/dashboard/[teamId]/expenses/page.tsx`  
**Time to implement:** 30 minutes

Move `getTeamMembers()` out of the search handler into a `useEffect` that runs once when the page loads.

```typescript
// BEFORE — called inside search handler (every search)
const members = await getTeamMembers(params.teamId);

// AFTER — loaded once on mount
const [teamMembers, setTeamMembers] = useState([]);
useEffect(() => {
  getTeamMembers(params.teamId).then(m => setTeamMembers(m ?? []));
}, [params.teamId]);
// pass teamMembers into the search filter instead of fetching each time
```

**Expected improvement:** Eliminates one database round-trip per search interaction.

---

#### Fix 4 — Add React Query Caching (Best Long-Term ROI)

**Files to change:** Multiple  
**Time to implement:** 4–6 hours

Install React Query (`@tanstack/react-query`) and wrap expense/recurring data fetches with `useQuery`. With `staleTime: 30_000` (30 seconds), navigating away and back to the expenses page will be instant — no refetch unless the data is older than 30 seconds.

```typescript
const { data, isLoading, isFetching } = useQuery({
  queryKey: ['expenses', teamId, filters, currentPage],
  queryFn: () => getTeamExpensesPaginated(teamId, filters, { page: currentPage, pageSize: 20 }),
  staleTime: 30_000,
  placeholderData: keepPreviousData, // no blank flash on page change
});
```

**Expected improvement:** Near-instant loads on repeat visits within 30 seconds. Smooth page transitions with no loading spinner when flipping through expense pages.

---

### Performance Fix Summary

| Fix | Impact | Effort | Expected Result |
|-----|--------|--------|----------------|
| Fix 1 — Server-side pagination | 🔴 Critical | 1–2 hrs | 5–10s → ~1s |
| Fix 2 — Optimize recurring query fields | 🟡 Medium | 1 hr | ~30–50% faster |
| Fix 3 — Cache team members on mount | 🟢 Small | 30 min | Eliminates repeated calls |
| Fix 4 — React Query caching | 🔴 High (long-term) | 4–6 hrs | ~100ms on repeat visits |

**Recommended execution order:** Fix 1 → Fix 3 → Fix 2 → Fix 4

---

## Overall Execution Roadmap

### This Week (Quick Wins — No External Dependencies)
1. **Performance Fix 1** — Server-side pagination (1–2 hrs)
2. **Performance Fix 3** — Cache team members (30 min)
3. **Performance Fix 2** — Optimize recurring query (1 hr)
4. **Forex Step 1** — Daily sync cron Edge Function (1–2 hrs)
5. **Forex Step 2** — Auto-conversion in expense form (2–3 hrs)

### Next Sprint (Medium Effort)
6. **Performance Fix 4** — React Query caching (4–6 hrs)
7. **Forex Step 3** — Rates display in dashboard (1–2 hrs)

### Future (Requires External Keys First)
8. **Email OCR Phase 1–4** — Only starts after Resend + GCV + OpenAI keys are provided (~6–9 days total)

---

## Notes

- **Forex:** Everything is built. Zero research time needed. Just scheduling and wiring.
- **Email OCR:** Cannot begin until 3 external API keys are obtained. Once unblocked, this is the largest single feature on the list.
- **Performance:** Fix 1 alone should resolve the 5–10 second complaint. It's the fastest fix with the biggest impact. The paginated API already exists — it just isn't being called.

---

*Document created: February 21, 2026*
