import { z } from "zod";

export const BET_AMOUNTS = [5, 10, 25, 50, 100, 250, 500, 1000] as const;
export type BetAmount = (typeof BET_AMOUNTS)[number];

export const betAmountSchema = z.custom<BetAmount>((value) => {
  if (typeof value === "number") {
    return BET_AMOUNTS.includes(value as BetAmount);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return BET_AMOUNTS.includes(parsed as BetAmount);
  }
  return false;
}, {
  message: `Bet must be one of: ${BET_AMOUNTS.join(", ")}`,
});

export function toDisplayBet(value: BetAmount | number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

