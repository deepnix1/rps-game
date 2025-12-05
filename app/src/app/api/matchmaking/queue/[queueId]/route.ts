import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@kit/database.types";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ queueId: string }> },
) {
  try {
    const { queueId } = await params;

    if (!queueId) {
      return NextResponse.json({ error: "Missing queue id" }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const { data: queueEntry, error } = await adminClient
      .from("matchmaking_queue")
      .select("*")
      .eq("id", queueId)
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    let session = null;
    if (queueEntry.session_id) {
      const { data: sessionData, error: sessionError } = await adminClient
        .from("game_sessions")
        .select("*")
        .eq("id", queueEntry.session_id)
        .single();

      if (sessionError && sessionError.code !== "PGRST116") {
        return NextResponse.json({ error: sessionError.message }, { status: 500 });
      }

      session = sessionData;
    }

    return NextResponse.json({ queueEntry, session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
