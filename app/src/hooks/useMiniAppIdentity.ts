import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { ensureMiniAppReady } from "@kit/minikit";
import { fetchUserByFid } from "@/lib/farcaster-api";

export interface MiniAppIdentity {
  fid: number;
  custody?: string;
  username?: string;
  pfpUrl?: string;
  displayName?: string;
}

type MiniAppViewer = {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  custodyAddress?: string;
};

type MiniAppContext = {
  user?: MiniAppViewer;
  viewer?: MiniAppViewer;
};

export function useMiniAppIdentity() {
  const [identity, setIdentity] = useState<MiniAppIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        await ensureMiniAppReady();
        const context = (await sdk.context) as MiniAppContext;
        if (!mounted) return;

        const user = context.user ?? context.viewer;
        const fid = user?.fid ?? 0;
        
        // If we have FID but missing profile info, fetch from Farcaster API
        if (fid > 0 && (!user?.pfpUrl || !user?.username)) {
          const apiUser = await fetchUserByFid(fid);
          if (apiUser && mounted) {
            setIdentity({
              fid: apiUser.fid,
              custody: user?.custodyAddress ?? undefined,
              username: apiUser.username ?? user?.username,
              pfpUrl: apiUser.pfpUrl ?? user?.pfpUrl,
              displayName: apiUser.displayName ?? user?.displayName,
            });
            return;
          }
        }
        
        // Use context data if available
        if (mounted) {
          setIdentity({
            fid,
            custody: user?.custodyAddress ?? undefined,
            username: user?.username ?? undefined,
            pfpUrl: user?.pfpUrl ?? undefined,
            displayName: user?.displayName ?? undefined,
          });
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load Farcaster context");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return { identity, error, loading };
}
