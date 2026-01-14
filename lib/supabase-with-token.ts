import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Create a Supabase client with a custom JWT token.
 * Use this when you need RLS policies to access team_id/role from JWT claims.
 * 
 * Example RLS policy:
 * CREATE POLICY "Team members only" ON your_table
 *   FOR SELECT USING (team_id = current_setting('request.jwt.claims.team_id', true)::text);
 */
export function createSupabaseWithToken(token: string): SupabaseClient {
  return createClient(supabaseUrl, token, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

/**
 * Helper to get team_id from current JWT in RLS context.
 * Use in RLS policies: current_setting('request.jwt.claims.team_id', true)
 */
export const RLS_HELPERS = {
  teamIdClaim: "current_setting('request.jwt.claims.team_id', true)::text",
  userIdClaim: "current_setting('request.jwt.claims.sub', true)::text",
  roleClaim: "current_setting('request.jwt.claims.role', true)::text",
};
