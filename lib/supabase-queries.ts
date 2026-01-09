import { supabase } from "./supabase";

/**
 * Example query helper that scopes reads to a given team/tenant ID.
 * Assumes your Supabase tables include a `tenant_id` (or `team_id`) column.
 * This does not modify JWT claims; it simply enforces the filter in queries.
 */
export async function fetchProjectsByTeam(teamId: string) {
  const { data, error } = await supabase
    .from("projects") // replace with your table name
    .select("*")
    .eq("tenant_id", teamId)
    .limit(10);

  return { data, error };
}

/**
 * Basic helper to reuse the tenant filter across queries.
 */
export function withTeamFilter(teamId: string) {
  return supabase.from("projects").select("*").eq("tenant_id", teamId);
}
