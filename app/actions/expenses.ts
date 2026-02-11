"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";

// Enhanced expense interface matching new schema
export interface TeamExpense {
  id: string;
  expense_uid: string | null;
  parent_expense_id: string | null;
  team_id: string;
  user_id: string;
  amount: number;
  amount_without_vat: number | null;
  amount_with_vat: number | null;
  vat_rate: number | null;
  vat_deductible: boolean;
  currency: string;
  eur_amount: number | null;
  usd_amount: number | null;
  exchange_rate: number | null;
  responsible_id: string | null;
  tags: string[] | null;
  status: string;
  payment_status: string;
  supplier: string | null;
  supplier_cui: string | null;
  description: string | null;
  category: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  doc_number: string | null;
  doc_type: string | null;
  accounting_period: string | null;
  expense_date: string;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  recurring_instance_id: string | null; // Link to recurring instance (for recurring expenses)
  recurring_expense_id: string | null; // Legacy: Link to recurring template
}

export interface ExpenseInput {
  teamId: string;
  amount: number;
  amountWithoutVat?: number;
  amountWithVat?: number;
  vatRate?: number;
  vatDeductible?: boolean;
  currency?: string;
  eurAmount?: number;
  usdAmount?: number;
  exchangeRate?: number;
  responsibleId?: string;
  tags?: string[];
  supplier?: string;
  supplierCui?: string;
  description?: string;
  categoryId?: string;
  subcategoryId?: string;
  docNumber?: string;
  docType?: string;
  paymentStatus?: string;
  accountingPeriod?: string;
  status?: string;
  expenseDate?: string;
  recurringInstanceId?: string; // Link to recurring instance when converting
}

export interface ExpenseLineInput {
  amount: number;
  amountWithoutVat?: number;
  amountWithVat?: number;
  vatRate?: number;
  vatDeductible?: boolean;
  categoryId?: string;
  subcategoryId?: string;
  description?: string;
  accountingPeriod?: string;
}

export interface ExpenseFilters {
  status?: string;
  categoryId?: string;
  subcategoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  supplier?: string;
  responsibleId?: string;
  tags?: string[];
  search?: string;
  includeDeleted?: boolean;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedExpenses {
  data: TeamExpenseListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Lightweight type for expense list view (optimized - smaller payload)
export interface TeamExpenseListItem {
  id: string;
  expense_uid: string | null;
  team_id: string;
  amount: number;
  amount_without_vat: number | null;
  currency: string;
  status: string;
  payment_status: string;
  supplier: string | null;
  description: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  doc_type: string | null;
  expense_date: string;
  created_at: string;
  recurring_expense_id: string | null;
  is_recurring_placeholder: boolean;
  responsible_id: string | null;
  user_id: string;
  tags: string[] | null;
  deleted_at: string | null;
}

// Fields needed for list view (optimized - smaller payload)
const EXPENSE_LIST_FIELDS = `
  id,
  expense_uid,
  team_id,
  amount,
  amount_without_vat,
  currency,
  status,
  payment_status,
  supplier,
  description,
  category_id,
  subcategory_id,
  doc_type,
  expense_date,
  created_at,
  recurring_expense_id,
  is_recurring_placeholder,
  responsible_id,
  user_id,
  tags,
  deleted_at
` as const;

// Get expenses with optional filters
// Optimized: Selects only fields needed for list view
export async function getTeamExpenses(
  teamId: string,
  filters?: ExpenseFilters
): Promise<TeamExpenseListItem[]> {
  let query = supabase
    .from("team_expenses")
    .select(EXPENSE_LIST_FIELDS)
    .eq("team_id", teamId);

  // Only exclude deleted items unless explicitly requested
  if (!filters?.includeDeleted) {
    query = query.is("deleted_at", null);
  }

  // Apply filters
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters?.subcategoryId) {
    query = query.eq("subcategory_id", filters.subcategoryId);
  }
  if (filters?.dateFrom) {
    query = query.gte("expense_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("expense_date", filters.dateTo);
  }
  if (filters?.supplier) {
    query = query.ilike("supplier", `%${filters.supplier}%`);
  }
  if (filters?.responsibleId) {
    query = query.eq("responsible_id", filters.responsibleId);
  }
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags);
  }
  if (filters?.search) {
    // Search in supplier, description, expense_uid (case-insensitive via ilike)
    // Tags search is handled client-side since Supabase array search is complex
    query = query.or(
      `supplier.ilike.%${filters.search}%,description.ilike.%${filters.search}%,expense_uid.ilike.%${filters.search}%`
    );
  }

