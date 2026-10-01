import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let cachedClient: ReturnType<typeof createClient<Database>> | undefined;

function getServerSupabaseConfig() {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_SECRET_KEY"] || process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url) throw new Error("Supabase server URL is not configured.");
  if (!key) throw new Error("Supabase server secret key is not configured.");
  return { url, key };
}

export function getServerSupabase() {
  if (cachedClient) return cachedClient;
  const { url, key } = getServerSupabaseConfig();
  cachedClient = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
