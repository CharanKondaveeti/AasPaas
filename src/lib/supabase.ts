"use client";
import { createClient } from "@supabase/supabase-js";
let client: ReturnType<typeof createClient> | undefined;
export function browserDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Admin sign-in is not configured yet.");
  return (client ??= createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }));
}
