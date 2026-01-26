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
