"use server";

import { supabase } from "@/lib/supabase";
import { stackServerApp } from "@/stack";

// Server action to upsert the current Stack Auth user into Supabase `users` table.
export async function upsertCurrentUser() {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("No user in session");
  }

  const { error } = await supabase.from("users").upsert({
    id: user.id,
    email: user.email,
    name: user.displayName ?? null,
    avatar_url: user.imageUrl ?? null,
    team_id: null,
  });

  if (error) {
    console.error("Failed to upsert user into Supabase", error);
    throw error;
  }
}
