import type { BetAmount } from "@kit/bets";
import { BET_AMOUNTS } from "@kit/bets";

export const BET_TOKEN_MAP: Record<BetAmount, string> = {
  5: "0.0025",
  10: "0.005",
  25: "0.0125",
  50: "0.025",
  100: "0.05",
  250: "0.125",
  500: "0.25",
  1000: "0.5",
};

export const betOptions = BET_AMOUNTS.map((amount) => ({
  usd: amount,
  wei: BET_TOKEN_MAP[amount as BetAmount],
}));

