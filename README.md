# Codex Janken

A Farcaster MiniApp that pairs players via Supabase Realtime and settles Rock � Paper � Scissors on Base with a single wallet transaction.

## Project layout

- `app/` � Next.js App Router UI for matchmaking, move selection, wallet prompts, and realtime updates.
- `contracts/` � Hardhat project containing `RockPaperScissors.sol` and its TypeScript test suite.
- `packages/kit/` � Shared helpers for bet tiers, Supabase types/clients, and MiniKit utilities used by the frontend and Edge Functions.
- `supabase/` � SQL migrations plus Edge Functions (`queue-cleanup`, `session-timeout`).

## Getting started

1. Install workspace dependencies:
   ```bash
   pnpm install
   ```
2. Supabase setup:
   - Create a project and apply the schema:
     ```bash
     pnpm supabase db push
     ```
   - Deploy Edge Functions:
     ```bash
     pnpm supabase functions deploy queue-cleanup
     pnpm supabase functions deploy session-timeout
     pnpm supabase functions deploy enter-queue
     ```
   - Set Edge Function secrets:
     ```bash
     pnpm supabase secrets set SUPABASE_URL=your_url
     pnpm supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     ```
3. Configure the MiniApp env vars by copying `app/.env.example` to `app/.env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; used by API routes to check queue/session state)
   - `NEXT_PUBLIC_CONTRACT_ADDRESS`
   - `NEXT_PUBLIC_CHAIN_ID`
   - `NEXT_PUBLIC_BASE_RPC_URL`
   - `NEXT_PUBLIC_MATCH_DEBUG` (optional; set to `true` to emit verbose matchmaking logs in the browser console)
4. Run the development server:
   ```bash
   cd app
   pnpm dev
   ```
5. Smart contract tests:
   ```bash
   cd contracts
   pnpm test
   ```

## Edge Functions schedule

Set cron jobs inside Supabase:
- `queue-cleanup`: every 5 minutes
- `session-timeout`: every minute

## Authentication

This app uses **Farcaster FID-based authentication** instead of Supabase Auth:
- Users are identified by their Farcaster FID (Farcaster ID number)
- The `matchmaking_queue` and `game_sessions` tables use `fid` (BIGINT) instead of UUID user IDs
- Queue entries are created via the `enter-queue` Edge Function which validates the Farcaster identity
- RLS policies check FID from JWT claims for authorization
- No anonymous Supabase Auth sessions are required

## Notes

- All UI assets live under `app/public/assets` per MiniApp requirements.
- `packages/kit` exports strict Zod validators shared across the frontend and Deno functions.
- The smart contract enforces the single-transaction settlement model with fee pooling, timeout protection, and draw refunds.
- The matchmaking system uses Supabase Realtime to notify players when they're matched.
