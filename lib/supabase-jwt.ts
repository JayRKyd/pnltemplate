import { SignJWT } from "jose";

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export interface SupabaseTokenPayload {
  sub: string; // user_id
  email?: string;
  team_id?: string;
  role?: string;
  aud?: string;
  iss?: string;
}

/**
 * Generate a custom Supabase JWT with team_id and role claims.
 * This allows RLS policies to use: current_setting('request.jwt.claims.team_id', true)
 * 
 * Note: Requires SUPABASE_JWT_SECRET env var (found in Supabase dashboard > Settings > API > JWT Secret)
 */
export async function generateSupabaseToken(
  payload: SupabaseTokenPayload,
  expiresIn: string = "1h"
): Promise<string> {
  if (!SUPABASE_JWT_SECRET) {
    throw new Error(
      "SUPABASE_JWT_SECRET is required for token exchange. " +
      "Find it in Supabase Dashboard > Settings > API > JWT Secret"
    );
  }

  const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);
  
  const token = await new SignJWT({
    sub: payload.sub,
    email: payload.email,
    team_id: payload.team_id,
    role: payload.role || "authenticated",
    aud: payload.aud || "authenticated",
    iss: payload.iss || "supabase",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);

  return token;
}
