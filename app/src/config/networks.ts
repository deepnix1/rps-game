import { env } from "@/lib/env";

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  contractAddress: string;
}

const base: NetworkConfig = {
  name: "Base",
  chainId: 8453,
  rpcUrl: env.rpcUrl,
  contractAddress: env.contractAddress,
};

const baseSepolia: NetworkConfig = {
  name: "Base Sepolia",
  chainId: 84532,
  rpcUrl: env.rpcUrl,
  contractAddress: env.contractAddress,
};

export function getNetworkConfig(): NetworkConfig {
  if (env.chainId === base.chainId) {
    return base;
  }
  return baseSepolia;
}