  // OPTIMIZED: Limit results to improve initial load performance
  // Most users don't need thousands of expenses - 500 most recent is usually enough
  const { data, error } = await query
    .order("expense_date", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Failed to fetch team expenses", error);
    throw new Error(error.message);
  }

  return data || [];
}

// OPTIMIZED: Paginated version of getTeamExpenses for large datasets
// Reduces payload by 90%+ when there are many expenses
export async function getTeamExpensesPaginated(
  teamId: string,
  filters?: ExpenseFilters,
  pagination?: PaginationOptions
): Promise<PaginatedExpenses> {
  const page = pagination?.page || 1;
  const pageSize = pagination?.pageSize || 50;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("team_expenses")
    .select(EXPENSE_LIST_FIELDS, { count: "exact" })
    .eq("team_id", teamId)
    .is("deleted_at", null);

  // Apply filters
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters?.subcategoryId) {
    query = query.eq("subcategory_id", filters.subcategoryId);
  }
  if (filters?.dateFrom) {
    query = query.gte("expense_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("expense_date", filters.dateTo);
  }
  if (filters?.supplier) {
    query = query.ilike("supplier", `%${filters.supplier}%`);
  }
  if (filters?.responsibleId) {
    query = query.eq("responsible_id", filters.responsibleId);
  }
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags);
  }
  if (filters?.search) {
    query = query.or(
      `supplier.ilike.%${filters.search}%,description.ilike.%${filters.search}%,expense_uid.ilike.%${filters.search}%`
    );
  }

  const { data, error, count } = await query
    .order("expense_date", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error("Failed to fetch team expenses", error);
    throw new Error(error.message);
  }

  const total = count || 0;

  return {
    data: data || [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// Get single expense by ID
export async function getExpense(expenseId: string): Promise<TeamExpense | null> {
  const { data, error } = await supabase
    .from("team_expenses")
    .select("*")
    .eq("id", expenseId)
    .is("deleted_at", null)
    .single();

  if (error) {
    console.error("Failed to fetch expense", error);
    return null;
  }

  return data;
}

// Generate next expense UID using database function
async function getNextExpenseUid(teamId: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_next_expense_id", {
    p_team_id: teamId,
  });

  if (error) {
    console.error("Failed to get next expense ID", error);
    // Fallback to timestamp-based ID
    return `EXP-${Date.now().toString(36).toUpperCase()}`;
  }

  return data;
}

