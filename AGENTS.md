<AGENTS>
# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains the MiniApp UI built with the App Router; keep matchmaking views, move selection, and wallet popups in dedicated route segments.
- `public/` stores every icon, illustration, and audio/animation asset referenced by the UI—never import design files from elsewhere.
- `contracts/` houses the Solidity project (Hardhat) including `RockPaperScissors.sol`, deployment scripts, and typechain bindings.
- `supabase/` keeps SQL migrations, the `matchmaking_queue` and `game_sessions` schema, and Edge Function sources (queue cleanup, session expiry).
- `packages/kit/` (or a shared `lib/` folder) is used for MiniKit helpers, Supabase clients, and schema validators so both frontend and Edge Functions share types.

## Build, Test, and Development Commands
- `pnpm install` bootstraps workspace dependencies; run after pulling schema or contract updates.
- `pnpm dev` starts the Next.js MiniApp and enables live Supabase channel logging in the console.
- `pnpm lint` runs ESLint + Prettier checks; the CI gate fails if any rule errors.
- `pnpm test` executes Vitest/React Testing Library suites for UI hooks + components.
- `pnpm hardhat test` validates the Solidity single-transaction flow, fees, and timeout logic.
- `pnpm supabase db push` applies SQL migrations locally; use `pnpm supabase functions serve cleanup` to run the Edge Functions emulator.

## Coding Style & Naming Conventions
- TypeScript is in `strict` mode with 2-space indentation; React components use `PascalCase` and hooks use `useCamelCase`.
- Solidity contracts follow the latest Solidity style guide, with explicit visibilities, `immutable` constants, and NatSpec on every public method.
- Favor functional React components, SWR/Server Actions for Supabase writes, and never store credentials in client bundles.
- Keep filenames descriptive (`MatchmakingPanel.tsx`, `useQueuePresence.ts`); colocate tests as `Component.test.tsx`.

## Testing Guidelines
- UI logic uses Vitest with React Testing Library; mock MiniKit wallet responses and Supabase channels.
- Contracts require both Hardhat unit tests and scripted fork tests on Base Sepolia before merging; cover fee refunds, timeouts, and draw payouts.
- Edge Functions need integration tests via `pnpm supabase functions test` to verify stale entry cleanup and RLS compliance.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat: matchmaking cleanup`, `fix: contract timeout refund`) to keep changelog automation simple.
- Reference Farcaster spec changes or related Supabase migrations in the body, and link Warpcast issue IDs when available.
- PRs must include: summary checklist, screenshots or screen recordings for UI work, contract addresses + ABI diffs for deployments, and a test plan section.

## Security & Configuration Tips
- Never log private keys, Supabase service roles, or signer custody data; rely on `.env.local` with typed `env.mjs` helpers.
- Follow MiniApp wallet requirements: always request permissions before match entry, tear down matchmaking rows on `visibilitychange`, and verify `fid` + custody signer before enqueuing.
- Keep the single-transaction contract address/version in `config/networks.ts` and bump it whenever fee logic changes so legacy clients cannot submit stale calldata.
</AGENTS>
