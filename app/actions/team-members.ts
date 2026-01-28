"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";

export interface TeamMembership {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  permissions: string[];
  invited_by: string | null;
  joined_at: string;
  updated_at: string;
}

export interface TeamMemberWithProfile {
  user_id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  role: string;
  joined_at: string;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  email: string;
  role: string;
  invited_by: string;
  status: string;
  created_at: string;
  expires_at: string;
}

// Create a team invite (stored in Supabase)
export async function createTeamInvite(
  teamId: string,
  email: string,
  role: string = "member"
) {
  console.log("[createTeamInvite] Inviting", email, "to team", teamId);

  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  // Check if invite already exists
  const { data: existing } = await supabase
    .from("team_invites")
    .select("id")
    .eq("team_id", teamId)
    .eq("email", email.toLowerCase())
    .eq("status", "pending")
    .single();

  if (existing) {
    throw new Error("An invite for this email already exists");
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("stack_users")
    .select("id")
    .eq("email", email.toLowerCase())
    .eq("team_id", teamId)
    .single();

  if (existingMember) {
    throw new Error("This user is already a team member");
  }

  const { data, error } = await supabase
    .from("team_invites")
    .insert({
      team_id: teamId,
      email: email.toLowerCase(),
      role,
      invited_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("[createTeamInvite] Error:", error);
    throw new Error(error.message || "Failed to create invite");
  }

  console.log("[createTeamInvite] Invite created:", data);
  return data;
}

// Get pending invites for a team
export async function getTeamInvites(teamId: string): Promise<TeamInvite[]> {
  try {
    const { data, error } = await supabase
      .from("team_invites")
      .select("*")
      .eq("team_id", teamId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getTeamInvites] Error:", error);
      return []; // Return empty array instead of throwing
    }

    return data || [];
  } catch (err) {
    console.error("[getTeamInvites] Exception:", err);
    return [];
  }
}

// Get pending invites for current user's email
export async function getMyPendingInvites(): Promise<TeamInvite[]> {
  try {
    const user = await stackServerApp.getUser();
    if (!user || !user.primaryEmail) {
      return [];
    }

    const { data, error } = await supabase
      .from("team_invites")
      .select("*")
      .eq("email", user.primaryEmail.toLowerCase())
      .eq("status", "pending");

    if (error) {
      console.error("[getMyPendingInvites] Error:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[getMyPendingInvites] Exception:", err);
    return [];
  }
}

// Accept an invite
export async function acceptTeamInvite(inviteId: string) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      throw new Error("No user in session");
    }

    // Get the invite
    const { data: invite, error: fetchError } = await supabase
      .from("team_invites")
      .select("*")
      .eq("id", inviteId)
      .eq("status", "pending")
      .single();

    if (fetchError || !invite) {
      console.log("[acceptTeamInvite] Invite not found or error:", fetchError);
      return { success: false, error: "Invite not found or already used" };
    }

    // Verify email matches
    if (invite.email.toLowerCase() !== user.primaryEmail?.toLowerCase()) {
      return { success: false, error: "This invite is for a different email address" };
    }

    // Update invite status
    await supabase
      .from("team_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", inviteId);

    // Add to team_memberships
    await supabase.from("team_memberships").upsert(
      {
        team_id: invite.team_id,
        user_id: user.id,
        role: invite.role,
      },
      { onConflict: "team_id,user_id" }
    );

    // Update user's team_id in stack_users
    await supabase
      .from("stack_users")
      .update({ team_id: invite.team_id })
      .eq("id", user.id);

    return { success: true, teamId: invite.team_id };
  } catch (err: any) {
    console.error("[acceptTeamInvite] Exception:", err);
    return { success: false, error: err.message || "Failed to accept invite" };
  }
}

// Cancel/delete an invite
export async function cancelTeamInvite(inviteId: string, teamId: string) {
  try {
    const { error } = await supabase
      .from("team_invites")
      .delete()
      .eq("id", inviteId)
      .eq("team_id", teamId);

    if (error) {
      console.error("[cancelTeamInvite] Error:", error);
      throw new Error(error.message || "Failed to cancel invite");
    }

    return { success: true };
  } catch (err: any) {
    console.error("[cancelTeamInvite] Exception:", err);
    throw new Error(err.message || "Failed to cancel invite");
  }
}