// Create expense with all new fields
export async function createExpense(input: ExpenseInput): Promise<TeamExpense> {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  // Get next expense UID
  const expenseUid = await getNextExpenseUid(input.teamId);

  const { data, error } = await supabase
    .from("team_expenses")
    .insert({
      expense_uid: expenseUid,
      team_id: input.teamId,
      user_id: user.id,
      amount: input.amount,
      amount_without_vat: input.amountWithoutVat ?? null,
      amount_with_vat: input.amountWithVat ?? null,
      vat_rate: input.vatRate ?? null,
      vat_deductible: input.vatDeductible ?? false,
      currency: input.currency ?? "RON",
      eur_amount: input.eurAmount ?? null,
      usd_amount: input.usdAmount ?? null,
      exchange_rate: input.exchangeRate ?? null,
      responsible_id: input.responsibleId ?? null,
      tags: input.tags ?? null,
      supplier: input.supplier ?? null,
      supplier_cui: input.supplierCui ?? null,
      description: input.description ?? null,
      category_id: input.categoryId ?? null,
      subcategory_id: input.subcategoryId ?? null,
      doc_number: input.docNumber ?? null,
      doc_type: input.docType ?? null,
      payment_status: input.paymentStatus ?? "unpaid",
      accounting_period: input.accountingPeriod ?? null,
      status: input.status ?? "draft",
      expense_date: input.expenseDate ?? new Date().toISOString().split("T")[0],
      recurring_instance_id: input.recurringInstanceId ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create expense", error);
    throw new Error(error.message);
  }

  // Log audit entry
  await logExpenseAudit(data.id, input.teamId, user.id, "created", null, data);

  return data;
}

// Create multi-line expense (parent + lines)
export async function createMultiLineExpense(
  input: ExpenseInput,
  lines: ExpenseLineInput[]
): Promise<TeamExpense[]> {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  const baseUid = await getNextExpenseUid(input.teamId);
  const results: TeamExpense[] = [];

  // Create each line with derived UID
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineUid = lines.length > 1 ? `${baseUid}-${String.fromCharCode(97 + i)}` : baseUid;

    const { data, error } = await supabase
      .from("team_expenses")
      .insert({
        expense_uid: lineUid,
        parent_expense_id: i > 0 ? results[0]?.id : null,
        team_id: input.teamId,
        user_id: user.id,
        amount: line.amount,
        amount_without_vat: line.amountWithoutVat ?? null,
        amount_with_vat: line.amountWithVat ?? null,
        vat_rate: line.vatRate ?? null,
        vat_deductible: line.vatDeductible ?? false,
        currency: input.currency ?? "RON",
        eur_amount: input.eurAmount ?? null,
        usd_amount: input.usdAmount ?? null,
        exchange_rate: input.exchangeRate ?? null,
        responsible_id: input.responsibleId ?? null,
        tags: input.tags ?? null,
        supplier: input.supplier ?? null,
        supplier_cui: input.supplierCui ?? null,
        description: line.description ?? null,
        category_id: line.categoryId ?? null,
        subcategory_id: line.subcategoryId ?? null,
        doc_number: input.docNumber ?? null,
        doc_type: input.docType ?? null,
        payment_status: input.paymentStatus ?? "unpaid",
        accounting_period: line.accountingPeriod ?? null,
        status: input.status ?? "draft",
        expense_date: input.expenseDate ?? new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create expense line", error);
      throw new Error(error.message);
    }

    results.push(data);
    await logExpenseAudit(data.id, input.teamId, user.id, "created", null, data);
  }

  return results;
}

// Update expense
export async function updateExpense(
  expenseId: string,
  teamId: string,
  updates: Partial<ExpenseInput>
): Promise<TeamExpense> {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  // Get current state for audit
  const current = await getExpense(expenseId);

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.amountWithoutVat !== undefined) updateData.amount_without_vat = updates.amountWithoutVat;
  if (updates.amountWithVat !== undefined) updateData.amount_with_vat = updates.amountWithVat;
  if (updates.vatRate !== undefined) updateData.vat_rate = updates.vatRate;
  if (updates.vatDeductible !== undefined) updateData.vat_deductible = updates.vatDeductible;
  if (updates.currency !== undefined) updateData.currency = updates.currency;
  if (updates.eurAmount !== undefined) updateData.eur_amount = updates.eurAmount;
  if (updates.usdAmount !== undefined) updateData.usd_amount = updates.usdAmount;
  if (updates.exchangeRate !== undefined) updateData.exchange_rate = updates.exchangeRate;
  if (updates.responsibleId !== undefined) updateData.responsible_id = updates.responsibleId;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.supplier !== undefined) updateData.supplier = updates.supplier;
  if (updates.supplierCui !== undefined) updateData.supplier_cui = updates.supplierCui;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
  if (updates.subcategoryId !== undefined) updateData.subcategory_id = updates.subcategoryId;
  if (updates.docNumber !== undefined) updateData.doc_number = updates.docNumber;
  if (updates.docType !== undefined) updateData.doc_type = updates.docType;
  if (updates.paymentStatus !== undefined) updateData.payment_status = updates.paymentStatus;
  if (updates.accountingPeriod !== undefined) updateData.accounting_period = updates.accountingPeriod;
  if (updates.expenseDate !== undefined) updateData.expense_date = updates.expenseDate;
  if (updates.status !== undefined) updateData.status = updates.status;

  const { data, error } = await supabase
    .from("team_expenses")
    .update(updateData)
    .eq("id", expenseId)
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    console.error("Failed to update expense", error);
    throw new Error(error.message);
  }

  // Log audit entry
  await logExpenseAudit(expenseId, teamId, user.id, "updated", current, data);

  return data;
}

