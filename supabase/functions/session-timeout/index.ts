import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.47.10";
import type { Database } from "../../../packages/kit/src/database.types.ts";

serve(async () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase credentials" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("game_sessions")
    .update({ status: "timeout", resolved_at: now })
    .in("status", ["pending_moves", "pending_tx"])
    .lte("expires_at", now)
    .select("id");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  if (data && data.length > 0) {
    await supabase
      .from("matchmaking_queue")
      .update({ status: "cancelled", session_id: null })
      .in("session_id", data.map((row) => row.id));
  }

  return new Response(
    JSON.stringify({ timedOut: data?.length ?? 0, ranAt: now }),
    { headers: { "content-type": "application/json" } },
  );
});

