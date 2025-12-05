/**
 * Farcaster API utility functions
 * Fetches user profile information including FID and profile image
 */

export interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
}

/**
 * Fetch user profile from Farcaster API by FID
 * Uses Next.js API route which handles Neynar API (server-side) or Farcaster Hub API (fallback)
 */
export async function fetchUserByFid(fid: number): Promise<FarcasterUser | null> {
  try {
    // Use Next.js API route (server-side) which can use Neynar API with API key
    const response = await fetch(`/api/farcaster/user/${fid}`);

    if (response.ok) {
      const user = await response.json();
      return user;
    }

    return null;
  } catch (error) {
    console.error("Error fetching user from Farcaster API:", error);
    return null;
  }
}

/**
 * Fetch multiple users by FIDs
 */
export async function fetchUsersByFids(fids: number[]): Promise<Map<number, FarcasterUser>> {
  const users = new Map<number, FarcasterUser>();
  
  // Fetch users in parallel
  const promises = fids.map(async (fid) => {
    const user = await fetchUserByFid(fid);
    if (user) {
      users.set(fid, user);
    }
  });

  await Promise.all(promises);
  return users;
}

