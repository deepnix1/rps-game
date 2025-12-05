"use client";

import type { BetAmount } from "@kit/bets";
import { 
  Coins, 
  CircleDollarSign, 
  Banknote, 
  Wallet, 
  CreditCard, 
  Gem,
  Trophy,
  Crown
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BetChooseProps {
  selectedBet: BetAmount | null;
  onSelect: (bet: BetAmount) => void;
  onConfirm: () => void;
  onBack: () => void;
  confirmDisabled?: boolean;
}

const betAmounts: BetAmount[] = [5, 10, 25, 50, 100, 250, 500, 1000];

// Different icons for different bet amounts - using premium icons for higher amounts
const betIcons: LucideIcon[] = [
  Coins, // $5 - Basic coins
  CircleDollarSign, // $10 - Dollar sign
  Banknote, // $25 - Banknote
  Wallet, // $50 - Wallet
  CreditCard, // $100 - Credit card
  Gem, // $250 - Gem for premium
  Trophy, // $500 - Trophy for high stakes
  Crown, // $1000 - Crown for maximum bet
];

export function BetChoose({ selectedBet, onSelect, onConfirm, onBack, confirmDisabled = false }: BetChooseProps) {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#101018] text-white overflow-x-hidden">
      <header className="sticky top-0 z-10 flex items-center justify-start p-4 pb-2">
        <button
          onClick={onBack}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white/80 transition-colors hover:bg-white/20 active:bg-white/30"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
        </button>
      </header>
      <main className="flex-1 flex flex-col">
        <div className="px-4 text-center pb-3 pt-6">
          <h1 className="font-['Space_Grotesk',sans-serif] text-white text-[32px] font-bold leading-tight tracking-tighter">
            ベットを選択
          </h1>
          <p className="text-white/70 text-sm">SELECT YOUR BET</p>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          {betAmounts.map((bet, index) => {
            const isSelected = selectedBet === bet;
            return (
              <button
                key={bet}
                onClick={() => onSelect(bet)}
                className={`bet-card [clip-path:polygon(0%_12px,12px_0%,100%_0%,100%_calc(100%-12px),calc(100%-12px)_100%,0%_100%)] flex cursor-pointer flex-col gap-2 rounded-lg border p-4 items-center justify-center active:scale-95 ${
                  isSelected
                    ? "bet-card-selected border-[#E6007A] bg-[#E6007A]/20 shadow-[0_0_15px_2px_#E6007A,0_0_5px_1px_#E6007A_inset]"
                    : "border-white/20 bg-white/5 hover:border-[#E6007A]/60"
                }`}
              >
                {(() => {
                  const IconComponent = betIcons[index] || Coins;
                  return (
                    <IconComponent 
                      className={`bet-card-icon h-8 w-8 text-white ${
                        isSelected ? "text-[#E6007A] drop-shadow-[0_0_8px_rgba(230,0,122,0.8)]" : ""
                      }`} 
                    />
                  );
                })()}
                <span 
                  className={`text-white font-['Space_Grotesk',sans-serif] text-2xl font-bold leading-tight transition-all duration-300 ${
                    isSelected ? "text-[#E6007A] drop-shadow-[0_0_4px_rgba(230,0,122,0.6)]" : ""
                  }`}
                >
                  ${bet}
                </span>
              </button>
            );
          })}
        </div>
      </main>
      <footer className="sticky bottom-0 bg-[#101018]/80 p-4 backdrop-blur-sm shadow-[0_-5px_30px_rgba(230,0,122,0.3)]">
        <button
          onClick={onConfirm}
          disabled={!selectedBet || confirmDisabled}
          className="[clip-path:polygon(0%_12px,12px_0%,100%_0%,100%_100%,12px_100%,0%_calc(100%-12px))] flex min-w-[84px] w-full max-w-[480px] items-center justify-center overflow-hidden rounded-lg h-14 px-5 flex-1 bg-[#E6007A] text-white text-lg font-bold leading-normal tracking-[0.015em] shadow-[0_0_20px_#E6007A] transform transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_#E6007A,0_0_15px_#E6007A_inset] hover:bg-[#E6007A]/90 active:scale-100 font-['Space_Grotesk',sans-serif] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-[0_0_20px_#E6007A]"
        >
          <span className="truncate transition-all duration-300">CONFIRM BET {selectedBet ? `($${selectedBet})` : ""}</span>
        </button>
      </footer>
    </div>
  );
}
