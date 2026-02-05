"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";

// Role types per PRD:
// - admin: Full access
// - level2: Can only see/edit own salary-related expenses, no export
// - accounting_viewer: View-only expenses, download attachments, no P&L
// - approver: Can approve expenses
// - member: Basic user
export type UserRole = "member" | "approver" | "admin" | "accounting_viewer" | "level2";

export interface UserPermissions {
  canCreateExpense: boolean;
  canEditOwnDraft: boolean;
  canEditAnyDraft: boolean;
  canSubmitForApproval: boolean;
  canApprove: boolean;
  canReject: boolean;
  canMarkPaid: boolean;
  canDeleteExpense: boolean;
  canManageCategories: boolean;
  canManageTeam: boolean;
  canViewPnl: boolean;
  canExportExcel: boolean;
  canDownloadAttachments: boolean;
  canViewAllExpenses: boolean;
  canViewSalaryExpenses: boolean;
  restrictedToSalaryCategory: boolean;
  role: UserRole;
}

const ROLE_PERMISSIONS: Record<UserRole, Omit<UserPermissions, "role">> = {
  // Accounting Viewer: View-only access to expenses, can download attachments, NO P&L
  accounting_viewer: {
    canCreateExpense: false,
    canEditOwnDraft: false,
    canEditAnyDraft: false,
    canSubmitForApproval: false,
    canApprove: false,
    canReject: false,
    canMarkPaid: false,
    canDeleteExpense: false,
    canManageCategories: false,
    canManageTeam: false,
    canViewPnl: false,
    canExportExcel: false,
    canDownloadAttachments: true,
    canViewAllExpenses: true,
    canViewSalaryExpenses: false, // Cannot see salary expenses
    restrictedToSalaryCategory: false,
  },
  // Level 2: Can only see/edit own salary-related expenses, no export
  level2: {
    canCreateExpense: true,
    canEditOwnDraft: true,
    canEditAnyDraft: false,
    canSubmitForApproval: true,
    canApprove: false,
    canReject: false,
    canMarkPaid: false,
    canDeleteExpense: false,
    canManageCategories: false,
    canManageTeam: false,
    canViewPnl: false,
    canExportExcel: false,
    canDownloadAttachments: true,
    canViewAllExpenses: false,
    canViewSalaryExpenses: true,
    restrictedToSalaryCategory: true, // Can only see own salary expenses
  },
  member: {
    canCreateExpense: true,
    canEditOwnDraft: true,
    canEditAnyDraft: false,
    canSubmitForApproval: true,
    canApprove: false,
    canReject: false,
    canMarkPaid: false,
    canDeleteExpense: false,
    canManageCategories: false,
    canManageTeam: false,
    canViewPnl: true,
    canExportExcel: false,
    canDownloadAttachments: true,
    canViewAllExpenses: true,
    canViewSalaryExpenses: false,
    restrictedToSalaryCategory: false,
  },
  approver: {
    canCreateExpense: true,
    canEditOwnDraft: true,
    canEditAnyDraft: false,
    canSubmitForApproval: true,
    canApprove: true,
    canReject: true,
    canMarkPaid: false,
    canDeleteExpense: false,
    canManageCategories: false,
    canManageTeam: false,
    canViewPnl: true,
    canExportExcel: false,
    canDownloadAttachments: true,
    canViewAllExpenses: true,
    canViewSalaryExpenses: true,
    restrictedToSalaryCategory: false,
  },
  admin: {
    canCreateExpense: true,
    canEditOwnDraft: true,
    canEditAnyDraft: true,
    canSubmitForApproval: true,
    canApprove: true,
    canReject: true,
    canMarkPaid: true,
    canDeleteExpense: true,
    canManageCategories: true,
    canManageTeam: true,
    canViewPnl: true,
    canExportExcel: true,
    canDownloadAttachments: true,
    canViewAllExpenses: true,
    canViewSalaryExpenses: true,
    restrictedToSalaryCategory: false,
  },
};

// Valid roles list
const VALID_ROLES: UserRole[] = ["admin", "approver", "member", "accounting_viewer", "level2"];

// Get current user's role in a team
export async function getUserRole(teamId: string): Promise<UserRole> {
  const user = await stackServerApp.getUser();
  if (!user) {
    return "member";
  }

  const { data, error } = await supabase
    .from("team_memberships")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    // Default to member if no membership found
    return "member";
  }

  // Normalize role to our type
  const role = data.role?.toLowerCase() as UserRole;
  if (VALID_ROLES.includes(role)) {
    return role;
  }
  return "member";
}

// Get current user's permissions for a team
export async function getUserPermissions(teamId: string): Promise<UserPermissions> {
  const role = await getUserRole(teamId);
  return {
    ...ROLE_PERMISSIONS[role],
    role,
  };
}

// Check if user can perform a specific action
export async function canPerformAction(
  teamId: string,
  action: keyof Omit<UserPermissions, "role">
): Promise<boolean> {
  const permissions = await getUserPermissions(teamId);
  return permissions[action];
}

// Check if user can edit a specific expense
export async function canEditExpense(
  teamId: string,
  expenseUserId: string,
  expenseStatus: string
): Promise<boolean> {
  if (expenseStatus !== "draft") {
    return false; // Only drafts can be edited
  }

  const user = await stackServerApp.getUser();
  if (!user) return false;

  const permissions = await getUserPermissions(teamId);

  // Admin can edit any draft
  if (permissions.canEditAnyDraft) {
    return true;
  }

  // Others can only edit their own drafts
  return permissions.canEditOwnDraft && user.id === expenseUserId;
}

