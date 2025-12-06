"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { BetAmount } from "@kit/bets";
import { useMiniAppIdentity } from "@/hooks/useMiniAppIdentity";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { toDisplayBet } from "@kit/bets";
import { HomePage } from "@/components/HomePage";
import { BetChoose } from "@/components/BetChoose";
import { MatchSearch } from "@/components/MatchSearch";
import { GameWithEnemy } from "@/components/GameWithEnemy";
import { WinLoseScreen } from "@/components/WinLoseScreen";
import { fetchUserByFid } from "@/lib/farcaster-api";

const matchDebugEnabled = process.env.NEXT_PUBLIC_MATCH_DEBUG === "true";

type OpponentInfo = {
  fid: number;
  username?: string;
  avatar?: string;
};

type MatchIntroStage = "hidden" | "match_found" | "countdown";

export default function Home() {
  const { identity, loading: identityLoading } = useMiniAppIdentity();
  const matchmaking = useMatchmaking({ fid: identity?.fid });
  const [showBetChoose, setShowBetChoose] = useState(false);
  const [selectedBet, setSelectedBet] = useState<BetAmount | null>(null);
  const [opponentInfo, setOpponentInfo] = useState<OpponentInfo | null>(null);
  const [queueUiPending, setQueueUiPending] = useState(false);
  const [matchIntroStage, setMatchIntroStage] = useState<MatchIntroStage>("hidden");
  const [countdownValue, setCountdownValue] = useState(5);
  const [forceMatchSearch, setForceMatchSearch] = useState(false);
  const [countdownComplete, setCountdownComplete] = useState(false);
  const lastFetchedOpponentFid = useRef<number | null>(null);
  const matchIntroTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const isLoadingIdentity = identityLoading;
  const hasIdentity = Boolean(identity?.fid);

  const clearOverlayTimers = useCallback(() => {
    if (matchIntroTimeoutRef.current) {
      window.clearTimeout(matchIntroTimeoutRef.current);
      matchIntroTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const resetMatchIntro = useCallback(() => {
    clearOverlayTimers();
    setMatchIntroStage("hidden");
    setForceMatchSearch(false);
    setCountdownValue(5);
    setCountdownComplete(false);
  }, [clearOverlayTimers]);

  const handleStartGame = () => {
    if (!hasIdentity) return;
    setShowBetChoose(true);
  };

  const handleBetSelect = (bet: BetAmount) => {
    setSelectedBet(bet);
  };

  const handleBetConfirm = async () => {
    // Rules for entering matchmaking:
    // 1. Farcaster identity must be present
    // 2. Bet selection must be made
    // 3. Wallet must be connected (checked in enterQueue)
    if (!selectedBet || !hasIdentity) {
      console.error("Unable to enter queue: missing Farcaster identity or bet selection");
      return;
    }

    // Wallet connection will be checked and handled in enterQueue
    // enterQueue will attempt to connect wallet if not connected

    setQueueUiPending(true);
    setShowBetChoose(false);
    try {
      // This will:
      // 1. Check/connect wallet
      // 2. Check/switch to correct chain
      // 3. Enter queue with selected bet
      // 4. Automatically show match search screen when phase becomes "queueing"
      await matchmaking.enterQueue(selectedBet);
    } catch (err) {
      console.error("Failed to enter matchmaking queue", err);
      setQueueUiPending(false);
      setShowBetChoose(true);
    }
  };

  const handleBack = () => {
    if (matchmaking.phase === "queueing" || matchmaking.phase === "matched") {
      matchmaking.leaveQueue();
    }
    resetMatchIntro();
    setShowBetChoose(false);
    setSelectedBet(null);
    setQueueUiPending(false);
  };

  const handleReset = () => {
    matchmaking.reset();
    resetMatchIntro();
    setShowBetChoose(false);
    setSelectedBet(null);
    setOpponentInfo(null);
    setQueueUiPending(false);
  };

  // Fetch opponent info when matched
  useEffect(() => {
    let cancelled = false;
    const shouldLoadOpponent =
      matchmaking.phase === "matched" ||
      matchmaking.phase === "awaiting_move" ||
      matchmaking.phase === "pending_tx" ||
      matchmaking.phase === "complete";

    if (!shouldLoadOpponent) {
      if (matchmaking.phase === "idle" || matchmaking.phase === "queueing") {
        lastFetchedOpponentFid.current = null;
        setOpponentInfo(null);
      }
      return;
    }

    if (!matchmaking.session || !identity?.fid) {
      return;
    }

    const opponentFid =
      matchmaking.session.player1_id === identity.fid
        ? matchmaking.session.player2_fid ?? matchmaking.session.player2_id
        : matchmaking.session.player1_fid ?? matchmaking.session.player1_id;

    if (!opponentFid) {
      return;
    }

    if (lastFetchedOpponentFid.current === opponentFid && opponentInfo) {
      return;
    }

    lastFetchedOpponentFid.current = opponentFid;

    const loadOpponentProfile = async () => {
      try {
        const opponent = await fetchUserByFid(opponentFid);
        if (cancelled) return;

        if (opponent) {
          setOpponentInfo({
            fid: opponentFid,
            username: opponent.displayName || opponent.username || `FID #${opponentFid}`,
            avatar: opponent.pfpUrl || undefined,
          });
          return;
        }

        setOpponentInfo({
          fid: opponentFid,
          username: `FID #${opponentFid}`,
        });
      } catch (error) {
        if (!cancelled) {
          setOpponentInfo({
            fid: opponentFid,
            username: `FID #${opponentFid}`,
          });
        }
      }
    };

    void loadOpponentProfile();

    return () => {
      cancelled = true;
    };
  }, [identity?.fid, matchmaking.phase, matchmaking.session, opponentInfo]);

  const previousSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentSessionId = matchmaking.session?.id ?? null;
    const isQueueOrIdle = matchmaking.phase === "idle" || matchmaking.phase === "queueing";
    const isMatched = matchmaking.phase === "matched" && currentSessionId !== null;

    if (matchDebugEnabled) {
      console.log("[MatchAnimation] Trigger check:", {
        phase: matchmaking.phase,
        sessionId: currentSessionId,
        isMatched,
        currentStage: matchIntroStage,
        previousSessionId: previousSessionIdRef.current,
      });
    }

    // Only trigger overlay if we have a real session AND phase is matched
    if (!isMatched || !currentSessionId) {
      previousSessionIdRef.current = null;
      if (forceMatchSearch || matchIntroStage !== "hidden" || countdownComplete) {
        resetMatchIntro();
      }
      if (isQueueOrIdle) {
        resetMatchIntro();
      }
      return;
    }

    // Don't retrigger if it's the same session
    if (previousSessionIdRef.current === currentSessionId) {
      // But ensure overlay is shown if it was hidden
      if (matchIntroStage === "hidden") {
        if (matchDebugEnabled) {
          console.log("[MatchAnimation] Re-triggering animation for same session");
        }
        setMatchIntroStage("match_found");
        setCountdownValue(5);
        setForceMatchSearch(true);
      }
      return;
    }

    // Only now trigger the match found animation
    if (matchDebugEnabled) {
      console.log("[MatchAnimation] Triggering match found animation!");
    }
    previousSessionIdRef.current = currentSessionId;
    setCountdownComplete(false);
    setForceMatchSearch(true);
    setMatchIntroStage("match_found");
    setCountdownValue(5);
  }, [
    matchmaking.session?.id,
    matchmaking.phase,
    forceMatchSearch,
    matchIntroStage,
    countdownComplete,
    resetMatchIntro,
  ]);

  useEffect(() => {
    if (matchIntroStage === "match_found") {
      clearOverlayTimers();
      matchIntroTimeoutRef.current = window.setTimeout(() => {
        setMatchIntroStage("countdown");
      }, 3000);
    } else if (matchIntroStage === "countdown") {
      clearOverlayTimers();
      setCountdownValue(5);
      countdownIntervalRef.current = window.setInterval(() => {
        setCountdownValue((prev) => {
          if (prev <= 1) {
            clearOverlayTimers();
            setMatchIntroStage("hidden");
            setForceMatchSearch(false);
            setCountdownComplete(true);
            return 1;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearOverlayTimers();
    }

    return () => {
      if (matchIntroStage !== "hidden") {
        clearOverlayTimers();
      }
    };
  }, [matchIntroStage, clearOverlayTimers]);

  useEffect(() => {
    return () => {
      clearOverlayTimers();
    };
  }, [clearOverlayTimers]);

  const shouldShowMatchSearch =
    forceMatchSearch ||
    (queueUiPending && matchmaking.phase === "idle") ||
    matchmaking.phase === "queueing" ||
    (matchmaking.phase === "matched" && !countdownComplete);

  const shouldShowGameScreen = Boolean(
    matchmaking.session &&
      (matchmaking.phase === "awaiting_move" ||
        matchmaking.phase === "pending_tx" ||
        countdownComplete),
  );

  const queueEntryId = matchmaking.queueEntry?.id;
  const sessionId = matchmaking.session?.id;

  useEffect(() => {
    if (!matchDebugEnabled) return;
    console.log("[MatchDebug] phase", {
      phase: matchmaking.phase,
      queueEntryId,
      sessionId,
      betAmount: matchmaking.betAmount,
    });
  }, [matchDebugEnabled, queueEntryId, sessionId, matchmaking.phase, matchmaking.betAmount]);

  useEffect(() => {
    if (!matchDebugEnabled) return;
    console.log("[MatchDebug] overlay", {
      stage: matchIntroStage,
      countdownValue,
      countdownComplete,
      forceMatchSearch,
    });
  }, [matchDebugEnabled, matchIntroStage, countdownValue, countdownComplete, forceMatchSearch]);

  useEffect(() => {
    if (!matchDebugEnabled) return;
    console.log("[MatchDebug] screens", {
      showMatchSearch: shouldShowMatchSearch,
      showGameScreen: shouldShowGameScreen,
    });
  }, [matchDebugEnabled, shouldShowMatchSearch, shouldShowGameScreen]);

  useEffect(() => {
    if (!matchDebugEnabled) return;
    console.log("[MatchDebug] opponent", opponentInfo);
  }, [matchDebugEnabled, opponentInfo?.fid, opponentInfo?.username, opponentInfo?.avatar]);

  // Show bet selection screen
  if (showBetChoose && matchmaking.phase === "idle") {
    return (
      <BetChoose
        selectedBet={selectedBet}
        onSelect={handleBetSelect}
        onConfirm={handleBetConfirm}
        onBack={handleBack}
        confirmDisabled={!hasIdentity}
      />
    );
  }

  if (shouldShowMatchSearch) {
    const activeBet = matchmaking.betAmount ?? selectedBet;
    // Only show as matched if we actually have a session AND phase is matched
    // Don't rely on overlayStage for isMatched - it can be triggered incorrectly
    const isMatchUiReady = matchmaking.phase === "matched" && matchmaking.session !== null && matchmaking.session.id !== undefined;
    return (
      <MatchSearch
        username={identity?.username || identity?.displayName}
        opponentUsername={opponentInfo?.username}
        betAmount={activeBet ? toDisplayBet(activeBet) : "0"}
        onCancel={handleBack}
        isMatched={isMatchUiReady}
        userAvatar={identity?.pfpUrl}
        opponentAvatar={opponentInfo?.avatar}
        overlayStage={matchIntroStage}
        countdownValue={countdownValue}
      />
    );
  }

  // Show game screen (awaiting move or pending tx)
  if (shouldShowGameScreen) {
    const playerMove = matchmaking.session?.player1_id === identity?.fid 
      ? matchmaking.session?.player1_move 
      : matchmaking.session?.player2_move;
    
    return (
      <GameWithEnemy
        opponentName={opponentInfo?.username || "Opponent"}
        opponentAvatar={opponentInfo?.avatar}
        playerScore={0}
        opponentScore={0}
        selectedMove={playerMove || null}
        onSelectMove={matchmaking.submitMove}
        disabled={matchmaking.phase === "pending_tx"}
        loading={matchmaking.submitting}
      />
    );
  }

  // Show win/lose screen
  if (matchmaking.phase === "complete" && matchmaking.session) {
    return (
      <WinLoseScreen
        session={matchmaking.session}
        userId={identity?.fid}
        onRematch={handleReset}
        onMainMenu={handleReset}
      />
    );
  }

  // Show home page (idle state)
  return (
    <HomePage 
      onStartGame={handleStartGame} 
      userAvatar={identity?.pfpUrl}
      username={identity?.username || identity?.displayName}
      startDisabled={isLoadingIdentity || !hasIdentity}
    />
  );
}
