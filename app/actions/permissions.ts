"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";

export type UserRole = "member" | "approver" | "admin";

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
  role: UserRole;
}

const ROLE_PERMISSIONS: Record<UserRole, Omit<UserPermissions, "role">> = {
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
  },
};

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
  if (role === "admin" || role === "approver") {
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
