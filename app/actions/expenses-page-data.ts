"use server";

import { getTeamCategories } from "./categories";
import { getTeamMembers } from "./team-members";
import { getUserPermissions } from "./permissions";
import { getRecurringExpensesWithPayments } from "./recurring-expenses";
import type { ExpenseCategory } from "./categories";
import type { RecurringExpenseWithPayments } from "./recurring-expenses";

export interface ExpensesPageInitialData {
  categories: ExpenseCategory[];
  isAdmin: boolean;
  teamMembers: Awaited<ReturnType<typeof getTeamMembers>>;
  recurringExpenses: RecurringExpenseWithPayments[];
}

/**
 * Fetches all stable, filter-independent data for the expenses page in a
 * single server action call. Running these four queries in parallel on the
 * server means the browser only makes ONE round trip instead of five, which
 * is critical on Vercel free tier where concurrent serverless invocations are
 * serialised and each adds ~300-700 ms of overhead.
 */
export async function getExpensesPageInitialData(
  teamId: string,
  startDate: string,
  endDate: string,
  showDeletedTemplates: boolean
): Promise<ExpensesPageInitialData> {
  const [categories, permissions, teamMembers, recurringExpenses] = await Promise.all([
    getTeamCategories(teamId),
    getUserPermissions(teamId),
    getTeamMembers(teamId),
    getRecurringExpensesWithPayments(teamId, startDate, endDate, showDeletedTemplates),
  ]);

  return {
    categories,
    isAdmin: permissions?.role === 'admin',
    teamMembers,
    recurringExpenses,
  };
}
