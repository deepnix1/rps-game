import { useCallback, useEffect, useRef, useState } from "react";
import type { GameSessionRow, MatchmakingQueueRow, MoveChoice } from "@kit/schema";
import type { Database } from "@kit/database.types";
import type { BetAmount } from "@kit/bets";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { env } from "@/lib/env";
import { requestSelectionHaptic } from "@kit/minikit";
import { BET_TOKEN_MAP } from "@/config/bets";
import { rockPaperScissorsAbi } from "@/lib/abi/rockPaperScissors";
import { uuidToBytes32 } from "@/lib/uuid";
import { getNetworkConfig } from "@/config/networks";
import { useWallet } from "./useWallet";
import { parseEther } from "viem";
import { sdk } from "@farcaster/miniapp-sdk";

const moveMap: Record<MoveChoice, number> = {
  rock: 1,
  paper: 2,
  scissors: 3,
};

type SubmitMoveArgs = Database["public"]["Functions"]["rpc_submit_move"]["Args"];

export type MatchmakingPhase =
  | "idle"
  | "queueing"
  | "matched"
  | "awaiting_move"
  | "pending_tx"
  | "complete";

interface Args {
  fid?: number;
}

export function useMatchmaking({ fid }: Args) {
  const supabase = getSupabaseBrowserClient();
  const {
    isConnected: walletConnected,
    isCorrectChain: walletCorrectChain,
    connectWallet,
    switchChain,
    ensureWalletClient,
    publicClient: wagmiPublicClient,
  } = useWallet();
  const [queueEntry, setQueueEntry] = useState<MatchmakingQueueRow | null>(null);
  const [session, setSession] = useState<GameSessionRow | null>(null);
  const [phase, setPhase] = useState<MatchmakingPhase>("idle");
  const [betAmount, setBetAmount] = useState<BetAmount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const canQueue = Boolean(fid && walletConnected && !queueEntry && !session && phase !== "pending_tx");

  const enterQueue = useCallback(
    async (amount: BetAmount) => {
      if (!fid) {
        const err = new Error("Missing Farcaster identity");
        setError(err.message);
        throw err;
      }
      try {
        if (!walletConnected) {
          await connectWallet();
        }
        if (!walletCorrectChain) {
          await switchChain();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Wallet connection required";
        setError(message);
        setPhase("idle");
        throw new Error(message);
      }
      setPhase("queueing");
      setError(null);

      // Call Edge Function instead of direct insert
      const { data, error: functionError } = await supabase.functions.invoke("enter-queue", {
        body: {
          fid,
          bet_amount: amount,
        },
      });

      if (functionError) {
        console.error("[Matchmaking] Edge Function error:", functionError);
        setPhase("idle");
        setError(functionError.message);
        throw new Error(functionError.message);
      }

      if (process.env.NEXT_PUBLIC_MATCH_DEBUG === "true") {
        console.log("[Matchmaking] Edge Function response:", { data, error: functionError });
      }

      // Supabase functions.invoke returns { data: <response>, error: null }
      // Our Edge Function returns the queue entry directly
      if (!data) {
        setPhase("idle");
        setError("Failed to enter queue");
        throw new Error("Failed to enter queue");
      }

      // Validate data structure
      if (typeof data !== "object" || !data.id) {
        console.error("[Matchmaking] Invalid data from Edge Function:", data);
        setPhase("idle");
        setError("Invalid response from server");
        throw new Error("Invalid response from server");
      }

      setQueueEntry(data);
      setBetAmount(amount);

      // Always set phase based on status
      if (data.status === "matched" && data.session_id) {
        setPhase("matched");
        // Fetch session immediately
        const { data: sessionData, error: sessionError } = await supabase
          .from("game_sessions")
          .select()
          .eq("id", data.session_id)
          .single();
        if (sessionError) {
          console.error("[Matchmaking] Failed to fetch session:", sessionError);
          // If session fetch fails, don't set phase to matched
          setPhase("queueing");
        } else if (sessionData) {
          setSession(sessionData);
        } else {
          // No session data, keep in queueing
          setPhase("queueing");
        }
      } else {
        // Status is waiting, set phase to queueing
        setPhase("queueing");
      }
    },
    [connectWallet, fid, supabase, switchChain, walletConnected, walletCorrectChain],
  );

  const leaveQueue = useCallback(async () => {
    if (!queueEntry) return;
    await supabase.from("matchmaking_queue").delete().eq("id", queueEntry.id);
    setQueueEntry(null);
    setPhase("idle");
  }, [queueEntry, supabase]);

  useEffect(() => {
    if (!queueEntry) return;

    // Set up Realtime subscription
    const channel = supabase
      .channel(`queue-${queueEntry.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matchmaking_queue", filter: `id=eq.${queueEntry.id}` },
        (payload) => {
          if (process.env.NEXT_PUBLIC_MATCH_DEBUG === "true") {
            console.log("[Matchmaking] Realtime UPDATE received:", payload);
          }
          const row = payload.new as MatchmakingQueueRow;
          setQueueEntry(row);
          
          // Always update phase based on status
          if (row.status === "matched" && row.session_id) {
            const sessionId = row.session_id;
            void (async () => {
              const { data: sessionData, error: sessionError } = await supabase
                .from("game_sessions")
                .select()
                .eq("id", sessionId)
                .single();
              if (sessionError) {
                console.error("[Matchmaking] Failed to fetch session from Realtime:", sessionError);
                // If session fetch fails, don't set phase to matched
                setPhase("queueing");
              } else if (sessionData) {
                setSession(sessionData);
                setPhase("matched");
              } else {
                // No session data, keep in queueing
                setPhase("queueing");
              }
            })();
          } else if (row.status === "waiting") {
            setPhase("queueing");
          } else if (row.status === "cancelled") {
            setPhase("idle");
            setQueueEntry(null);
          }
        },
      );

    channelRef.current = channel;
    channel.subscribe((status, err) => {
      if (process.env.NEXT_PUBLIC_MATCH_DEBUG === "true") {
        console.log("[Matchmaking] Realtime subscription status:", status, err);
      }
      
      // Log errors and failed subscriptions
      if (status === "SUBSCRIBED") {
        if (process.env.NEXT_PUBLIC_MATCH_DEBUG === "true") {
          console.log("[Matchmaking] Realtime subscription successful");
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        console.error("[Matchmaking] Realtime subscription failed:", status, err);
        // Realtime failed, polling will handle updates
      } else if (status === "SUBSCRIBE_ERROR") {
        console.error("[Matchmaking] Realtime subscription error:", status, err);
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queueEntry, supabase]);

  useEffect(() => {
    const queueId = queueEntry?.id;
    if (!queueId) return;

    let cancelled = false;

    const fetchQueueStatus = async () => {
      try {
        const response = await fetch(`/api/matchmaking/queue/${queueId}`);
        if (response.status === 404) {
          if (!cancelled) {
            setQueueEntry(null);
            setPhase("idle");
          }
          return;
        }
        if (!response.ok) {
          if (process.env.NEXT_PUBLIC_MATCH_DEBUG === "true") {
            console.warn("[Matchmaking] Polling failed:", response.status, response.statusText);
          }
          return;
        }
        const payload = await response.json();
        if (cancelled) return;

        const latestEntry = payload.queueEntry as MatchmakingQueueRow;
        if (latestEntry) {
          setQueueEntry(latestEntry);
          
          // Always update phase based on status
          if (latestEntry.status === "matched" && latestEntry.session_id) {
            // Ensure session is fetched
            if (payload.session) {
              setSession(payload.session as GameSessionRow);
              setPhase("matched");
            } else {
              // Fetch session if not in payload
              const { data: sessionData, error: sessionError } = await supabase
                .from("game_sessions")
                .select()
                .eq("id", latestEntry.session_id)
                .single();
              if (sessionError) {
                console.error("[Matchmaking] Failed to fetch session from polling:", sessionError);
                setPhase("queueing");
              } else if (sessionData) {
                setSession(sessionData);
                setPhase("matched");
              } else {
                setPhase("queueing");
              }
            }
          } else if (latestEntry.status === "waiting") {
            setPhase("queueing");
          } else if (latestEntry.status === "cancelled") {
            setPhase("idle");
            setQueueEntry(null);
          }
        }

        if (payload.session) {
          setSession(payload.session as GameSessionRow);
        }
      } catch (err) {
        console.warn("[Matchmaking] Failed to fetch matchmaking status", err);
      }
    };

    fetchQueueStatus();
    // Poll more frequently to catch missed Realtime updates
    const interval = window.setInterval(fetchQueueStatus, 800);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [queueEntry?.id]);

  useEffect(() => {
    const sessionId = queueEntry?.session_id;
    if (!sessionId) return;

    const fetchSession = async () => {
      const { data } = await supabase.from("game_sessions").select().eq("id", sessionId).single();
      if (data) setSession(data);
    };

    fetchSession();

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          if (process.env.NEXT_PUBLIC_MATCH_DEBUG === "true") {
            console.log("[Matchmaking] Session Realtime UPDATE received:", payload);
          }
          setSession(payload.new as GameSessionRow);
        },
      )
      .subscribe((status, err) => {
        if (process.env.NEXT_PUBLIC_MATCH_DEBUG === "true") {
          console.log("[Matchmaking] Session Realtime subscription status:", status, err);
        }
        if (status !== "SUBSCRIBED") {
          console.warn("[Matchmaking] Session Realtime subscription not successful:", status, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queueEntry?.session_id, supabase]);

  useEffect(() => {
    if (!session) return;
    if (session.status === "pending_moves") {
      setPhase("awaiting_move");
    }
    if (session.status === "pending_tx") {
      setPhase("pending_tx");
    }
    if (["finished", "timeout", "cancelled"].includes(session.status)) {
      setPhase("complete");
    }
  }, [session]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        void leaveQueue();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [leaveQueue]);

  useEffect(() => {
    return () => {
      void leaveQueue();
    };
  }, [leaveQueue]);

  const submitMove = useCallback(
    async (move: MoveChoice) => {
      if (!session || !betAmount) return;
      setSubmitting(true);
      setError(null);
      await requestSelectionHaptic();

      // Ensure wallet is connected
      if (!walletConnected) {
        try {
          await connectWallet();
        } catch {
          setSubmitting(false);
          setError("Please connect your wallet");
          return;
        }
      }

      // Ensure correct chain
      if (!walletCorrectChain) {
        try {
          await switchChain();
        } catch {
          setSubmitting(false);
          setError("Please switch to the correct network");
          return;
        }
      }

      // Get Farcaster JWT token for authentication
      let farcasterToken: string | undefined;
      try {
        const tokenResult = await sdk.quickAuth.getToken();
        farcasterToken = tokenResult.token;
      } catch (err) {
        console.warn("Failed to get Farcaster token, proceeding without it:", err);
      }

      // Submit move to Supabase using REST API with JWT token
      const rpcArgs: SubmitMoveArgs = {
        p_session_id: session.id,
        p_move: move,
        p_signature: "\\x",
      };
      
      // Use REST API directly to include JWT token in Authorization header
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${env.supabaseAnonKey}`,
      };
      
      if (farcasterToken) {
        headers["x-farcaster-token"] = farcasterToken;
      }
      
      const response = await fetch(
        `${env.supabaseUrl}/rest/v1/rpc/rpc_submit_move`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(rpcArgs),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        setSubmitting(false);
        setError(errorData.message || "Failed to submit move");
        return;
      }
      
      const result = await response.json();
      
      // Update session with result
      if (result) {
        setSession(result as GameSessionRow);
      }

      try {
        const client = await ensureWalletClient();
        const stake = parseEther(BET_TOKEN_MAP[betAmount]);
        const contractAddress = getNetworkConfig().contractAddress as `0x${string}`;
        const txHash = await client.writeContract({
          address: contractAddress,
          abi: rockPaperScissorsAbi,
          functionName: "submitMove",
          args: [uuidToBytes32(session.id), moveMap[move]],
          value: stake,
          account: client.account ?? null,
          chain: undefined,
        });
        setTransactionHash(txHash);
        if (wagmiPublicClient) {
          await wagmiPublicClient.waitForTransactionReceipt({ hash: txHash });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send transaction");
      } finally {
        setSubmitting(false);
      }
    },
    [betAmount, connectWallet, ensureWalletClient, session, supabase, switchChain, wagmiPublicClient, walletConnected, walletCorrectChain],
  );

  const reset = useCallback(() => {
    setQueueEntry(null);
    setSession(null);
    setPhase("idle");
    setTransactionHash(null);
    setBetAmount(null);
  }, []);

  return {
    queueEntry,
    session,
    phase,
    betAmount,
    canQueue,
    enterQueue,
    leaveQueue,
    submitMove,
    reset,
    error,
    submitting,
    transactionHash,
  };
}
