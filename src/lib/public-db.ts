import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Public (publishable) database settings. These are safe to ship; all data
// access is via protected database procedures. Env vars override the defaults
// so any host (e.g. Vercel) works with zero configuration.
const DEFAULT_URL = "https://qxylgfcyfbhtdogslrrq.supabase.co";
const DEFAULT_KEY = "sb_publishable_D52T3DjblukZtb1pO4znLA_eiHoSjrC";

export function publicDb() {
  const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  const url = env["SUPABASE_URL"] || env["VITE_SUPABASE_URL"] || import.meta.env['VITE_SUPABASE_URL'] || DEFAULT_URL;
  const key =
    env["SUPABASE_PUBLISHABLE_KEY"] || env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || DEFAULT_KEY;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}
