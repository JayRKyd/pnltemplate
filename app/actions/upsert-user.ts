"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";

// Server action to upsert the current Stack Auth user into Supabase `stack_users` table.
export async function upsertCurrentUser(teamId?: string) {
  console.log("[upsertCurrentUser] Called with teamId:", teamId);
  
  const user = await stackServerApp.getUser();
  console.log("[upsertCurrentUser] Stack user:", user?.id, user?.primaryEmail);
  
  if (!user) {
    console.error("[upsertCurrentUser] No user in session");
    throw new Error("No user in session");
  }

  const email = user.primaryEmail ?? null;
  const payload = {
    id: user.id,
    email,
    name: user.displayName ?? null,
    avatar_url: user.profileImageUrl ?? null,
    team_id: teamId ?? null,
  };
  
  console.log("[upsertCurrentUser] Upserting payload:", payload);

  const { data, error } = await supabase.from("stack_users").upsert(
    payload,
    { onConflict: "id" }
  ).select();

  if (error) {
    console.error("[upsertCurrentUser] Supabase error:", error);
    throw error;
  }

  console.log("[upsertCurrentUser] Success:", data);
  return { success: true, userId: user.id };
}
