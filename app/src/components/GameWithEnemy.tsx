"use client";

import type { MoveChoice } from "@kit/schema";

interface GameWithEnemyProps {
  opponentName?: string;
  opponentAvatar?: string;
  playerScore?: number;
  opponentScore?: number;
  selectedMove: MoveChoice | null;
  onSelectMove: (move: MoveChoice) => void;
  disabled?: boolean;
  loading?: boolean;
}

const moves: { key: MoveChoice; label: string; japanese: string; image: string }[] = [
  {
    key: "rock",
    label: "Rock",
    japanese: "グー",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD0oAIEF_rLU-uQXXr3rjbt8tL52ryho3qpNXjZlzMhGfbteXTSqR7jHVdAB3ttD2sONfvzTb--d2TnZRI0e5R2KOD_mVuzCiFLnOmNrK3poKWPPtH6ffyeFw5RmGqviq2r9cWsYWyfIWRpcN4J0yLQKe8I63idavIMdi8_j23OqWRL46-cUaC-EgOVwi0my5racGOW33IQzNJVki0PVe91XNqlqqyvZc6hOIwDQj2jBMR5hewWPAKmzqOUtHxpPvbIip6ir5uQjjs",
  },
  {
    key: "paper",
    label: "Paper",
    japanese: "パー",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDAzMZuM26tGQ3cYwAuoVkiwFaJcgPVreFXyp8icfOVqf2TOvVyCFjSbnVCZKNX14OZK0a4v8Y3vNKSym6nJ7gybN8pXf_OcuLt97Zvnx8IdGD7I5FbSr2qUC3JPvYT3iPFLaaZkwAIL14ZojNVn7e3qKWeJVxGQY3EeuAhtNjeDXOf5Lb7feLbLF3QEcxAxXOYsedMnoQJhdLwObKyQZeHrf3RES-7vxglaDD3gpis21wONEi0Gx4Ik5rNN2NwvCRU6SHsQKS0Pgs",
  },
  {
    key: "scissors",
    label: "Scissors",
    japanese: "チョキ",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBZkiIs7i7YsvijmEUZZJgtKIFojkXOVyAN415K2i31AQENm-KTI09TT5RHvUG87hHvO3lWwjDzH94PMgkWcynu4UBUMAR5AfpaE9jUJLLK8vZHoBRf25yK-UUr6pDOY9xKZo7NuIB14MhCX83uED1E9KQu-i4zq3G7f1si3uCJVvFoOZFyYChiYVQTJhR58w0XIWuyo7XhDXh2D9hMSWEwNcWTGS-jQcofARBRH4V95nymzokoOFDNW7p9TJKJWc5TYMjTs-fZTuM",
  },
];

export function GameWithEnemy({
  opponentName = "鬼武者",
  opponentAvatar,
  playerScore = 0,
  opponentScore = 0,
  selectedMove,
  onSelectMove,
  disabled = false,
  loading = false,
}: GameWithEnemyProps) {
  return (
    <div
      className="relative flex h-auto min-h-screen w-full flex-col overflow-hidden p-4 sm:p-6 bg-[#101018] text-white"
      style={{
        backgroundImage:
          "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA_jQZlhBVYxuy7207qZziaWSSWUrp3UXt7RIGEyg8ZT95tFJ5k_Wm94Upm1IXtJUlIGaSbeGiCXPZmisM54gRgix1XC2337gpQml_r807c77rg4k09jLT2lE6XtYUAiWsidT1Z97l1dBn4qVigoWupHApD_mQxwpEuxrw_2bZ2N1w8Iv2uvzw82j6k-HHsaRyB_kVTHgIyzWfAfhxjl_dqSBrKLlO_uGFENFWIEV8b_Xvy8py-PEs9pUtDlF_06ac3NO7MPEArn_c')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 border-2 border-[#D94F4F]"
            style={{
              backgroundImage: opponentAvatar || "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDQYPym-lY222Z2xHKSJjxaqriggzWltIm06VTxjASXDXCZFJz3Grc5wWX9ilctsvyMFZhoQZkeEBng7P99YC4M_m4IPgXok_wteAuIvWe6xjYyZQbk-TDdv3fYgGPKBt3m8BcS3v4iapTO3aqKu4GaioaSkEIlZzMHG-VxmexTKox2D62i8PoNH7wOGbbNn90Hce1NP8ZGP8hisL78fU7jQjrOuZYKKjp168l4PTYJIHGtpES0N9qlsmhllbzZp8oj6eFweH-lTWE')",
            }}
          />
          <div>
            <h2 className="text-sm font-medium opacity-80">対戦相手</h2>
            <p className="text-lg font-bold">{opponentName}</p>
          </div>
        </div>
        <button className="flex size-10 items-center justify-center rounded-full bg-black/10 dark:bg-white/10">
          <span className="material-symbols-outlined text-2xl">pause</span>
        </button>
      </div>
      <div className="flex-grow flex flex-col justify-around items-center py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="flex justify-center items-center w-36 h-36 rounded-2xl bg-[#2E2E2E] border-2 border-dashed border-[#D94F4F]/50">
            <span className="material-symbols-outlined text-6xl text-[#D94F4F] opacity-60">question_mark</span>
          </div>
          <p className="text-sm font-medium opacity-60">相手の選択</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold tracking-widest text-[#D94F4F]">スコア</p>
          <h1 className="text-6xl font-black leading-none text-white">
            {opponentScore} – {playerScore}
          </h1>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex justify-center items-center w-36 h-36 rounded-2xl bg-[#2E2E2E] border-2 border-dashed border-gray-500/50">
            {selectedMove ? (
              <img
                src={moves.find((m) => m.key === selectedMove)?.image || moves[0].image}
                alt={selectedMove}
                className="w-16 h-16"
              />
            ) : (
              <span className="material-symbols-outlined text-6xl text-gray-500 opacity-60">front_hand</span>
            )}
          </div>
          <p className="text-sm font-medium opacity-60">あなたの選択</p>
        </div>
      </div>
      <div className="flex flex-col gap-4 pt-4 pb-2">
        <p className="text-center text-sm font-bold tracking-widest text-[#D94F4F]">じゃんけんぽん！</p>
        <div className="grid grid-cols-3 gap-3">
          {moves.map((move) => {
            const isSelected = selectedMove === move.key;
            return (
              <button
                key={move.key}
                onClick={() => !disabled && onSelectMove(move.key)}
                disabled={disabled || loading}
                className={`choice-button flex flex-col items-center justify-center aspect-square rounded-2xl bg-[#2E2E2E] shadow-md transition-all ${
                  isSelected
                    ? "translate-y-[-8px] scale-110 shadow-lg border-4 border-[#D94F4F]"
                    : "hover:scale-105"
                } ${disabled || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <img src={move.image} alt={move.label} className="w-16 h-16" />
                <span className="mt-1 font-bold text-sm">{move.japanese}</span>
              </button>
            );
          })}
        </div>
        {loading && (
          <p className="text-center text-sm text-[#D94F4F] mt-2">Sending transaction...</p>
        )}
      </div>
    </div>
  );
}

