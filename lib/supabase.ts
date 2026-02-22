import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

// Next.js caches `fetch` calls globally, including the ones made by supabase-js
// talking to PostgREST. For server actions that write or read live data we must
// opt out of that cache; otherwise stale responses can be served between requests.
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

// Client for browser/public operations (uses anon key, subject to RLS).
// The no-store fetch is also applied here because this same client is imported
// by server actions; without it Next.js can cache PostgREST responses globally.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: noStoreFetch },
});

// Admin client for server-side operations (bypasses RLS)
// Only use this in server actions, never expose to client
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: { fetch: noStoreFetch },
    })
  : supabase; // Fallback to regular client if no service key