// Sync team membership to Supabase (call after user joins)
// Only creates membership if it doesn't exist - preserves existing role
export async function syncTeamMembership(teamId: string, role: string = "member") {
  console.log("[syncTeamMembership] Syncing membership for team", teamId);
  
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  // Check if membership already exists
  const { data: existing } = await supabase
    .from("team_memberships")
    .select("*")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  // If membership exists, return it without changing the role
  if (existing) {
    console.log("[syncTeamMembership] Membership exists, preserving role:", existing.role);
    return existing;
  }

  // Only insert if no membership exists
  const { data, error } = await supabase
    .from("team_memberships")
    .insert({
      team_id: teamId,
      user_id: user.id,
      role,
    })
    .select()
    .single();

  if (error) {
    console.error("[syncTeamMembership] Error:", error);
    throw error;
  }

  console.log("[syncTeamMembership] Created new membership:", data);
  return data;
}

// Get all members of a team from Supabase
export async function getTeamMembers(teamId: string): Promise<TeamMemberWithProfile[]> {
  // Get memberships
  const { data: memberships, error: memberError } = await supabase
    .from("team_memberships")
    .select("*")
    .eq("team_id", teamId);

  if (memberError) {
    console.error("[getTeamMembers] Error fetching memberships:", memberError);
    throw memberError;
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  // Get user profiles
  const userIds = memberships.map((m) => m.user_id);
  const { data: users, error: userError } = await supabase
    .from("stack_users")
    .select("*")
    .in("id", userIds);

  if (userError) {
    console.error("[getTeamMembers] Error fetching users:", userError);
    throw userError;
  }

  // Merge memberships with user profiles
  const userMap = new Map(users?.map((u) => [u.id, u]) || []);
  
  return memberships.map((m) => {
    const user = userMap.get(m.user_id);
    return {
      user_id: m.user_id,
      email: user?.email || null,
      name: user?.name || null,
      avatar_url: user?.avatar_url || null,
      role: m.role,
      joined_at: m.joined_at,
    };
  });
}

// Update a member's role
export async function updateMemberRole(
  teamId: string,
  userId: string,
  newRole: string
) {
  console.log("[updateMemberRole] Updating", userId, "to role", newRole);

  const { data, error } = await supabase
    .from("team_memberships")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("[updateMemberRole] Error:", error);
    throw error;
  }

  return data;
}

// Remove a member from the team
export async function removeTeamMember(teamId: string, userId: string) {
  console.log("[removeTeamMember] Removing", userId, "from team", teamId);

  // Get ServerTeam directly for server-side operations
  const team = await stackServerApp.getTeam(teamId);
  if (!team) {
    throw new Error("Team not found");
  }

  // Remove from Stack Auth
  await team.removeUser(userId);

  // Remove from Supabase
  const { error } = await supabase
    .from("team_memberships")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId);

  if (error) {
    console.error("[removeTeamMember] Supabase error:", error);
    throw error;
  }

  return { success: true };
}

// Get current user's role in a team
export async function getMyTeamRole(teamId: string): Promise<string | null> {
  const user = await stackServerApp.getUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("team_memberships")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return null;
  }

  return data?.role || null;
}

// Add a user to a team (Stack Auth + Supabase)
export async function addUserToTeam(teamId: string, userId: string, role: string = "admin") {
  console.log("[addUserToTeam] Adding", userId, "to team", teamId, "with role", role);

  // Get ServerTeam directly for server-side operations
  const team = await stackServerApp.getTeam(teamId);
  if (!team) {
    throw new Error("Team not found");
  }

  // Add to Stack Auth
  const serverUser = await stackServerApp.getUser({ or: "throw" });
  // Use the team's addUser method
  try {
    // Get the user by ID
    const targetUser = await stackServerApp.getUser({ id: userId });
    if (targetUser) {
      // Check if user is already in team
      const existingTeams = await targetUser.listTeams();
      const alreadyInTeam = existingTeams.some(t => t.id === teamId);
      
      if (!alreadyInTeam) {
        // Add user to team via Stack Auth
        await team.addUser(userId);
        console.log("[addUserToTeam] Added to Stack Auth team");
      } else {
        console.log("[addUserToTeam] User already in Stack Auth team");
      }
    }
  } catch (err) {
    console.error("[addUserToTeam] Stack Auth error:", err);
    // Continue to sync Supabase even if Stack Auth fails
  }

  // Add to Supabase team_memberships
  const { error: memberError } = await supabase
    .from("team_memberships")
    .upsert({
      team_id: teamId,
      user_id: userId,
      role,
    }, { onConflict: "team_id,user_id" });

  if (memberError) {
    console.error("[addUserToTeam] Supabase membership error:", memberError);
  }

  // Update user's default team in stack_users
  const { error: userError } = await supabase
    .from("stack_users")
    .update({ team_id: teamId })
    .eq("id", userId);

  if (userError) {
    console.error("[addUserToTeam] Supabase user error:", userError);
  }

  return { success: true };
}