"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";
import { getUserRole } from "./permissions";
import { isSuperAdmin } from "./super-admin";

export interface AuditLogEntry {
  id: string;
  team_id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface LogAuditParams {
  teamId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Log a company audit event
 * Called by server actions to track important changes
 */
export async function logCompanyAudit(params: LogAuditParams): Promise<void> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    console.warn("[logCompanyAudit] No user in session, skipping audit log");
    return;
  }

  const { error } = await supabase
    .from("company_audit_log")
    .insert({
      team_id: params.teamId,
      user_id: currentUser.id,
      user_email: currentUser.primaryEmail,
      user_name: currentUser.displayName || currentUser.primaryEmail || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      details: params.details || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    });

  if (error) {
    console.error("[logCompanyAudit] Failed to log audit:", error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Get audit log entries for a company
 * Accessible by: Company Admins of that team, Super Admins
 */
export async function getCompanyAuditLog(
  teamId: string,
  filters?: {
    action?: string;
    entityType?: string;
    userId?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ entries: AuditLogEntry[]; total: number }> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) {
    return { entries: [], total: 0 };
  }

  // Check if user is super admin OR admin of this team
  const isSuper = await isSuperAdmin(currentUser.id);
  const role = await getUserRole(teamId);

  if (!isSuper && role !== "admin") {
    return { entries: [], total: 0 }; // Not authorized
  }

  // Build query
  let query = supabase
    .from("company_audit_log")
    .select("*", { count: "exact" })
    .eq("team_id", teamId);

  // Apply filters
  if (filters?.action) {
    query = query.eq("action", filters.action);
  }
  if (filters?.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }
  if (filters?.userId) {
    query = query.eq("user_id", filters.userId);
  }
  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  // Pagination
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("[getCompanyAuditLog] Error:", error);
    return { entries: [], total: 0 };
  }

  return {
    entries: data || [],
    total: count || 0,
  };
}

/**
 * Get recent audit activity (last 10 actions)
 * Useful for dashboard widgets
 */
export async function getRecentAuditActivity(teamId: string): Promise<AuditLogEntry[]> {
  const currentUser = await stackServerApp.getUser();
  if (!currentUser) return [];

  // Check if user is super admin OR admin of this team
  const isSuper = await isSuperAdmin(currentUser.id);
  const role = await getUserRole(teamId);

  if (!isSuper && role !== "admin") {
    return []; // Not authorized
  }

  const { data, error } = await supabase
    .from("company_audit_log")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[getRecentAuditActivity] Error:", error);
    return [];
  }

  return data || [];
}

/**
 * Get available audit action types (for filters)
 */
export async function getAuditActionTypes(): Promise<{ value: string; label: string }[]> {
  return [
    { value: "company.created", label: "Company Created" },
    { value: "company.updated", label: "Company Updated" },
    { value: "company.suspended", label: "Company Suspended" },
    { value: "user.invited", label: "User Invited" },
    { value: "user.added", label: "User Added" },
    { value: "user.removed", label: "User Removed" },
    { value: "user.role_changed", label: "User Role Changed" },
    { value: "user.activated", label: "User Activated" },
    { value: "user.deactivated", label: "User Deactivated" },
    { value: "budget.created", label: "Budget Created" },
    { value: "budget.updated", label: "Budget Updated" },
    { value: "settings.updated", label: "Settings Updated" },
  ];
}

/**
 * Get available entity types (for filters)
 */
export async function getAuditEntityTypes(): Promise<{ value: string; label: string }[]> {
  return [
    { value: "company", label: "Company" },
    { value: "user", label: "User" },
    { value: "budget", label: "Budget" },
    { value: "settings", label: "Settings" },
  ];
}
