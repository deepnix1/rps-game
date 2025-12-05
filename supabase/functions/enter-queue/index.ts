import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  fid: number;
  bet_amount: number;
  token?: string; // Farcaster Quick Auth JWT token
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get service role client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: RequestBody = await req.json();
    const { fid, bet_amount, token } = body;

    // Validate input
    if (!fid || !bet_amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: fid, bet_amount" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate bet_amount
    const validBetAmounts = [5, 10, 25, 50, 100, 250, 500, 1000];
    if (!validBetAmounts.includes(bet_amount)) {
      return new Response(
        JSON.stringify({ error: "Invalid bet_amount" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If token is provided, verify it (optional for now, but recommended)
    // For now, we'll trust the fid from the client since Edge Function is protected
    // In production, you should verify the Farcaster JWT token here
    // TODO: Add Farcaster JWT verification using @farcaster/auth or similar

    // Delete any existing waiting entries for this fid
    const { error: deleteError } = await supabase
      .from("matchmaking_queue")
      .delete()
      .eq("user_id", fid)
      .eq("status", "waiting");

    if (deleteError) {
      console.error("Error deleting existing queue entries:", deleteError);
      // Continue anyway, as this is not critical
    }

    // Calculate expiration time (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Insert new queue entry
    const { data: insertedData, error: insertError } = await supabase
      .from("matchmaking_queue")
      .insert({
        user_id: fid, // Now stores fid directly
        fid: fid,
        bet_amount: bet_amount,
        expires_at: expiresAt,
        status: "waiting",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting queue entry:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Wait a tiny bit to allow trigger to execute, then fetch the latest state
    // The trigger might have matched the entry immediately
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Fetch the latest state of the entry (trigger might have updated it)
    const { data: latestData, error: fetchError } = await supabase
      .from("matchmaking_queue")
      .select()
      .eq("id", insertedData.id)
      .single();

    if (fetchError) {
      console.error("Error fetching latest queue entry:", fetchError);
      // Return the inserted data anyway
      return new Response(
        JSON.stringify(insertedData),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return the latest data (might be matched if trigger ran)
    return new Response(
      JSON.stringify(latestData || insertedData),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