// Check if user can view a specific expense based on role restrictions
export async function canViewExpense(
  teamId: string,
  expense: {
    user_id: string;
    category_id?: string | null;
    subcategory_id?: string | null;
    category?: string | null;
  }
): Promise<boolean> {
  const user = await stackServerApp.getUser();
  if (!user) return false;

  const permissions = await getUserPermissions(teamId);

  // Admin and approver can see everything
  if (permissions.canViewAllExpenses && permissions.canViewSalaryExpenses) {
    return true;
  }

  // Accounting viewer can see all except salary
  if (permissions.role === "accounting_viewer") {
    const isSalaryExpense = await isSalaryCategory(teamId, expense.category_id, expense.subcategory_id, expense.category);
    return !isSalaryExpense;
  }

  // Level 2 can only see their own salary expenses
  if (permissions.restrictedToSalaryCategory) {
    const isSalary = await isSalaryCategory(teamId, expense.category_id, expense.subcategory_id, expense.category);
    return isSalary && expense.user_id === user.id;
  }

  // Regular members can see all except salary
  if (!permissions.canViewSalaryExpenses) {
    const isSalaryExpense = await isSalaryCategory(teamId, expense.category_id, expense.subcategory_id, expense.category);
    return !isSalaryExpense;
  }

  return permissions.canViewAllExpenses;
}

// Helper to check if a category is salary-related
async function isSalaryCategory(
  teamId: string,
  categoryId?: string | null,
  subcategoryId?: string | null,
  categoryName?: string | null
): Promise<boolean> {
  // Check by name first (case insensitive)
  if (categoryName) {
    const lowerName = categoryName.toLowerCase();
    if (lowerName.includes("salar") || lowerName.includes("salary") || lowerName.includes("salarii")) {
      return true;
    }
  }

  // Check by category/subcategory ID
  const idToCheck = subcategoryId || categoryId;
  if (!idToCheck) return false;

  const { data } = await supabase
    .from("team_expense_categories")
    .select("name, parent_id")
    .eq("id", idToCheck)
    .eq("team_id", teamId)
    .single();

  if (data) {
    const lowerName = data.name.toLowerCase();
    if (lowerName.includes("salar") || lowerName.includes("salary") || lowerName.includes("salarii")) {
      return true;
    }

    // Check parent category
    if (data.parent_id) {
      const { data: parent } = await supabase
        .from("team_expense_categories")
        .select("name")
        .eq("id", data.parent_id)
        .single();

      if (parent) {
        const parentLower = parent.name.toLowerCase();
        if (parentLower.includes("salar") || parentLower.includes("salary") || parentLower.includes("salarii")) {
          return true;
        }
      }
    }
  }

  return false;
}

// Get expense filter based on user role
export async function getExpenseFilterForRole(teamId: string): Promise<{
  filterBySalary: boolean;
  onlyOwnExpenses: boolean;
  userId: string | null;
}> {
  const user = await stackServerApp.getUser();
  const permissions = await getUserPermissions(teamId);

  // Admin/approver - no filter
  if (permissions.canViewAllExpenses && permissions.canViewSalaryExpenses) {
    return { filterBySalary: false, onlyOwnExpenses: false, userId: null };
  }

  // Level 2 - only own salary expenses
  if (permissions.restrictedToSalaryCategory) {
    return { filterBySalary: true, onlyOwnExpenses: true, userId: user?.id || null };
  }

  // Accounting viewer / Member - exclude salary expenses
  if (!permissions.canViewSalaryExpenses) {
    return { filterBySalary: true, onlyOwnExpenses: false, userId: null };
  }

  return { filterBySalary: false, onlyOwnExpenses: false, userId: null };
}

// Get list of available roles for assignment (admin function)
export async function getAvailableRoles(): Promise<{ value: UserRole; label: string; description: string }[]> {
  return [
    { value: "admin", label: "Admin", description: "Full access to all features" },
    { value: "approver", label: "Approver", description: "Can approve/reject expenses" },
    { value: "member", label: "Member", description: "Can create and submit expenses" },
    { value: "level2", label: "Level 2", description: "Can only manage own salary expenses" },
    { value: "accounting_viewer", label: "Accounting Viewer", description: "View-only, can download attachments" },
  ];
}

// Check if user is a Company Admin (admin role in their team)
export async function isCompanyAdmin(teamId: string): Promise<boolean> {
  const role = await getUserRole(teamId);
  return role === "admin";
}

// Check if user can manage company settings
export async function canManageCompanySettings(teamId: string): Promise<boolean> {
  const permissions = await getUserPermissions(teamId);
  return permissions.canManageTeam; // Admin role has this permission
}

// Check if user can manage team members (invite, remove, change roles)
export async function canManageUsers(teamId: string): Promise<boolean> {
  const permissions = await getUserPermissions(teamId);
  return permissions.canManageTeam; // Admin role has this permission
}

// Check if user can view company dashboard
export async function canViewCompanyDashboard(teamId: string): Promise<boolean> {
  // Only admins can view company dashboard
  return await isCompanyAdmin(teamId);
}
