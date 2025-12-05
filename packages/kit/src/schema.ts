import { z } from "zod";
import { BET_AMOUNTS } from "./bets";

export const matchmakingStatusSchema = z.enum(["waiting", "matched", "cancelled"]);
export type MatchmakingStatus = z.infer<typeof matchmakingStatusSchema>;

export const gameStatusSchema = z.enum([
  "pending_moves",
  "pending_tx",
  "finished",
  "timeout",
  "cancelled",
]);
export type GameStatus = z.infer<typeof gameStatusSchema>;

export const moveChoiceSchema = z.enum(["rock", "paper", "scissors"]);
export type MoveChoice = z.infer<typeof moveChoiceSchema>;

export const matchmakingQueueRow = z.object({
  id: z.string().uuid(),
  user_id: z.number().int().positive(), // Changed from z.string().uuid() to z.number().int().positive() (fid)
  fid: z.number().int().positive(),
  bet_amount: z.number().refine((v) => BET_AMOUNTS.includes(v as (typeof BET_AMOUNTS)[number])),
  status: matchmakingStatusSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  session_id: z.string().uuid().nullable(),
});
export type MatchmakingQueueRow = z.infer<typeof matchmakingQueueRow>;

export const gameSessionRow = z.object({
  id: z.string().uuid(),
  player1_id: z.number().int().positive(), // Changed from z.string().uuid() to z.number().int().positive() (fid)
  player2_id: z.number().int().positive(), // Changed from z.string().uuid() to z.number().int().positive() (fid)
  player1_fid: z.number().int().positive(),
  player2_fid: z.number().int().positive(),
  bet_amount: z.number(),
  chain_game_id: z.string().nullable(),
  status: gameStatusSchema,
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  winner_id: z.number().int().positive().nullable(), // Changed from z.string().uuid().nullable() to z.number().int().positive().nullable() (fid)
  player1_move: moveChoiceSchema.nullable(),
  player2_move: moveChoiceSchema.nullable(),
  player1_signature: z.string().nullable(),
  player2_signature: z.string().nullable(),
  fee_snapshot: z.number().nullable(),
  resolved_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime(),
});
export type GameSessionRow = z.infer<typeof gameSessionRow>;

