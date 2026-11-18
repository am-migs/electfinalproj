import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ""
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!supabaseUrl && import.meta.env.PROD) {
  console.warn("Supabase URL is missing. Configure VITE_SUPABASE_URL in your deployment environment.");
}

if (!supabaseKey && import.meta.env.PROD) {
  console.warn("Supabase publishable key is missing. Configure VITE_SUPABASE_PUBLISHABLE_KEY in your deployment environment.");
}

// Keep the existing LocalStorage application usable until the database migration
// has been applied and authentication is enabled.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env.local file and Vercel environment variables."
    );
  }

  return supabase;
}
