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
    .from("recurring_expenses")
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
    .from("recurring_expenses")
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
    .from("recurring_expenses")
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
    .from("recurring_expenses")
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
    .from("recurring_expenses")
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
    .from("recurring_expenses")
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

// Soft delete recurring expense
export async function deleteRecurringExpense(id: string, teamId: string): Promise<void> {
  const { error } = await supabase
    .from("recurring_expenses")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id)
    .eq("team_id", teamId);

  if (error) {
    console.error("[deleteRecurringExpense] Error:", error);
    throw new Error(error.message);
  }
}

// Generate placeholders for a specific month (calls DB function)
export async function generateRecurringPlaceholders(
  teamId: string,
  targetMonth?: Date
): Promise<number> {
  const monthDate = targetMonth
    ? new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const { data, error } = await supabase.rpc("generate_recurring_placeholders", {
    p_team_id: teamId,
    p_target_month: monthDate.toISOString().split("T")[0],
  });

  if (error) {
    console.error("[generateRecurringPlaceholders] Error:", error);
    throw new Error(error.message);
  }

  return data || 0;
}

// Check if a matching recurring expense exists (for suggesting when creating new expense)
export async function findMatchingRecurring(
  teamId: string,
  supplier?: string,
  subcategoryId?: string
): Promise<RecurringExpense | null> {
  if (!supplier && !subcategoryId) return null;

  let query = supabase
    .from("recurring_expenses")
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

// Get expenses generated from a recurring template
export async function getGeneratedExpenses(
  recurringId: string,
  teamId: string
): Promise<{
  id: string;
  expense_uid: string;
  expense_date: string;
  amount: number;
  status: string;
  is_recurring_placeholder: boolean;
}[]> {
  const { data, error } = await supabase
    .from("team_expenses")
    .select("id, expense_uid, expense_date, amount, status, is_recurring_placeholder")
    .eq("recurring_expense_id", recurringId)
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .order("expense_date", { ascending: false });

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
  category_name?: string;
  subcategory_name?: string;
}

export async function getRecurringExpensesWithPayments(
  teamId: string,
  year: number = new Date().getFullYear()
): Promise<RecurringExpenseWithPayments[]> {
  // Get all recurring expenses
  const { data: recurringExpenses, error: recError } = await supabase
    .from("recurring_expenses")
    .select(`
      *,
      category:team_expense_categories!category_id(name),
      subcategory:team_expense_categories!subcategory_id(name)
    `)
    .eq("team_id", teamId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (recError) {
    console.error("[getRecurringExpensesWithPayments] Error:", recError);
    throw new Error(recError.message);
  }

  if (!recurringExpenses || recurringExpenses.length === 0) {
    return [];
  }

  // Get all generated expenses for these recurring templates for the given year
  const recurringIds = recurringExpenses.map(r => r.id);
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: expenses, error: expError } = await supabase
    .from("team_expenses")
    .select("id, recurring_expense_id, expense_date, status, is_recurring_placeholder")
    .eq("team_id", teamId)
    .in("recurring_expense_id", recurringIds)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
    .is("deleted_at", null);

  if (expError) {
    console.error("[getRecurringExpensesWithPayments] Expenses error:", expError);
  }

  // Build payments map for each recurring expense
  const paymentsMap = new Map<string, Record<string, boolean>>();
  
  (expenses || []).forEach(exp => {
    if (!exp.recurring_expense_id) return;
    
    const month = new Date(exp.expense_date).getMonth();
    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthKey = monthKeys[month];
    
    if (!paymentsMap.has(exp.recurring_expense_id)) {
      paymentsMap.set(exp.recurring_expense_id, {});
    }
    
    const payments = paymentsMap.get(exp.recurring_expense_id)!;
    // If there's a real expense (not placeholder) or it's paid, mark as true
    payments[monthKey] = !exp.is_recurring_placeholder || exp.status === 'paid';
  });

  // Combine data
  return recurringExpenses.map(rec => ({
    ...rec,
    category_name: rec.category?.name,
    subcategory_name: rec.subcategory?.name,
    payments: paymentsMap.get(rec.id) || {}
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
    // Update the status
    const newStatus = paid ? 'paid' : 'pending';
    const { error: updateError } = await supabase
      .from("team_expenses")
      .update({ status: newStatus })
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
        status: 'paid',
        is_recurring_placeholder: false
      });

    if (insertError) {
      console.error("[updateRecurringPaymentStatus] Insert error:", insertError);
      throw new Error(insertError.message);
    }
  }
}
