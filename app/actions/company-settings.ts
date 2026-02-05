"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";
import { getUserRole } from "./permissions";
import { isSuperAdmin } from "./super-admin";

export interface CompanyInfo {
  id: string;
  team_id: string;
  name: string;
  admin_name: string | null;
  admin_email: string;
  admin_phone: string | null;
  status: "pending" | "active" | "suspended";
  created_at: string;
  updated_at: string;
  // Additional metadata
  monthly_budget?: number;
  year_start_month?: number;
  fiscal_year?: number;
}

export interface CompanyStats {
  totalUsers: number;
  activeUsers: number;
  pendingInvites: number;
  totalExpenses: number;
  totalExpensesAmount: number;
  budgetUsed: number;
  budgetRemaining: number;
}

/**
 * Get company information for a team
 * Accessible by: Company Admins of that team, Super Admins
 */
export async function getCompanyInfo(teamId: string): Promise<CompanyInfo | null> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) return null;

  // Check if user is super admin OR admin of this team
  const isSuper = await isSuperAdmin(currentUser.id);
  const role = await getUserRole(teamId);

  if (!isSuper && role !== "admin") {
    return null; // Not authorized
  }

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("team_id", teamId)
    .single();

  if (error) {
    console.error("[getCompanyInfo] Error:", error);
    return null;
  }

  // Get budget info if exists
  const { data: budgetData } = await supabase
    .from("team_budgets")
    .select("year, monthly_budget, year_start_month")
    .eq("team_id", teamId)
    .order("year", { ascending: false })
    .limit(1)
    .single();

  return {
    ...data,
    monthly_budget: budgetData?.monthly_budget,
    year_start_month: budgetData?.year_start_month,
    fiscal_year: budgetData?.year,
  };
}

/**
 * Update company information
 * Accessible by: Company Admins of that team, Super Admins
 */
export async function updateCompanyInfo(
  teamId: string,
  updates: {
    name?: string;
    admin_name?: string;
    admin_phone?: string;
    monthly_budget?: number;
    year_start_month?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is super admin OR admin of this team
  const isSuper = await isSuperAdmin(currentUser.id);
  const role = await getUserRole(teamId);

  if (!isSuper && role !== "admin") {
    return { success: false, error: "Only Company Admins can update company info" };
  }

  // Extract budget-related fields
  const { monthly_budget, year_start_month, ...companyUpdates } = updates;

  // Update company table
  if (Object.keys(companyUpdates).length > 0) {
    const { error: companyError } = await supabase
      .from("companies")
      .update({
        ...companyUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq("team_id", teamId);

    if (companyError) {
      console.error("[updateCompanyInfo] Company update error:", companyError);
      return { success: false, error: companyError.message };
    }
  }

  // Update budget if provided
  if (monthly_budget !== undefined || year_start_month !== undefined) {
    const currentYear = new Date().getFullYear();

    const { error: budgetError } = await supabase
      .from("team_budgets")
      .upsert({
        team_id: teamId,
        year: currentYear,
        monthly_budget: monthly_budget,
        year_start_month: year_start_month,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "team_id,year"
      });

    if (budgetError) {
      console.error("[updateCompanyInfo] Budget update error:", budgetError);
      // Don't fail the whole operation
    }
  }

  return { success: true };
}

/**
 * Get company statistics
 * Accessible by: Company Admins of that team, Super Admins
 */
export async function getCompanyStats(teamId: string): Promise<CompanyStats | null> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) return null;

  // Check if user is super admin OR admin of this team
  const isSuper = await isSuperAdmin(currentUser.id);
  const role = await getUserRole(teamId);

  if (!isSuper && role !== "admin") {
    return null; // Not authorized
  }

  // Run all queries in parallel
  const [
    membershipsResult,
    whitelistResult,
    expensesResult,
    budgetResult,
  ] = await Promise.all([
    // Active team members
    supabase
      .from("team_memberships")
      .select("user_id, is_active")
      .eq("team_id", teamId),

    // Pending invites
    supabase
      .from("user_whitelist")
      .select("id")
      .eq("team_id", teamId)
      .eq("status", "pending"),

    // Expenses for current year
    supabase
      .from("team_expenses")
      .select("amount, amount_with_vat, vat_deductible")
      .eq("team_id", teamId)
      .gte("expense_date", `${new Date().getFullYear()}-01-01`)
      .is("deleted_at", null),

    // Budget info
    supabase
      .from("team_budgets")
      .select("monthly_budget")
      .eq("team_id", teamId)
      .eq("year", new Date().getFullYear())
      .single(),
  ]);

  const memberships = membershipsResult.data || [];
  const whitelist = whitelistResult.data || [];
  const expenses = expensesResult.data || [];
  const budget = budgetResult.data;

  // Calculate active users
  const activeUsers = memberships.filter(m => m.is_active !== false).length;

  // Calculate total expense amount (use P&L logic: without_vat if deductible, with_vat otherwise)
  const totalExpensesAmount = expenses.reduce((sum, exp) => {
    const amount = exp.vat_deductible ? exp.amount : (exp.amount_with_vat || exp.amount);
    return sum + (amount || 0);
  }, 0);

  const monthlyBudget = budget?.monthly_budget || 0;
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const budgetUsedPercent = monthlyBudget > 0
    ? (totalExpensesAmount / (monthlyBudget * currentMonth)) * 100
    : 0;

  return {
    totalUsers: memberships.length + whitelist.length,
    activeUsers,
    pendingInvites: whitelist.length,
    totalExpenses: expenses.length,
    totalExpensesAmount,
    budgetUsed: budgetUsedPercent,
    budgetRemaining: (monthlyBudget * currentMonth) - totalExpensesAmount,
  };
}

/**
 * Get list of all company admins for a team
 * Accessible by: Super Admins only
 */
export async function getCompanyAdmins(teamId: string): Promise<{
  user_id: string;
  email: string | null;
  name: string | null;
  role: string;
}[]> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) return [];

  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) return [];

  const { data, error } = await supabase
    .from("team_memberships")
    .select(`
      user_id,
      role,
      stack_users (
        email,
        name
      )
    `)
    .eq("team_id", teamId)
    .eq("role", "admin");

  if (error) {
    console.error("[getCompanyAdmins] Error:", error);
    return [];
  }

  return (data || []).map((m: any) => ({
    user_id: m.user_id,
    email: m.stack_users?.email || null,
    name: m.stack_users?.name || null,
    role: m.role,
  }));
}

/**
 * Check if current user can manage a specific company
 */
export async function canManageCompany(teamId: string): Promise<boolean> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) return false;

  // Super admins can manage any company
  const isSuper = await isSuperAdmin(currentUser.id);
  if (isSuper) return true;

  // Company admins can manage their own company
  const role = await getUserRole(teamId);
  return role === "admin";
}