// Soft delete expense
export async function deleteExpense(expenseId: string, teamId: string): Promise<void> {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  const current = await getExpense(expenseId);

  const { error } = await supabase
    .from("team_expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", expenseId)
    .eq("team_id", teamId);

  if (error) {
    console.error("Failed to delete expense", error);
    throw new Error(error.message);
  }

  await logExpenseAudit(expenseId, teamId, user.id, "deleted", current, null);

  // If this was a RE-Form (linked to recurring template), regenerate a fresh one
  // The generate_recurring_forms function will create a new 'recurent' row since the old one is soft-deleted
  if (current?.recurring_expense_id && current?.accounting_period) {
    try {
      const [yearStr, monthStr] = current.accounting_period.split('-');
      const targetMonth = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
      const { generateRecurringForms } = await import("./recurring-expenses");
      const count = await generateRecurringForms(teamId, targetMonth);
      console.log(`[deleteExpense] Regenerated ${count} RE-Form(s) for ${current.accounting_period}`);
    } catch (error) {
      console.error("[deleteExpense] Failed to regenerate RE-Form:", error);
      // Non-fatal, log and continue
    }
  }
}

// === WORKFLOW ACTIONS ===

// Submit expense for approval
export async function submitForApproval(expenseId: string, teamId: string): Promise<TeamExpense> {
  return updateExpenseStatus(expenseId, teamId, "pending");
}

// Approve expense
export async function approveExpense(expenseId: string, teamId: string): Promise<TeamExpense> {
  const user = await stackServerApp.getUser();
  if (!user) throw new Error("No user in session");

  const { data, error } = await supabase
    .from("team_expenses")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
    .eq("team_id", teamId)
    .eq("status", "pending")
    .select()
    .single();

  if (error) throw new Error(error.message);
  await logExpenseAudit(expenseId, teamId, user.id, "approved", null, data);
  return data;
}

// Reject expense
export async function rejectExpense(
  expenseId: string,
  teamId: string,
  reason: string
): Promise<TeamExpense> {
  const user = await stackServerApp.getUser();
  if (!user) throw new Error("No user in session");

  const { data, error } = await supabase
    .from("team_expenses")
    .update({
      status: "rejected",
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
    .eq("team_id", teamId)
    .eq("status", "pending")
    .select()
    .single();

  if (error) throw new Error(error.message);
  await logExpenseAudit(expenseId, teamId, user.id, "rejected", null, data);
  return data;
}

// Mark expense as paid
export async function markAsPaid(expenseId: string, teamId: string): Promise<TeamExpense> {
  const user = await stackServerApp.getUser();
  if (!user) throw new Error("No user in session");

  const { data, error } = await supabase
    .from("team_expenses")
    .update({
      status: "paid",
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
    .eq("team_id", teamId)
    .eq("status", "approved")
    .select()
    .single();

  if (error) throw new Error(error.message);
  await logExpenseAudit(expenseId, teamId, user.id, "paid", null, data);
  return data;
}

// Helper: Update status
async function updateExpenseStatus(
  expenseId: string,
  teamId: string,
  newStatus: string
): Promise<TeamExpense> {
  const user = await stackServerApp.getUser();
  if (!user) throw new Error("No user in session");

  const { data, error } = await supabase
    .from("team_expenses")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
    .eq("team_id", teamId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  await logExpenseAudit(expenseId, teamId, user.id, `status_${newStatus}`, null, data);
  return data;
}

// === AUDIT LOGGING ===

async function logExpenseAudit(
  expenseId: string,
  teamId: string,
  userId: string,
  action: string,
  oldValue: unknown,
  newValue: unknown
): Promise<void> {
  try {
    await supabase.from("expense_audit_log").insert({
      expense_id: expenseId,
      team_id: teamId,
      user_id: userId,
      action,
      changes: { old: oldValue, new: newValue },
    });
  } catch (err) {
    console.error("Failed to log audit entry", err);
  }
}

// Get audit log for expense
export async function getExpenseAuditLog(expenseId: string) {
  const { data, error } = await supabase
    .from("expense_audit_log")
    .select("*")
    .eq("expense_id", expenseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch audit log", error);
    return [];
  }

  return data || [];
}
