"use client";

import { useCallback, useEffect, useMemo } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import type { Connector } from "wagmi";
import type { WalletClient } from "viem";
import { getNetworkConfig } from "@/config/networks";

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isCorrectChain: boolean;
  error: string | null;
  connectorName: string | null;
}

export interface WalletConnectorOption {
  id: string;
  name: string;
  ready: boolean;
}

type AccountWithConnector = ReturnType<typeof useAccount> & {
  connector?: {
    id?: string;
    getWalletClient?: (parameters: { chainId?: number }) => Promise<WalletClient | null>;
  };
};

type ConnectorWithClient = {
  id?: string;
  getWalletClient?: (parameters: { chainId?: number }) => Promise<WalletClient | null>;
};

export function useWallet() {
  const network = getNetworkConfig();
  const account = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors, error: connectError, isPending: connectPending } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync, error: switchError, isPending: switchPending } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const availableConnectors: WalletConnectorOption[] = useMemo(
    () =>
      connectors.map((connector) => ({
        id: connector.id,
        name: connector.name,
        ready: Boolean(connector.ready ?? true),
      })),
    [connectors],
  );

  const isConnected = account.status === "connected";
  const isCorrectChain = Boolean(chainId && chainId === network.chainId);
  const error = connectError?.message ?? switchError?.message ?? null;

  const connectWallet = useCallback(
    async (preferredId?: string) => {
      const isMiniApp = await sdk.isInMiniApp().catch(() => false);
      const requestedId = preferredId ?? (isMiniApp ? "farcaster" : undefined);

      let connector =
        connectors.find((item) => item.id === requestedId) ??
        (requestedId
          ? connectors.find((item) => item.name.toLowerCase().includes(requestedId.toLowerCase()))
          : undefined);

      if (!connector) {
        connector =
          connectors.find((item) => item.id === "metaMask") ??
          connectors.find((item) => item.id === "rabby") ??
          connectors.find((item) => item.id === "injected") ??
          connectors[0];
      }

      if (!connector) {
        throw new Error("No wallet connector is available");
      }

      return await connectAsync({ connector });
    },
    [connectAsync, connectors],
  );

  const switchChain = useCallback(async () => {
    if (!switchChainAsync) {
      throw new Error("Switching chains is not supported by the current connector");
    }
    await switchChainAsync({ chainId: network.chainId });
  }, [network.chainId, switchChainAsync]);

  useEffect(() => {
    let cancelled = false;
    if (account.status !== "connected") {
      sdk
        .isInMiniApp()
        .then((isMini) => {
          if (!isMini || cancelled) return;
          return connectWallet("farcaster");
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [account.status, connectWallet]);

  const disconnect = useCallback(async () => {
    try {
      await disconnectAsync();
    } catch {
      // no-op
    }
  }, [disconnectAsync]);

  const ensureWalletClient = useCallback(async (): Promise<WalletClient> => {
    if (walletClient) {
      return walletClient;
    }

    const typedAccount = account as AccountWithConnector;
    const currentConnector = typedAccount.connector;
    if (currentConnector?.getWalletClient) {
      const client = await currentConnector.getWalletClient({ chainId: network.chainId });
      if (client) return client;
    }

    const connection = (await connectWallet()) as { connector?: Connector };
    const connector = (connection.connector ?? currentConnector ?? connectors[0]) as ConnectorWithClient | undefined;

    if (connector?.getWalletClient) {
      const client = await connector.getWalletClient({ chainId: network.chainId });
      if (client) return client;
    }

    throw new Error("Wallet client unavailable");
  }, [account, connectWallet, connectors, network.chainId, walletClient]);

  return {
    isConnected,
    address: account.address ?? null,
    chainId: chainId ?? null,
    isCorrectChain,
    error,
    connectorName: account.connector?.name ?? null,
    connectWallet,
    disconnect,
    switchChain,
    walletClient,
    publicClient,
    isConnecting: connectPending || switchPending,
    availableConnectors,
    ensureWalletClient,
  };
}

