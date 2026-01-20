"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";
import crypto from "crypto";

export interface WhitelistedUser {
  id: string;
  team_id: string;
  email: string;
  full_name: string;
  role: string;
  status: "pending" | "accepted" | "active" | "deactivated";
  auth_methods: string[];
  two_factor_enabled: boolean;
  invited_by: string | null;
  invitation_token: string | null;
  invitation_sent_at: string | null;
  invitation_expires_at: string | null;
  accepted_at: string | null;
  last_login_at: string | null;
  deactivated_at: string | null;
  deactivated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddToWhitelistInput {
  email: string;
  fullName: string;
  role: string;
  authMethods?: string[];
  twoFactorEnabled?: boolean;
}

// Generate a secure invitation token
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Get all whitelisted users for a team
export async function getWhitelistedUsers(teamId: string): Promise<WhitelistedUser[]> {
  const { data, error } = await supabase
    .from("user_whitelist")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getWhitelistedUsers] Error:", error);
    throw new Error(error.message);
  }

  return data || [];
}

// Get a single whitelisted user by email
export async function getWhitelistedUserByEmail(
  teamId: string,
  email: string
): Promise<WhitelistedUser | null> {
  const { data, error } = await supabase
    .from("user_whitelist")
    .select("*")
    .eq("team_id", teamId)
    .eq("email", email.toLowerCase())
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("[getWhitelistedUserByEmail] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

// Check if email is whitelisted (for any team)
export async function isEmailWhitelisted(email: string): Promise<{
  whitelisted: boolean;
  user?: WhitelistedUser;
}> {
  const { data, error } = await supabase
    .from("user_whitelist")
    .select("*")
    .eq("email", email.toLowerCase())
    .in("status", ["pending", "accepted", "active"])
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return { whitelisted: false };
    console.error("[isEmailWhitelisted] Error:", error);
    return { whitelisted: false };
  }

  return { whitelisted: true, user: data };
}

// Add user to whitelist
export async function addToWhitelist(
  teamId: string,
  input: AddToWhitelistInput
): Promise<WhitelistedUser> {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  // Check if email already exists in whitelist
  const existing = await getWhitelistedUserByEmail(teamId, input.email);
  if (existing) {
    throw new Error("This email is already in the whitelist");
  }

  // Generate invitation token
  const invitationToken = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  const { data, error } = await supabase
    .from("user_whitelist")
    .insert({
      team_id: teamId,
      email: input.email.toLowerCase(),
      full_name: input.fullName,
      role: input.role,
      auth_methods: input.authMethods || ["password", "google", "magic_link"],
      two_factor_enabled: input.twoFactorEnabled || false,
      invited_by: user.id,
      invitation_token: invitationToken,
      invitation_expires_at: expiresAt.toISOString(),
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("[addToWhitelist] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

// Update whitelisted user
export async function updateWhitelistedUser(
  id: string,
  teamId: string,
  updates: Partial<{
    fullName: string;
    role: string;
    authMethods: string[];
    twoFactorEnabled: boolean;
  }>
): Promise<WhitelistedUser> {
  const updateData: Record<string, unknown> = {};

  if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.authMethods !== undefined) updateData.auth_methods = updates.authMethods;
  if (updates.twoFactorEnabled !== undefined) updateData.two_factor_enabled = updates.twoFactorEnabled;

  const { data, error } = await supabase
    .from("user_whitelist")
    .update(updateData)
    .eq("id", id)
    .eq("team_id", teamId)
    .select()
    .single();

  if (error) {
    console.error("[updateWhitelistedUser] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

// Deactivate whitelisted user
export async function deactivateWhitelistedUser(
  id: string,
  teamId: string
): Promise<WhitelistedUser> {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  const { data, error } = await supabase
    .from("user_whitelist")
    .update({
      status: "deactivated",
      deactivated_at: new Date().toISOString(),
      deactivated_by: user.id,
    })
    .eq("id", id)
    .eq("team_id", teamId)
    .select()
    .single();

  if (error) {
    console.error("[deactivateWhitelistedUser] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

// Reactivate whitelisted user
export async function reactivateWhitelistedUser(
  id: string,
  teamId: string
): Promise<WhitelistedUser> {
  const { data: existing } = await supabase
    .from("user_whitelist")
    .select("accepted_at")
    .eq("id", id)
    .eq("team_id", teamId)
    .single();

  const newStatus = existing?.accepted_at ? "active" : "pending";

  const { data, error } = await supabase
    .from("user_whitelist")
    .update({
      status: newStatus,
      deactivated_at: null,
      deactivated_by: null,
    })
    .eq("id", id)
    .eq("team_id", teamId)
    .select()
    .single();

  if (error) {
    console.error("[reactivateWhitelistedUser] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

// Remove user from whitelist (hard delete)
export async function removeFromWhitelist(id: string, teamId: string): Promise<void> {
  const { error } = await supabase
    .from("user_whitelist")
    .delete()
    .eq("id", id)
    .eq("team_id", teamId);

  if (error) {
    console.error("[removeFromWhitelist] Error:", error);
    throw new Error(error.message);
  }
}

// Mark invitation as sent
export async function markInvitationSent(id: string, teamId: string): Promise<void> {
  const { error } = await supabase
    .from("user_whitelist")
    .update({
      invitation_sent_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("team_id", teamId);

  if (error) {
    console.error("[markInvitationSent] Error:", error);
    throw new Error(error.message);
  }
}

// Accept invitation (called when user first logs in)
export async function acceptInvitation(
  invitationToken: string
): Promise<WhitelistedUser | null> {
  const { data, error } = await supabase
    .from("user_whitelist")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("invitation_token", invitationToken)
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    console.error("[acceptInvitation] Error:", error);
    return null;
  }

  return data;
}

// Mark user as active (called after successful login)
export async function markUserActive(email: string): Promise<void> {
  const { error } = await supabase
    .from("user_whitelist")
    .update({
      status: "active",
      last_login_at: new Date().toISOString(),
    })
    .eq("email", email.toLowerCase())
    .in("status", ["pending", "accepted"]);

  if (error) {
    console.error("[markUserActive] Error:", error);
  }
}

// Update last login timestamp
export async function updateLastLogin(email: string): Promise<void> {
  const { error } = await supabase
    .from("user_whitelist")
    .update({
      last_login_at: new Date().toISOString(),
    })
    .eq("email", email.toLowerCase())
    .eq("status", "active");

  if (error) {
    console.error("[updateLastLogin] Error:", error);
  }
}

// Resend invitation (regenerate token)
export async function resendInvitation(
  id: string,
  teamId: string
): Promise<WhitelistedUser> {
  const invitationToken = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from("user_whitelist")
    .update({
      invitation_token: invitationToken,
      invitation_expires_at: expiresAt.toISOString(),
      invitation_sent_at: null, // Reset so we can track new send
    })
    .eq("id", id)
    .eq("team_id", teamId)
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    console.error("[resendInvitation] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

// Get whitelist stats for dashboard
export async function getWhitelistStats(teamId: string): Promise<{
  total: number;
  pending: number;
  accepted: number;
  active: number;
  deactivated: number;
}> {
  const { data, error } = await supabase
    .from("user_whitelist")
    .select("status")
    .eq("team_id", teamId);

  if (error) {
    console.error("[getWhitelistStats] Error:", error);
    return { total: 0, pending: 0, accepted: 0, active: 0, deactivated: 0 };
  }

  const stats = {
    total: data?.length || 0,
    pending: 0,
    accepted: 0,
    active: 0,
    deactivated: 0,
  };

  data?.forEach((item) => {
    if (item.status === "pending") stats.pending++;
    else if (item.status === "accepted") stats.accepted++;
    else if (item.status === "active") stats.active++;
    else if (item.status === "deactivated") stats.deactivated++;
  });

  return stats;
}
