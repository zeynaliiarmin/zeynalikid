// supabase/functions/_shared/supabaseClient.ts
// Creates a Supabase client with the service_role key.
// The service_role key bypasses RLS and is only available inside Edge Functions.
// NEVER expose this key to the client/browser.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
