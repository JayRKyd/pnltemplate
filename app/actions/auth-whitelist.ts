"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";

export interface WhitelistCheckResult {
  allowed: boolean;
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    teamId: string;
    twoFactorEnabled: boolean;
  };
  error?: string;
  errorCode?: "NOT_WHITELISTED" | "DEACTIVATED" | "EXPIRED" | "ERROR";
}

/**
 * Check if a user's email is whitelisted before allowing access.
 * This should be called during the sign-up/sign-in process.
 */
export async function checkWhitelistAccess(email: string): Promise<WhitelistCheckResult> {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Find the user in whitelist
    const { data: whitelistUser, error } = await supabase
      .from("user_whitelist")
      .select("*")
      .eq("email", normalizedEmail)
      .single();

    if (error || !whitelistUser) {
      return {
        allowed: false,
        error: "Accesul este restricționat. Adresa ta de email nu este în lista de utilizatori autorizați. Contactează administratorul pentru a solicita acces.",
        errorCode: "NOT_WHITELISTED",
      };
    }

    // Check if deactivated
    if (whitelistUser.status === "deactivated") {
      return {
        allowed: false,
        error: "Contul tău a fost dezactivat. Contactează administratorul pentru mai multe informații.",
        errorCode: "DEACTIVATED",
      };
    }

    // Check if invitation expired (only for pending users)
    if (
      whitelistUser.status === "pending" &&
      whitelistUser.invitation_expires_at &&
      new Date(whitelistUser.invitation_expires_at) < new Date()
    ) {
      return {
        allowed: false,
        error: "Invitația ta a expirat. Contactează administratorul pentru o nouă invitație.",
        errorCode: "EXPIRED",
      };
    }

    return {
      allowed: true,
      user: {
        id: whitelistUser.id,
        email: whitelistUser.email,
        fullName: whitelistUser.full_name,
        role: whitelistUser.role,
        teamId: whitelistUser.team_id,
        twoFactorEnabled: whitelistUser.two_factor_enabled || false,
      },
    };
  } catch (err) {
    console.error("[checkWhitelistAccess] Error:", err);
    return {
      allowed: false,
      error: "A apărut o eroare la verificarea accesului. Te rugăm să încerci din nou.",
      errorCode: "ERROR",
    };
  }
}

/**
 * Called after successful authentication to update whitelist status
 * and sync user data.
 */
export async function onAuthSuccess(email: string): Promise<{
  success: boolean;
  teamId?: string;
  role?: string;
}> {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Get whitelist entry
    const { data: whitelistUser, error } = await supabase
      .from("user_whitelist")
      .select("*")
      .eq("email", normalizedEmail)
      .single();

    if (error || !whitelistUser) {
      console.error("[onAuthSuccess] User not in whitelist:", email);
      return { success: false };
    }

    // Update status to active if pending/accepted
    if (whitelistUser.status === "pending" || whitelistUser.status === "accepted") {
      await supabase
        .from("user_whitelist")
        .update({
          status: "active",
          accepted_at: whitelistUser.accepted_at || new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        })
        .eq("id", whitelistUser.id);
    } else {
      // Just update last login
      await supabase
        .from("user_whitelist")
        .update({
          last_login_at: new Date().toISOString(),
        })
        .eq("id", whitelistUser.id);
    }

    // Sync with team membership
    const user = await stackServerApp.getUser();
    if (user) {
      // Update user's name from whitelist (non-editable)
      // Note: This depends on your Stack Auth setup
      
      // Ensure team membership exists with correct role
      const { data: existingMembership } = await supabase
        .from("team_memberships")
        .select("*")
        .eq("team_id", whitelistUser.team_id)
        .eq("user_id", user.id)
        .single();

      if (!existingMembership) {
        // Create membership
        await supabase.from("team_memberships").insert({
          team_id: whitelistUser.team_id,
          user_id: user.id,
          role: whitelistUser.role,
        });
      } else if (existingMembership.role !== whitelistUser.role) {
        // Update role to match whitelist
        await supabase
          .from("team_memberships")
          .update({ role: whitelistUser.role })
          .eq("team_id", whitelistUser.team_id)
          .eq("user_id", user.id);
      }

      // Update stack_users with team_id and name
      await supabase
        .from("stack_users")
        .update({
          team_id: whitelistUser.team_id,
          name: whitelistUser.full_name,
        })
        .eq("id", user.id);
    }

    return {
      success: true,
      teamId: whitelistUser.team_id,
      role: whitelistUser.role,
    };
  } catch (err) {
    console.error("[onAuthSuccess] Error:", err);
    return { success: false };
  }
}

/**
 * Get the whitelisted user's name (to enforce non-editable name).
 */
export async function getWhitelistedName(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("user_whitelist")
      .select("full_name")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !data) return null;
    return data.full_name;
  } catch {
    return null;
  }
}

/**
 * Validate invitation token and return user data.
 */
export async function validateInvitationToken(token: string): Promise<WhitelistCheckResult> {
  try {
    const { data, error } = await supabase
      .from("user_whitelist")
      .select("*")
      .eq("invitation_token", token)
      .single();

    if (error || !data) {
      return {
        allowed: false,
        error: "Invitația nu este validă sau a fost deja utilizată.",
        errorCode: "NOT_WHITELISTED",
      };
    }

    if (data.status === "deactivated") {
      return {
        allowed: false,
        error: "Contul asociat acestei invitații a fost dezactivat.",
        errorCode: "DEACTIVATED",
      };
    }

    if (data.invitation_expires_at && new Date(data.invitation_expires_at) < new Date()) {
      return {
        allowed: false,
        error: "Invitația a expirat. Contactează administratorul pentru o nouă invitație.",
        errorCode: "EXPIRED",
      };
    }

    return {
      allowed: true,
      user: {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        role: data.role,
        teamId: data.team_id,
        twoFactorEnabled: data.two_factor_enabled || false,
      },
    };
  } catch (err) {
    console.error("[validateInvitationToken] Error:", err);
    return {
      allowed: false,
      error: "A apărut o eroare la validarea invitației.",
      errorCode: "ERROR",
    };
  }
}
