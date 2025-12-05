"use client";

interface MatchSearchProps {
  username?: string;
  opponentUsername?: string;
  betAmount: string;
  onCancel: () => void;
  isMatched?: boolean;
  userAvatar?: string;
  opponentAvatar?: string;
  overlayStage?: "hidden" | "match_found" | "countdown";
  countdownValue?: number;
}

export function MatchSearch({
  username = "Kenshiro",
  opponentUsername,
  betAmount,
  onCancel,
  isMatched = false,
  userAvatar,
  opponentAvatar,
  overlayStage = "hidden",
  countdownValue = 5,
}: MatchSearchProps) {
  // Only show overlay if we actually have a match (isMatched prop)
  // Don't show overlay just because overlayStage is set - it can be triggered incorrectly
  const showOverlay = overlayStage !== "hidden" && isMatched;
  const isMatchReady = isMatched; // Only use isMatched prop, not overlayStage

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#101018]">
      {showOverlay && (
        <div className="match-found-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="match-found-overlay__content">
            {overlayStage === "match_found" ? (
              <>
                <p className="match-found-overlay__title">Match Found!</p>
                <div className="match-found-overlay__divider">
                  <span className="match-found-overlay__vs">VS</span>
                </div>
                <div className="match-found-overlay__swords">
                  <span className="material-symbols-outlined text-5xl text-yellow-500 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]">
                    swords
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="match-found-overlay__subtitle">MATCH STARTING IN</p>
                <div className="match-found-overlay__timer">{countdownValue}</div>
                <div className="match-found-overlay__divider">
                  <span className="match-found-overlay__vs">VS</span>
                </div>
                <div className="match-found-overlay__swords">
                  <span className="material-symbols-outlined text-5xl text-yellow-500 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]">
                    swords
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center p-4">
        <button
          onClick={onCancel}
          className="text-gray-600 dark:text-gray-300 flex size-12 shrink-0 items-center justify-center"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
        </button>
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
          {isMatchReady ? "Match Found!" : "Searching for Opponent..."}
        </h2>
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="flex-grow flex flex-col justify-center items-center">
          <div className="grid w-full max-w-sm grid-cols-2 items-center gap-4">
            <div className="flex flex-col gap-3 text-center pb-3">
              <div className="px-4">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={username || "You"}
                    className="w-full aspect-square rounded-full border-2 border-[#1A1A1A] object-cover"
                    onError={(e) => {
                      // Fallback to default if image fails
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : (
                  <div
                    className="w-full bg-center bg-no-repeat aspect-square bg-cover rounded-full border-2 border-[#1A1A1A]"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDmkQz2AjsUQxvjRAjXeqxMQu4tg48BYubJCTp39vqpWHwmn2CdFXx0jG7Sl-9ht5DlVmK_vFxeNBnQIqHZmgB5k6NZ4iq9KUz0UsquWYSBZLyanTsfVlqrfR4Runo_ALSC8Y1seMhddK9UCal5PFwT4-ULbKoMYpk5euIaEdO8hx5deiJDH9Lu1eYMEltkEjQTW7qAXLUS3nP-dsuBXhkfwO_T3WoqlIP8eusf08D_05cLLrLHMY76PdzGtKWN0vYY5BMjViIrGtk')",
                    }}
                  />
                )}
              </div>
              <div>
                <p className="text-white text-base font-medium leading-normal">You</p>
                <p className="text-white/70 text-sm font-normal leading-normal">{username}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-center pb-3">
              <div className="px-4">
                {isMatched && opponentAvatar ? (
                  <img
                    src={opponentAvatar}
                    alt={opponentUsername || "Opponent"}
                    className={`w-full aspect-square rounded-full border-2 border-[#1A1A1A] object-cover ${
                      isMatched ? "glowing-border" : ""
                    }`}
                    onError={(e) => {
                      // Fallback to default if image fails
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : (
                  <div
                    className={`w-full bg-center bg-no-repeat aspect-square bg-cover rounded-full border-2 ${
                      isMatched
                        ? "border-[#1A1A1A] glowing-border"
                        : "border-dashed border-gray-400 dark:border-gray-600 animate-spin [animation-duration:10s]"
                    }`}
                    style={{
                      backgroundImage: isMatched
                        ? "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDmkQz2AjsUQxvjRAjXeqxMQu4tg48BYubJCTp39vqpWHwmn2CdFXx0jG7Sl-9ht5DlVmK_vFxeNBnQIqHZmgB5k6NZ4iq9KUz0UsquWYSBZLyanTsfVlqrfR4Runo_ALSC8Y1seMhddK9UCal5PFwT4-ULbKoMYpk5euIaEdO8hx5deiJDH9Lu1eYMEltkEjQTW7qAXLUS3nP-dsuBXhkfwO_T3WoqlIP8eusf08D_05cLLrLHMY76PdzGtKWN0vYY5BMjViIrGtk')"
                        : "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA_CMrGLal6q5Jp9FfWjBs0gnliCRsTOQcl7S8gyGNXbRAXUXHSxmo3ze7i_cdTGCVTBAM1RbB8I23s67QeWxIJa5ORiQeU_UV3IfY4PYAwehT8486sk_sR01vCl5MnGzJyHXGOSjCd3g_YxnDA5E2B_pLt83a6SaQb81f2xFG8uofD_XIsMKR34bhmVqtKJ4VwLH_XoDNLKaEtcVK3lFgv5i_Cv7b0nRmPdaYthmzgNsmJgRUnAH2EIThcqa8xnvzJidTdY01snx0')",
                    }}
                  />
                )}
              </div>
              <div>
                <p className="text-white text-base font-medium leading-normal">
                  {isMatchReady ? opponentUsername || "Opponent" : "Searching..."}
                </p>
                <p className="text-white/50 text-sm font-normal leading-normal">Opponent</p>
              </div>
            </div>
          </div>
          <div className="relative my-6 flex w-full items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <span className="relative bg-[#101018] px-4 text-3xl font-bold text-gray-400">
              VS
            </span>
          </div>
          <div className="flex w-32 h-32 items-center justify-center rounded-full bg-[#1A1A1A]/10 animate-pulse">
            <div className="flex w-24 h-24 items-center justify-center rounded-full bg-[#1A1A1A]/20">
              <span className="material-symbols-outlined text-5xl text-[#1A1A1A]">swords</span>
            </div>
          </div>
          <div className="text-center mt-8">
            <p className="text-white text-base font-normal leading-normal">
              Bet: <span className="font-bold text-yellow-400">{betAmount}</span>
            </p>
            <p className="text-white/50 text-sm font-normal leading-normal pt-1">
              {isMatched ? "Match found! Get ready..." : "Finding a worthy challenger..."}
            </p>
          </div>
        </div>
        <div className="w-full py-4">
          <button
            onClick={onCancel}
            className="h-14 w-full rounded-full bg-[#1A1A1A] text-white font-bold text-base leading-normal shadow-lg shadow-[#1A1A1A]/30 transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            Cancel Search
          </button>
        </div>
      </div>
    </div>
  );
}
