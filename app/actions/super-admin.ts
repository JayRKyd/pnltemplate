"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";

export interface SuperAdmin {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  created_by: string | null;
}

/**
 * Check if a user is a Super Admin
 */
export async function isSuperAdmin(userId?: string): Promise<boolean> {
  if (!userId) {
    // Try to get current user from Stack Auth
    const user = await stackServerApp.getUser();
    if (!user) return false;
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("super_admins")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (error || !data) return false;
  return true;
}

/**
 * Check if current user is a Super Admin
 */
export async function checkCurrentUserIsSuperAdmin(): Promise<boolean> {
  const user = await stackServerApp.getUser();
  if (!user) return false;
  return isSuperAdmin(user.id);
}

/**
 * Get all Super Admins
 */
export async function getSuperAdmins(): Promise<SuperAdmin[]> {
  const { data, error } = await supabase
    .from("super_admins")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching super admins:", error);
    return [];
  }

  return data || [];
}

/**
 * Add a new Super Admin (only existing Super Admins can do this)
 */
export async function addSuperAdmin(
  email: string,
  fullName: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  // Verify current user is a Super Admin
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    return { success: false, error: "Only Super Admins can add other Super Admins" };
  }

  // Check if email already exists
  const { data: existing } = await supabase
    .from("super_admins")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return { success: false, error: "This email is already a Super Admin" };
  }

  // If userId not provided, we'll set it when they accept invitation
  const { error } = await supabase
    .from("super_admins")
    .insert({
      user_id: userId || `pending-${Date.now()}`,
      email,
      full_name: fullName,
      created_by: currentUser.id
    });

  if (error) {
    console.error("Error adding super admin:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove a Super Admin (only Super Admins can do this)
 */
export async function removeSuperAdmin(
  superAdminId: string
): Promise<{ success: boolean; error?: string }> {
  // Verify current user is a Super Admin
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) {
    return { success: false, error: "Only Super Admins can remove other Super Admins" };
  }

  // Don't allow removing yourself
  const { data: targetAdmin } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("id", superAdminId)
    .single();

  if (targetAdmin?.user_id === currentUser.id) {
    return { success: false, error: "You cannot remove yourself as Super Admin" };
  }

  // Count remaining super admins
  const { count } = await supabase
    .from("super_admins")
    .select("id", { count: "exact" });

  if (count && count <= 1) {
    return { success: false, error: "Cannot remove the last Super Admin" };
  }

  const { error } = await supabase
    .from("super_admins")
    .delete()
    .eq("id", superAdminId);

  if (error) {
    console.error("Error removing super admin:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get Super Admin by email
 */
export async function getSuperAdminByEmail(email: string): Promise<SuperAdmin | null> {
  const { data, error } = await supabase
    .from("super_admins")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Platform Analytics for Super Admin Dashboard
 */
export interface PlatformAnalytics {
  totalCompanies: number;
  activeCompanies: number;
  pendingCompanies: number;
  suspendedCompanies: number;
  totalUsers: number;
  totalExpenses: number;
  totalExpensesAmount: number;
  recentCompanies: Array<{
    id: string;
    name: string;
    status: string;
    created_at: string;
  }>;
}

/**
 * Get platform-wide analytics (Super Admin only)
 */
export async function getPlatformAnalytics(): Promise<PlatformAnalytics | null> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) return null;

  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) return null;

  // Run all queries in parallel
  const [
    companiesResult,
    membershipsResult,
    expensesResult,
  ] = await Promise.all([
    // All companies
    supabase
      .from("companies")
      .select("id, name, status, created_at"),

    // All team memberships
    supabase
      .from("team_memberships")
      .select("user_id"),

    // All expenses (current year)
    supabase
      .from("team_expenses")
      .select("amount, amount_with_vat, vat_deductible")
      .gte("expense_date", `${new Date().getFullYear()}-01-01`)
      .is("deleted_at", null),
  ]);

  const companies = companiesResult.data || [];
  const memberships = membershipsResult.data || [];
  const expenses = expensesResult.data || [];

  // Count companies by status
  const activeCompanies = companies.filter(c => c.status === "active").length;
  const pendingCompanies = companies.filter(c => c.status === "pending").length;
  const suspendedCompanies = companies.filter(c => c.status === "suspended").length;

  // Calculate total expenses amount
  const totalExpensesAmount = expenses.reduce((sum, exp) => {
    const amount = exp.vat_deductible ? exp.amount : (exp.amount_with_vat || exp.amount);
    return sum + (amount || 0);
  }, 0);

  // Get recent companies (last 5)
  const recentCompanies = companies
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      created_at: c.created_at,
    }));

  return {
    totalCompanies: companies.length,
    activeCompanies,
    pendingCompanies,
    suspendedCompanies,
    totalUsers: memberships.length,
    totalExpenses: expenses.length,
    totalExpensesAmount,
    recentCompanies,
  };
}

/**
 * Get all companies with detailed stats (Super Admin only)
 */
export interface CompanyWithDetailedStats {
  id: string;
  team_id: string;
  name: string;
  admin_email: string;
  status: string;
  created_at: string;
  user_count: number;
  total_expenses: number;
  total_amount: number;
}

export async function getAllCompaniesWithStats(): Promise<CompanyWithDetailedStats[]> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) return [];

  const isSuper = await isSuperAdmin(currentUser.id);
  if (!isSuper) return [];

  // Get all companies
  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, team_id, name, admin_email, status, created_at")
    .order("created_at", { ascending: false });

  if (companiesError || !companies) {
    console.error("Error fetching companies:", companiesError);
    return [];
  }

  // Get memberships count for each team
  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("team_id");

  // Get expenses for each team (current year)
  const { data: expenses } = await supabase
    .from("team_expenses")
    .select("team_id, amount, amount_with_vat, vat_deductible")
    .gte("expense_date", `${new Date().getFullYear()}-01-01`)
    .is("deleted_at", null);

  // Build count maps
  const memberCountMap = new Map<string, number>();
  (memberships || []).forEach(m => {
    memberCountMap.set(m.team_id, (memberCountMap.get(m.team_id) || 0) + 1);
  });

  const expenseStatsMap = new Map<string, { count: number; total: number }>();
  (expenses || []).forEach(exp => {
    const stats = expenseStatsMap.get(exp.team_id) || { count: 0, total: 0 };
    const amount = exp.vat_deductible ? exp.amount : (exp.amount_with_vat || exp.amount);
    stats.count++;
    stats.total += amount || 0;
    expenseStatsMap.set(exp.team_id, stats);
  });

  // Combine data
  return companies.map(company => {
    const expenseStats = expenseStatsMap.get(company.team_id) || { count: 0, total: 0 };
    return {
      id: company.id,
      team_id: company.team_id,
      name: company.name,
      admin_email: company.admin_email,
      status: company.status,
      created_at: company.created_at,
      user_count: memberCountMap.get(company.team_id) || 0,
      total_expenses: expenseStats.count,
      total_amount: expenseStats.total,
    };
  });
}
