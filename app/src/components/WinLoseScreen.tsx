"use client";

import type { GameSessionRow } from "@kit/schema";

interface WinLoseScreenProps {
  session: GameSessionRow;
  userId?: number; // Changed from string to number (fid)
  onRematch: () => void;
  onMainMenu: () => void;
}

const moveImages: Record<string, string> = {
  rock: "https://lh3.googleusercontent.com/aida-public/AB6AXuAUK4LnheUeiNR52A3NSA25IayNkGgRn8kH5ZpOFCc-qMzu5stqNDND2Fs9YTAlt2KmLOwWtjYLSHy2L1qt2Oj0OXtlkijnErVgcOaFe_Dbvp0WYI69dbSBFEE9UNP0tL6L3qaCCM4Gc9bAPlO1isndfuXK801JjaK3j11JNbbbra8q0xKwr7L2qmqQ9gvZPKx_mvpK8yUyUCtxKeCxGiVG3xRV3TaeL4t31s_R65xh1_anyT_r04AAkxmhoNVU8afMmtScoH7boU4",
  paper: "https://lh3.googleusercontent.com/aida-public/AB6AXuAUK4LnheUeiNR52A3NSA25IayNkGgRn8kH5ZpOFCc-qMzu5stqNDND2Fs9YTAlt2KmLOwWtjYLSHy2L1qt2Oj0OXtlkijnErVgcOaFe_Dbvp0WYI69dbSBFEE9UNP0tL6L3qaCCM4Gc9bAPlO1isndfuXK801JjaK3j11JNbbbra8q0xKwr7L2qmqQ9gvZPKx_mvpK8yUyUCtxKeCxGiVG3xRV3TaeL4t31s_R65xh1_anyT_r04AAkxmhoNVU8afMmtScoH7boU4",
  scissors: "https://lh3.googleusercontent.com/aida-public/AB6AXuBi7IEg82K6khVFHq7Z0LmBDgdQSPiDHj10zqCLIPqiF4tvZgokx_a3pRLyFv9NwsIW-dWI3y4YJ5cvl2CcEyStD23Hsm-HUfhP7GaBpoaPkZQLbGvO-i7fqPATv_-fEDn4LCC7CtW7NNCuGuT0ctULkAApR_5vLiG2YWbEeMkrWcsVowBZXMPhTZmko7zMlcJzyMdCFpSelilmeg-bBopFToV9IshKX7MzGJf8reExCwptva0d-DWcBRREEYzeofYsMEybjkLSzHk",
};

const moveLabels: Record<string, { en: string; jp: string }> = {
  rock: { en: "Rock", jp: "あなたの岩" },
  paper: { en: "Paper", jp: "あなたの紙" },
  scissors: { en: "Scissors", jp: "あなたの鋏" },
};

const opponentMoveLabels: Record<string, { en: string; jp: string }> = {
  rock: { en: "Opponent's Rock", jp: "相手の岩" },
  paper: { en: "Opponent's Paper", jp: "相手の紙" },
  scissors: { en: "Opponent's Scissors", jp: "相手の鋏" },
};

