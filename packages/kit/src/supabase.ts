import { createClient, type SupabaseClient, type PostgrestError } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type TypedSupabaseClient = SupabaseClient<Database>;

export interface SupabaseClientConfig {
  url: string;
  anonKey: string;
}

export function createSupabaseBrowserClient(config: SupabaseClientConfig) {
  // Clean API key to remove any whitespace/newlines
  const cleanAnonKey = config.anonKey.trim().replace(/\r\n/g, '').replace(/\n/g, '');
  
  return createClient<Database>(config.url, cleanAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

export type SupabaseResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};

