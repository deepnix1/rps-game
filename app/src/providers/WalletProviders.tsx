"use client";

import { PropsWithChildren } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { injected } from "wagmi/connectors";
import { env } from "@/lib/env";
import { defineChain } from "viem";

const BASE_CHAIN = defineChain({
  id: 8453,
  name: "Base",
  network: "base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.base.org"] },
    public: { http: ["https://mainnet.base.org"] },
  },
  blockExplorers: {
    default: { name: "Basescan", url: "https://basescan.org" },
  },
});

const BASE_SEPOLIA = defineChain({
  id: 84532,
  name: "Base Sepolia",
  network: "base-sepolia",
  nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.base.org"] },
    public: { http: ["https://sepolia.base.org"] },
  },
  blockExplorers: {
    default: { name: "Basescan", url: "https://sepolia.basescan.org" },
  },
});

const queryClient = new QueryClient();

const baseRpcUrl =
  env.chainId === BASE_CHAIN.id && env.rpcUrl ? env.rpcUrl : BASE_CHAIN.rpcUrls.default.http[0] ?? "";
const baseSepoliaRpcUrl =
  env.chainId === BASE_SEPOLIA.id && env.rpcUrl ? env.rpcUrl : BASE_SEPOLIA.rpcUrls.default.http[0] ?? "";

const wagmiConfig = createConfig({
  chains: [BASE_CHAIN, BASE_SEPOLIA],
  ssr: true,
  connectors: [
    farcasterMiniApp(),
    injected({
      target: "metaMask",
      shimDisconnect: true,
    }),
    injected({
      target: "rabby",
      shimDisconnect: true,
    }),
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [BASE_CHAIN.id]: http(baseRpcUrl),
    [BASE_SEPOLIA.id]: http(baseSepoliaRpcUrl),
  },
  multiInjectedProviderDiscovery: true,
});

export function WalletProviders({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