export function WinLoseScreen({ session, userId, onRematch, onMainMenu }: WinLoseScreenProps) {
  const didWin = userId && session.winner_id === userId;
  const draw = !session.winner_id;
  const playerMove = userId === session.player1_id ? session.player1_move : session.player2_move;
  const opponentMove = userId === session.player1_id ? session.player2_move : session.player1_move;

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden p-6 pt-16 bg-[#121212] text-white">
      <div className="relative z-10 flex flex-grow flex-col">
        <div className="text-center mb-8">
          {draw ? (
            <>
              <h1 className="font-['Teko',sans-serif] text-8xl font-bold uppercase tracking-widest text-[#e62243] [text-shadow:0_0_10px_#e62243,0_0_20px_#ff4d6d]">
                DRAW
              </h1>
              <p className="mt-1 text-lg font-medium text-[#FFD700]">引き分け</p>
            </>
          ) : didWin ? (
            <>
              <h1 className="font-['Teko',sans-serif] text-8xl font-bold uppercase tracking-widest text-[#e62243] [text-shadow:0_0_10px_#e62243,0_0_20px_#ff4d6d]">
                YOU WIN
              </h1>
              <p className="mt-1 text-lg font-medium text-[#FFD700]">勝利</p>
            </>
          ) : (
            <>
              <h1 className="font-['Teko',sans-serif] text-8xl font-bold uppercase tracking-widest text-[#e62243] [text-shadow:0_0_10px_#e62243,0_0_20px_#ff4d6d]">
                YOU LOSE
              </h1>
              <p className="mt-1 text-lg font-medium text-[#FFD700]">敗北</p>
            </>
          )}
        </div>
        <div className="mb-10 text-center">
          <p className="text-lg uppercase tracking-wider text-white/60">Final Score</p>
          <p className="font-['Teko',sans-serif] text-5xl font-semibold text-white">5 - 3</p>
        </div>
        <div className="grid grid-cols-2 gap-5 mb-10">
          <div className={`flex flex-col items-center gap-3 ${didWin && !draw ? "" : "opacity-60"}`}>
            <div className="relative w-full aspect-square">
              <div
                className={`absolute inset-0 z-10 rounded-lg border-2 ${
                  didWin && !draw
                    ? "border-[#FFD700] shadow-[0_0_15px_3px_#FFD700,inset_0_0_10px_2px_rgba(255,215,0,0.5)]"
                    : "border-gray-600 shadow-[0_0_8px_1px_#4a4a4a]"
                }`}
              />
              {playerMove && (
                <div
                  className="w-full h-full bg-center bg-no-repeat bg-cover rounded-lg"
                  style={{ backgroundImage: `url('${moveImages[playerMove] || moveImages.rock}')` }}
                />
              )}
              {didWin && !draw && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FFD700] px-3 py-0.5">
                  <p className="text-xs font-bold uppercase text-black">WIN</p>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="font-bold text-white">
                {playerMove ? moveLabels[playerMove]?.en || "Your Move" : "Your Move"}
              </p>
              <p className="text-sm text-white/70">
                {playerMove ? moveLabels[playerMove]?.jp || "" : ""}
              </p>
            </div>
          </div>
          <div className={`flex flex-col items-center gap-3 ${!didWin && !draw ? "" : "opacity-60"}`}>
            <div className="relative w-full aspect-square">
              <div
                className={`absolute inset-0 z-10 rounded-lg border-2 ${
                  !didWin && !draw
                    ? "border-[#FFD700] shadow-[0_0_15px_3px_#FFD700,inset_0_0_10px_2px_rgba(255,215,0,0.5)]"
                    : "border-gray-600 shadow-[0_0_8px_1px_#4a4a4a]"
                }`}
              />
              {opponentMove && (
                <div
                  className="w-full h-full bg-center bg-no-repeat bg-cover rounded-lg"
                  style={{ backgroundImage: `url('${moveImages[opponentMove] || moveImages.rock}')` }}
                />
              )}
              {!didWin && !draw && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FFD700] px-3 py-0.5">
                  <p className="text-xs font-bold uppercase text-black">WIN</p>
                </div>
              )}
              {!didWin && !draw && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gray-600 px-3 py-0.5">
                  <p className="text-xs font-bold uppercase text-white/80">LOSE</p>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="font-bold text-white/80">
                {opponentMove ? opponentMoveLabels[opponentMove]?.en || "Opponent's Move" : "Opponent's Move"}
              </p>
              <p className="text-sm text-white/50">
                {opponentMove ? opponentMoveLabels[opponentMove]?.jp || "" : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-grow" />
        <div className="flex w-full flex-col items-center gap-4">
          <button
            onClick={onRematch}
            className="flex w-full max-w-sm cursor-pointer items-center justify-center gap-2.5 rounded-lg h-16 bg-[#e62243] px-5 text-xl font-bold uppercase tracking-widest text-white shadow-[0_4px_15px_rgba(230,34,67,0.4)] transition-transform hover:scale-105 active:scale-100"
          >
            <span className="material-symbols-outlined text-2xl">replay</span>
            <span>Rematch</span>
          </button>
          <button
            onClick={onMainMenu}
            className="flex w-full max-w-sm cursor-pointer items-center justify-center gap-2.5 rounded-lg h-16 bg-transparent px-5 text-lg font-semibold uppercase tracking-wider text-white/70 ring-1 ring-white/30 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
            <span>Main Menu</span>
          </button>
        </div>
      </div>
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontFamily: "'Noto Sans JP', sans-serif",
          fontWeight: 700,
          fontSize: "15rem",
          color: "#1e1e1e",
          zIndex: 1,
        }}
      >
        {didWin && !draw ? "勝利" : !didWin && !draw ? "敗北" : "引き分け"}
      </div>
    </div>
  );
}

