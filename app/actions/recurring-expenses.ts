"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";

export interface RecurringExpense {
  id: string;
  team_id: string;
  user_id: string;
  amount: number;
  amount_without_vat: number | null;
  amount_with_vat: number | null;
  vat_rate: number | null;
  vat_deductible: boolean;
  currency: string;
  category_id: string | null;
  subcategory_id: string | null;
  supplier: string | null;
  description: string | null;
  doc_type: string | null;
  tags: string[] | null;
  recurrence_type: "monthly" | "quarterly" | "yearly";
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  last_generated_date: string | null;
  // Versioning fields
  version?: number;
  previous_version_id?: string | null;
  superseded_at?: string | null;
  superseded_by_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RecurringExpenseInput {
  teamId: string;
  amount: number;
  amountWithoutVat?: number;
  amountWithVat?: number;
  vatRate?: number;
  vatDeductible?: boolean;
  currency?: string;
  categoryId?: string;
  subcategoryId?: string;
  supplier?: string;
  description?: string;
  docType?: string;
  tags?: string[];
  recurrenceType?: "monthly" | "quarterly" | "yearly";
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
}

// Get all recurring expenses for a team
export async function getRecurringExpenses(
  teamId: string,
  includeInactive = false
): Promise<RecurringExpense[]> {
  let query = supabase
    .from("team_recurring_expenses")
    .select("*")
    .eq("team_id", teamId)
    .is("deleted_at", null);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("[getRecurringExpenses] Error:", error);
    throw new Error(error.message);
  }

  return data || [];
}

