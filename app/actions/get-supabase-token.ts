"use server";

import { stackServerApp } from "@/stack";
import { generateSupabaseToken } from "@/lib/supabase-jwt";
import { supabase } from "@/lib/supabase";

/**
 * Exchange Stack Auth session for a Supabase JWT with team_id and role claims.
 * This enables RLS policies to check team membership directly from the JWT.
 */
export async function getSupabaseToken(teamId: string) {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  // Get user's role from team_memberships
  const { data: membership } = await supabase
    .from("team_memberships")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  const role = membership?.role || "member";

  // Generate custom Supabase JWT
  const token = await generateSupabaseToken({
    sub: user.id,
    email: user.primaryEmail || undefined,
    team_id: teamId,
    role,
  });

  return { token, userId: user.id, teamId, role };
}
