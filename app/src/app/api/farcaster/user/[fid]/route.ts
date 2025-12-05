import { NextRequest, NextResponse } from "next/server";

/**
 * API route to fetch Farcaster user by FID
 * Uses Neynar API (server-side) or Farcaster Hub API as fallback
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params;
    const fidNumber = parseInt(fid, 10);

    if (!fidNumber || isNaN(fidNumber)) {
      return NextResponse.json({ error: "Invalid FID" }, { status: 400 });
    }

    // Try Neynar API first if API key is available
    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (neynarApiKey) {
      try {
        const neynarResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fidNumber}`,
          {
            headers: {
              "api-key": neynarApiKey,
              "Content-Type": "application/json",
            },
          }
        );

        if (neynarResponse.ok) {
          const data = await neynarResponse.json();
          const user = data.users?.[0];
          if (user) {
            return NextResponse.json({
              fid: user.fid,
              username: user.username,
              displayName: user.display_name,
              pfpUrl: user.pfp_url,
              bio: user.profile?.bio?.text,
            });
          }
        }
      } catch (neynarError) {
        console.error("Neynar API error:", neynarError);
        // Fall through to Farcaster Hub API
      }
    }

    // Fallback to Farcaster Hub API (public, no auth required)
    const hubResponse = await fetch(
      `https://api.farcaster.xyz/v2/user-by-fid?fid=${fidNumber}`
    );

    if (hubResponse.ok) {
      const data = await hubResponse.json();
      const user = data.result?.user;
      if (user) {
        return NextResponse.json({
          fid: user.fid,
          username: user.username,
          displayName: user.display_name,
          pfpUrl: user.pfp_url || user.pfp?.url,
          bio: user.profile?.bio?.text,
        });
      }
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