// Get single recurring expense
export async function getRecurringExpense(id: string): Promise<RecurringExpense | null> {
  const { data, error } = await supabase
    .from("team_recurring_expenses")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[getRecurringExpense] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

// Create new recurring expense
export async function createRecurringExpense(
  input: RecurringExpenseInput
): Promise<RecurringExpense> {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  const { data, error } = await supabase
    .from("team_recurring_expenses")
    .insert({
      team_id: input.teamId,
      user_id: user.id,
      amount: input.amount,
      amount_without_vat: input.amountWithoutVat ?? null,
      amount_with_vat: input.amountWithVat ?? null,
      vat_rate: input.vatRate ?? null,
      vat_deductible: input.vatDeductible ?? false,
      currency: input.currency ?? "RON",
      category_id: input.categoryId ?? null,
      subcategory_id: input.subcategoryId ?? null,
      supplier: input.supplier ?? null,
      description: input.description ?? null,
      doc_type: input.docType ?? null,
      tags: input.tags ?? null,
      recurrence_type: input.recurrenceType ?? "monthly",
      day_of_month: input.dayOfMonth ?? 1,
      start_date: input.startDate,
      end_date: input.endDate ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("[createRecurringExpense] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

// Update recurring expense
export async function updateRecurringExpense(
  id: string,
  teamId: string,
  updates: Partial<RecurringExpenseInput>
): Promise<RecurringExpense> {
  const updateData: Record<string, unknown> = {};

  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.amountWithoutVat !== undefined) updateData.amount_without_vat = updates.amountWithoutVat;
  if (updates.amountWithVat !== undefined) updateData.amount_with_vat = updates.amountWithVat;
  if (updates.vatRate !== undefined) updateData.vat_rate = updates.vatRate;
  if (updates.vatDeductible !== undefined) updateData.vat_deductible = updates.vatDeductible;
  if (updates.currency !== undefined) updateData.currency = updates.currency;
  if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
  if (updates.subcategoryId !== undefined) updateData.subcategory_id = updates.subcategoryId;
  if (updates.supplier !== undefined) updateData.supplier = updates.supplier;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.docType !== undefined) updateData.doc_type = updates.docType;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.recurrenceType !== undefined) updateData.recurrence_type = updates.recurrenceType;
  if (updates.dayOfMonth !== undefined) updateData.day_of_month = updates.dayOfMonth;
  if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
  if (updates.endDate !== undefined) updateData.end_date = updates.endDate;

  const { data, error } = await supabase
    .from("team_recurring_expenses")
    .update(updateData)
    .eq("id", id)
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    console.error("[updateRecurringExpense] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

// Deactivate recurring expense (stop future generations)
export async function deactivateRecurringExpense(
  id: string,
  teamId: string
): Promise<RecurringExpense> {
  const { data, error } = await supabase
    .from("team_recurring_expenses")
    .update({ is_active: false })
    .eq("id", id)
    .eq("team_id", teamId)
    .select()
    .single();

  if (error) {
    console.error("[deactivateRecurringExpense] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

// Reactivate recurring expense
export async function reactivateRecurringExpense(
  id: string,
  teamId: string
): Promise<RecurringExpense> {
  const { data, error } = await supabase
    .from("team_recurring_expenses")
    .update({ is_active: true })
    .eq("id", id)
    .eq("team_id", teamId)
    .select()
    .single();

  if (error) {
    console.error("[reactivateRecurringExpense] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

// Soft delete recurring expense and all linked expenses
export async function deleteRecurringExpense(id: string, teamId: string): Promise<void> {
  // First, delete all linked expenses from team_expenses
  const { error: expensesError } = await supabase
    .from("team_expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("recurring_expense_id", id)
    .eq("team_id", teamId);

  if (expensesError) {
    console.error("[deleteRecurringExpense] Error deleting linked expenses:", expensesError);
    throw new Error(expensesError.message);
  }

  // Then, soft delete the recurring expense template
  const { error } = await supabase
    .from("team_recurring_expenses")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id)
    .eq("team_id", teamId);

  if (error) {
    console.error("[deleteRecurringExpense] Error:", error);
    throw new Error(error.message);
  }
}

// Generate RE-Forms (real team_expenses rows with status='recurent') for a specific month
// Replaces the old generateRecurringPlaceholders and generateMonthlyInstances
export async function generateRecurringForms(
  teamId: string,
  targetMonth?: Date
): Promise<number> {
  const monthDate = targetMonth
    ? new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const { data, error } = await supabase.rpc("generate_recurring_forms", {
    p_team_id: teamId,
    p_target_month: monthDate.toISOString().split("T")[0],
  });

  if (error) {
    console.error("[generateRecurringForms] Error:", error);
    throw new Error(error.message);
  }

  return data || 0;
}

// @deprecated - Use generateRecurringForms instead
export async function generateRecurringPlaceholders(
  teamId: string,
  targetMonth?: Date
): Promise<number> {
  return generateRecurringForms(teamId, targetMonth);
}

// Check if a matching recurring expense exists (for suggesting when creating new expense)
export async function findMatchingRecurring(
  teamId: string,
  supplier?: string,
  subcategoryId?: string
): Promise<RecurringExpense | null> {
  if (!supplier && !subcategoryId) return null;

  let query = supabase
    .from("team_recurring_expenses")
    .select("*")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (supplier) {
    query = query.ilike("supplier", `%${supplier}%`);
  }
  if (subcategoryId) {
    query = query.eq("subcategory_id", subcategoryId);
  }

  const { data, error } = await query.limit(1).single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    return null;
  }

  return data;
}

// Update template with versioning (FR-8)
// Deactivates old template and creates a new version
// Past instances remain unchanged (they have snapshot values)
export async function updateRecurringTemplateVersioned(
  id: string,
  teamId: string,
  updates: Partial<RecurringExpenseInput>
): Promise<RecurringExpense> {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  // 1. Get current template
  const currentTemplate = await getRecurringExpense(id);
  if (!currentTemplate) {
    throw new Error("Template not found");
  }

  // 2. Mark current template as superseded
  const now = new Date().toISOString();
  const { error: supersededError } = await supabase
    .from("team_recurring_expenses")
    .update({
      superseded_at: now,
      is_active: false,
    })
    .eq("id", id)
    .eq("team_id", teamId);

  if (supersededError) {
    console.error("[updateRecurringTemplateVersioned] Error superseding:", supersededError);
    throw new Error(supersededError.message);
  }

  // 3. Create new template with updates
  const { data: newTemplate, error: createError } = await supabase
    .from("team_recurring_expenses")
    .insert({
      team_id: teamId,
      user_id: user.id,
      // Copy all fields from old template
      amount: updates.amount ?? currentTemplate.amount,
      amount_without_vat: updates.amountWithoutVat ?? currentTemplate.amount_without_vat,
      amount_with_vat: updates.amountWithVat ?? currentTemplate.amount_with_vat,
      vat_rate: updates.vatRate ?? currentTemplate.vat_rate,
      vat_deductible: updates.vatDeductible ?? currentTemplate.vat_deductible,
      currency: updates.currency ?? currentTemplate.currency,
      category_id: updates.categoryId ?? currentTemplate.category_id,
      subcategory_id: updates.subcategoryId ?? currentTemplate.subcategory_id,
      supplier: updates.supplier ?? currentTemplate.supplier,
      description: updates.description ?? currentTemplate.description,
      doc_type: updates.docType ?? currentTemplate.doc_type,
      tags: updates.tags ?? currentTemplate.tags,
      recurrence_type: updates.recurrenceType ?? currentTemplate.recurrence_type,
      day_of_month: updates.dayOfMonth ?? currentTemplate.day_of_month,
      start_date: updates.startDate ?? currentTemplate.start_date,
      end_date: updates.endDate ?? currentTemplate.end_date,
      // Versioning fields
      version: (currentTemplate.version || 1) + 1,
      previous_version_id: currentTemplate.id,
      is_active: true,
    })
    .select()
    .single();

  if (createError) {
    console.error("[updateRecurringTemplateVersioned] Error creating new version:", createError);
    throw new Error(createError.message);
  }

  // 4. Update old template with superseded_by_id
  const { error: linkError } = await supabase
    .from("team_recurring_expenses")
    .update({ superseded_by_id: newTemplate.id })
    .eq("id", id);

  if (linkError) {
    console.error("[updateRecurringTemplateVersioned] Error linking versions:", linkError);
    // Non-fatal, continue
  }

  return newTemplate;
}

// Migrate RE-Forms from old template versions to the new template
// Re-links team_expenses rows from ancestor templates to the new active template
// Call this AFTER creating the new versioned template
export async function migrateClosedInstances(
  oldTemplateId: string,
  newTemplateId: string,
  teamId: string
): Promise<void> {
  // Collect all ancestor template IDs by walking the version chain
  const ancestorIds: string[] = [];
  let currentId: string | null = oldTemplateId;
  
  while (currentId) {
    ancestorIds.push(currentId);
    const result: { data: { previous_version_id: string | null } | null } = await supabase
      .from("team_recurring_expenses")
      .select("previous_version_id")
      .eq("id", currentId)
      .single();
    
    currentId = result.data?.previous_version_id || null;
    if (ancestorIds.length > 50) break;
  }

  if (ancestorIds.length === 0) return;

  // Re-link all finalized RE-Forms (draft/final) from ancestor templates to the new template
  // This ensures X/✓ display carries across template versions
  const { data: existingExpenses, error: fetchError } = await supabase
    .from("team_expenses")
    .select("id, recurring_expense_id, status")
    .eq("team_id", teamId)
    .in("recurring_expense_id", ancestorIds)
    .in("status", ["draft", "final"])
    .is("deleted_at", null);

  if (fetchError) {
    console.error("[migrateClosedInstances] Error fetching expenses:", fetchError);
    return;
  }

  if (!existingExpenses || existingExpenses.length === 0) return;

  // Update recurring_expense_id to point to the new template
  for (const exp of existingExpenses) {
    const { error } = await supabase
      .from("team_expenses")
      .update({ recurring_expense_id: newTemplateId, updated_at: new Date().toISOString() })
      .eq("id", exp.id);

    if (error) {
      console.error(`[migrateClosedInstances] Error re-linking expense ${exp.id}:`, error);
    }
  }
}

// Get version history for a template
export async function getTemplateVersionHistory(
  templateId: string,
  teamId: string
): Promise<RecurringExpense[]> {
  const versions: RecurringExpense[] = [];
  let currentId = templateId;

  // Follow the chain backwards (previous_version_id)
  while (currentId) {
    const template = await getRecurringExpense(currentId);
    if (!template || template.team_id !== teamId) break;

    versions.push(template);

    // Get previous version
    if (template.previous_version_id) {
      currentId = template.previous_version_id;
    } else {
      break;
    }
  }

  return versions.reverse(); // Oldest first
}

// Get expenses generated from a recurring template
// Optionally filter by year to match list view behavior
export async function getGeneratedExpenses(
  recurringId: string,
  teamId: string,
  year?: number
): Promise<{
  id: string;
  expense_uid: string;
  expense_date: string;
  amount: number;
  status: string;
  payment_status: string | null;
  is_recurring_placeholder: boolean;
}[]> {
  let query = supabase
    .from("team_expenses")
    .select("id, expense_uid, expense_date, amount, status, payment_status, is_recurring_placeholder")
    .eq("recurring_expense_id", recurringId)
    .eq("team_id", teamId)
    .is("deleted_at", null);

  // Filter by year if provided (same as list view)
  if (year) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    query = query.gte("expense_date", startDate).lte("expense_date", endDate);
  }

  const { data, error } = await query.order("expense_date", { ascending: false });

  if (error) {
    console.error("[getGeneratedExpenses] Error:", error);
    return [];
  }

  return data || [];
}

// Convert a placeholder to a real expense (user confirms/edits)
export async function confirmPlaceholder(
  expenseId: string,
  teamId: string
): Promise<void> {
  const { error } = await supabase
    .from("team_expenses")
    .update({
      is_recurring_placeholder: false,
      status: "draft", // Now it's a real draft expense
    })
    .eq("id", expenseId)
    .eq("team_id", teamId)
    .eq("is_recurring_placeholder", true);

  if (error) {
    console.error("[confirmPlaceholder] Error:", error);
    throw new Error(error.message);
  }
}

// Get RE-Forms (team_expenses) for a specific recurring template in a given year
export interface TemplateExpense {
  id: string;
  month: number; // 1-indexed
  year: number;
  status: string; // 'recurent', 'draft', 'final'
  amount: number | null;
  supplier: string | null;
}

export async function getTemplateExpenses(
  templateId: string,
  teamId: string,
  year: number
): Promise<TemplateExpense[]> {
  // Also collect ancestor template IDs for version chain
  const allIds = [templateId];
  let prevId: string | null = null;
  
  const { data: template } = await supabase
    .from("team_recurring_expenses")
    .select("previous_version_id")
    .eq("id", templateId)
    .single();
  
  prevId = template?.previous_version_id || null;
  let depth = 0;
  while (prevId && depth < 20) {
    allIds.push(prevId);
    const { data: ancestor } = await supabase
      .from("team_recurring_expenses")
      .select("previous_version_id")
      .eq("id", prevId)
      .single();
    prevId = ancestor?.previous_version_id || null;
    depth++;
  }

  const { data, error } = await supabase
    .from("team_expenses")
    .select("id, accounting_period, expense_date, status, amount, supplier")
    .eq("team_id", teamId)
    .in("recurring_expense_id", allIds)
    .is("deleted_at", null);

  if (error) {
    console.error("[getTemplateExpenses] Error:", error);
    return [];
  }

  return (data || []).map(exp => {
    let month: number, yr: number;
    if (exp.accounting_period) {
      const [y, m] = exp.accounting_period.split('-').map(Number);
      yr = y;
      month = m;
    } else {
      const d = new Date(exp.expense_date + 'T00:00:00Z');
      yr = d.getUTCFullYear();
      month = d.getUTCMonth() + 1;
    }
    return {
      id: exp.id,
      month,
      year: yr,
      status: exp.status,
      amount: exp.amount,
      supplier: exp.supplier,
    };
  }).filter(e => e.year === year);
}

// Get recurring expenses with monthly payment status for the list view
export interface RecurringExpenseWithPayments extends RecurringExpense {
  payments: {
    jan?: boolean;
    feb?: boolean;
    mar?: boolean;
    apr?: boolean;
    may?: boolean;
    jun?: boolean;
    jul?: boolean;
    aug?: boolean;
    sep?: boolean;
    oct?: boolean;
    nov?: boolean;
    dec?: boolean;
  };
  expenseIds: Record<string, string>; // monthKey → team_expenses.id for navigation
  category_name?: string;
  subcategory_name?: string;
}

export async function getRecurringExpensesWithPayments(
  teamId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  includeDeleted = false
): Promise<RecurringExpenseWithPayments[]> {
  // Get recurring templates
  let query = supabase
    .from("team_recurring_expenses")
    .select(`
      *,
      category:team_expense_categories!category_id(name),
      subcategory:team_expense_categories!subcategory_id(name)
    `)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (!includeDeleted) {
    query = query.eq("is_active", true).is("deleted_at", null);
  }

  const { data: recurringExpenses, error: recError } = await query;

  if (recError) {
    console.error("[getRecurringExpensesWithPayments] Error:", recError);
    throw new Error(recError.message);
  }

  if (!recurringExpenses || recurringExpenses.length === 0) {
    return [];
  }

  // Get RE-Forms (real team_expenses rows) for these templates in the date range
  const recurringIds = recurringExpenses.map(r => r.id);

  // Also include expenses linked to ancestor template versions (version chain)
  // so that X/✓ marks carry across template versions
  const allTemplateIds = [...recurringIds];
  for (const rec of recurringExpenses) {
    if (rec.previous_version_id) {
      // Walk the version chain to collect ancestor IDs
      let prevId: string | null = rec.previous_version_id;
      let depth = 0;
      while (prevId && depth < 20) {
        allTemplateIds.push(prevId);
        const { data: ancestor } = await supabase
          .from("team_recurring_expenses")
          .select("previous_version_id")
          .eq("id", prevId)
          .single();
        prevId = ancestor?.previous_version_id || null;
        depth++;
      }
    }
  }

  const { data: expenses, error: expError } = await supabase
    .from("team_expenses")
    .select("id, recurring_expense_id, accounting_period, expense_date, status, payment_status")
    .eq("team_id", teamId)
    .in("recurring_expense_id", allTemplateIds)
    .is("deleted_at", null);

  if (expError) {
    console.error("[getRecurringExpensesWithPayments] Expenses error:", expError);
  }

  // Build payments map and expenseIds map from team_expenses (single source of truth)
  const paymentsMap = new Map<string, Record<string, boolean>>();
  const expenseIdsMap = new Map<string, Record<string, string>>();
  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  // Map ancestor template IDs → active template ID for grouping
  const ancestorToActive = new Map<string, string>();
  for (const rec of recurringExpenses) {
    ancestorToActive.set(rec.id, rec.id);
    if (rec.previous_version_id) {
      let prevId: string | null = rec.previous_version_id;
      let depth = 0;
      while (prevId && depth < 20) {
        ancestorToActive.set(prevId, rec.id);
        const found = allTemplateIds.includes(prevId);
        if (!found) break;
        // Walk chain (already collected above)
        const { data: ancestor } = await supabase
          .from("team_recurring_expenses")
          .select("previous_version_id")
          .eq("id", prevId)
          .single();
        prevId = ancestor?.previous_version_id || null;
        depth++;
      }
    }
  }

  (expenses || []).forEach(exp => {
    if (!exp.recurring_expense_id) return;

    // Determine the month from accounting_period (preferred) or expense_date
    let month: number;
    let year: number;
    if (exp.accounting_period) {
      const [y, m] = exp.accounting_period.split('-').map(Number);
      year = y;
      month = m - 1; // 0-indexed
    } else {
      const d = new Date(exp.expense_date + 'T00:00:00Z');
      year = d.getUTCFullYear();
      month = d.getUTCMonth();
    }

    const monthKey = monthKeys[month];
    // Resolve to active template ID
    const activeId = ancestorToActive.get(exp.recurring_expense_id) || exp.recurring_expense_id;

    if (!paymentsMap.has(activeId)) {
      paymentsMap.set(activeId, {});
    }
    if (!expenseIdsMap.has(activeId)) {
      expenseIdsMap.set(activeId, {});
    }

    const payments = paymentsMap.get(activeId)!;
    const ids = expenseIdsMap.get(activeId)!;
    // X = status is 'recurent' (not yet touched by user)
    // ✓ = status is 'draft' or 'final' (user has edited/finalized)
    const isDone = exp.status === 'draft' || exp.status === 'final';
    payments[monthKey] = isDone;
    ids[monthKey] = exp.id;
  });

  // Combine data
  return recurringExpenses.map(rec => ({
    ...rec,
    category_name: rec.category?.name,
    subcategory_name: rec.subcategory?.name,
    payments: paymentsMap.get(rec.id) || {},
    expenseIds: expenseIdsMap.get(rec.id) || {}
  }));
}

// Update payment status for a specific month
export async function updateRecurringPaymentStatus(
  recurringId: string,
  teamId: string,
  year: number,
  month: number,
  paid: boolean
): Promise<void> {
  // Find the expense for this recurring template and month
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const { data: existingExpense, error: findError } = await supabase
    .from("team_expenses")
    .select("id, is_recurring_placeholder")
    .eq("recurring_expense_id", recurringId)
    .eq("team_id", teamId)
    .gte("expense_date", startOfMonth.toISOString().split('T')[0])
    .lte("expense_date", endOfMonth.toISOString().split('T')[0])
    .is("deleted_at", null)
    .single();

  if (findError && findError.code !== 'PGRST116') {
    console.error("[updateRecurringPaymentStatus] Find error:", findError);
  }

  if (existingExpense) {
    // Update only payment_status - keep status as 'recurent' always
    // Recurring expenses always show pink "Recurent" badge regardless of payment status
    const newPaymentStatus = paid ? 'paid' : 'unpaid';
    const { error: updateError } = await supabase
      .from("team_expenses")
      .update({
        status: 'recurent', // Always keep as recurent
        payment_status: newPaymentStatus,
        is_recurring_placeholder: true // Always true for recurring expenses
      })
      .eq("id", existingExpense.id);

    if (updateError) {
      console.error("[updateRecurringPaymentStatus] Update error:", updateError);
      throw new Error(updateError.message);
    }
  } else if (paid) {
    // Create a new expense for this month (confirm a placeholder)
    const recurring = await getRecurringExpense(recurringId);
    if (!recurring) {
      throw new Error("Recurring expense not found");
    }

    const user = await stackServerApp.getUser();
    if (!user) {
      throw new Error("No user in session");
    }

    const expenseDate = new Date(year, month, recurring.day_of_month || 1);

    const { error: insertError } = await supabase
      .from("team_expenses")
      .insert({
        team_id: teamId,
        user_id: user.id,
        recurring_expense_id: recurringId,
        expense_date: expenseDate.toISOString().split('T')[0],
        amount: recurring.amount,
        amount_without_vat: recurring.amount_without_vat,
        amount_with_vat: recurring.amount_with_vat,
        currency: recurring.currency,
        category_id: recurring.category_id,
        subcategory_id: recurring.subcategory_id,
        supplier: recurring.supplier,
        description: recurring.description,
        doc_type: recurring.doc_type,
        tags: recurring.tags,
        vat_deductible: recurring.vat_deductible,
        status: 'recurent', // Always recurent for recurring expenses
        payment_status: 'paid',
        is_recurring_placeholder: true // Always true for recurring expenses
      });

    if (insertError) {
      console.error("[updateRecurringPaymentStatus] Insert error:", insertError);
      throw new Error(insertError.message);
    }
  }
}
