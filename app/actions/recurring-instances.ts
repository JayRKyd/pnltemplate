"use server";

import { supabase } from "@/lib/supabase";
import { createExpense, ExpenseInput, TeamExpense } from "./expenses";

export interface RecurringInstance {
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

export interface ConvertResult {
  requiresConfirmation?: boolean;
  amountDifferencePercent?: number;
  expectedAmount?: number;
  actualAmount?: number;
  expense?: TeamExpense;
  suggestNewTemplate?: boolean;
}

/**
 * Get all instances for a template
 */
export async function getRecurringInstances(
  templateId: string,
  teamId: string,
  year?: number
): Promise<RecurringInstance[]> {
  try {
    let query = supabase
      .from('recurring_instances')
      .select('*')
      .eq('template_id', templateId)
      .eq('team_id', teamId)
      .order('instance_year', { ascending: true })
      .order('instance_month', { ascending: true });

    if (year) {
      query = query.eq('instance_year', year);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getRecurringInstances] Error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[getRecurringInstances] Failed:', error);
    return [];
  }
}

/**
 * Get open instances that need attention (for warnings)
 */
export async function getOpenInstances(
  teamId: string,
  beforeMonth?: { year: number; month: number }
): Promise<RecurringInstance[]> {
  try {
    let query = supabase
      .from('recurring_instances')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'open')
      .order('instance_year', { ascending: true })
      .order('instance_month', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('[getOpenInstances] Error:', error);
      throw error;
    }

    let instances = data || [];

    // Filter by before month if specified
    if (beforeMonth) {
      instances = instances.filter(i => {
        if (i.instance_year < beforeMonth.year) return true;
        if (i.instance_year === beforeMonth.year && i.instance_month < beforeMonth.month) return true;
        return false;
      });
    }

    return instances;
  } catch (error) {
    console.error('[getOpenInstances] Failed:', error);
    return [];
  }
}

/**
 * Get single instance by ID
 */
export async function getInstanceById(
  instanceId: string,
  teamId: string
): Promise<RecurringInstance | null> {
  try {
    const { data, error } = await supabase
      .from('recurring_instances')
      .select('*')
      .eq('id', instanceId)
      .eq('team_id', teamId)
      .single();

    if (error) {
      console.error('[getInstanceById] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[getInstanceById] Failed:', error);
    return null;
  }
}

/**
 * Calculate P&L amount (uses without_vat if deductible, with_vat otherwise)
 */
function calculatePnlAmount(
  amountWithVat: number | null,
  amountWithoutVat: number | null,
  amount: number,
  vatDeductible: boolean
): number {
  if (vatDeductible) {
    return amountWithoutVat || amount || 0;
  }
  return amountWithVat || amount || 0;
}

/**
 * MAIN WORKFLOW: Convert open instance to final expense
 */
export async function convertToFinalExpense(
  instanceId: string,
  teamId: string,
  userId: string,
  expenseData: ExpenseInput,
  confirmAmountDifference: boolean = false
): Promise<ConvertResult> {
  try {
    // 1. Validate instance is open
    const instance = await getInstanceById(instanceId, teamId);
    if (!instance) {
      throw new Error('Instance not found');
    }
    if (instance.status !== 'open') {
      throw new Error('Instance already closed');
    }

    // 2. Calculate amount difference (use P&L amounts)
    const expectedPnlAmount = calculatePnlAmount(
      instance.expected_amount_with_vat,
      instance.expected_amount_without_vat,
      instance.expected_amount,
      instance.expected_vat_deductible
    );

    const actualPnlAmount = calculatePnlAmount(
      expenseData.amountWithVat ?? null,
      expenseData.amountWithoutVat ?? null,
      expenseData.amount,
      expenseData.vatDeductible ?? false
    );

    const diffPercent = expectedPnlAmount > 0
      ? Math.abs((actualPnlAmount - expectedPnlAmount) / expectedPnlAmount * 100)
      : 0;

    // 3. If difference > 10% and not confirmed, return warning
    if (diffPercent > 10 && !confirmAmountDifference) {
      return {
        requiresConfirmation: true,
        amountDifferencePercent: diffPercent,
        expectedAmount: expectedPnlAmount,
        actualAmount: actualPnlAmount,
      };
    }

    // 4. Create final expense
    const expense = await createExpense({
      ...expenseData,
      status: 'final',
      recurringInstanceId: instanceId,
      accountingPeriod: `${instance.instance_year}-${String(instance.instance_month).padStart(2, '0')}`,
    });

    // 5. Close instance
    const { error: updateError } = await supabase
      .from('recurring_instances')
      .update({
        status: 'closed',
        final_expense_id: expense.id,
        closed_at: new Date().toISOString(),
        closed_by: userId,
        amount_difference_percent: diffPercent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', instanceId)
      .eq('team_id', teamId);

    if (updateError) {
      console.error('[convertToFinalExpense] Failed to close instance:', updateError);
      throw updateError;
    }

    // 6. Return success
    return {
      expense,
      suggestNewTemplate: diffPercent > 10,
    };
  } catch (error) {
    console.error('[convertToFinalExpense] Failed:', error);
    throw error;
  }
}

/**
 * Reopen instance when final expense is deleted
 */
export async function reopenInstance(
  instanceId: string,
  teamId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('recurring_instances')
      .update({
        status: 'open',
        final_expense_id: null,
        closed_at: null,
        closed_by: null,
        amount_difference_percent: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', instanceId)
      .eq('team_id', teamId);

    if (error) {
      console.error('[reopenInstance] Error:', error);
      throw error;
    }

    console.log(`[reopenInstance] Instance ${instanceId} reopened`);
  } catch (error) {
    console.error('[reopenInstance] Failed:', error);
    throw error;
  }
}

/**
 * Generate instances for a specific month
 */
export async function generateMonthlyInstances(
  teamId: string,
  targetMonth: Date
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('generate_recurring_instances', {
      p_team_id: teamId,
      p_target_month: targetMonth.toISOString().split('T')[0],
    });

    if (error) {
      console.error('[generateMonthlyInstances] Error:', error);
      throw error;
    }

    console.log(`[generateMonthlyInstances] Generated ${data} instances for ${teamId}`);
    return data || 0;
  } catch (error) {
    console.error('[generateMonthlyInstances] Failed:', error);
    return 0;
  }
}
