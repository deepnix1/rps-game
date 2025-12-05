import { createSupabaseBrowserClient } from "@kit/supabase";
import type { TypedSupabaseClient } from "@kit/supabase";
import { env, assertClientEnv } from "@/lib/env";

let client: TypedSupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  assertClientEnv();
  if (!client) {
    client = createSupabaseBrowserClient({ url: env.supabaseUrl, anonKey: env.supabaseAnonKey });
  }
  return client;
}

