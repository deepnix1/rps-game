"use client";

import { useMemo, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Check, ChevronDown } from "lucide-react";
import { getNetworkConfig } from "@/config/networks";

function formatAddress(address?: string | null) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletStatus() {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [pendingConnector, setPendingConnector] = useState<string | null>(null);
  const targetNetworkName = useMemo(() => getNetworkConfig().name, []);

  const handleSelect = async (connectorId: string) => {
    setPendingConnector(connectorId);
    try {
      await wallet.connectWallet(connectorId);
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setPendingConnector(null);
    }
  };

  return (
    <div className="absolute left-4 top-4 z-30 flex w-[260px] flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-[#1D3557] shadow-lg backdrop-blur-lg"
      >
        <span className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-[#457B9D]">
            {wallet.isConnected ? "Wallet Connected" : "Connect Wallet"}
          </span>
          <span className="text-base text-[#1D3557]">
            {wallet.isConnected ? wallet.connectorName ?? "Wallet" : "Select provider"}
          </span>
          {wallet.isConnected && (
            <span className="text-xs font-normal text-[#1D3557]/70">{formatAddress(wallet.address)}</span>
          )}
        </span>
        <ChevronDown className={`h-5 w-5 text-[#1D3557] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="rounded-2xl border border-white/50 bg-white/90 p-2 shadow-2xl backdrop-blur-xl">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-[#457B9D]">
            Choose a wallet
          </p>
          <div className="flex flex-col gap-1">
            {wallet.availableConnectors.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={!option.ready || wallet.isConnecting}
                onClick={() => handleSelect(option.id)}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-[#1D3557] transition hover:bg-[#F1FAEE] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex flex-col">
                  <span className="font-semibold">{option.name}</span>
                  <span className="text-xs text-[#1D3557]/60">{getConnectorDescription(option.id)}</span>
                </span>
                {pendingConnector === option.id ? (
                  <span className="text-xs font-semibold text-[#E63946]">Connecting...</span>
                ) : wallet.connectorName?.toLowerCase() === option.name.toLowerCase() ? (
                  <Check className="h-4 w-4 text-[#2A9D8F]" />
                ) : null}
              </button>
            ))}
          </div>
          {wallet.error && <p className="mt-2 px-2 text-xs text-[#E63946]">{wallet.error}</p>}
        </div>
      )}
      {!wallet.isCorrectChain && wallet.isConnected && (
        <button
          type="button"
          onClick={() => wallet.switchChain().catch(() => undefined)}
          className="rounded-2xl border border-[#E63946]/30 bg-[#E63946]/10 px-4 py-3 text-left text-xs font-semibold text-[#E63946]"
        >
          Wrong network. Tap to switch to {targetNetworkName}
        </button>
      )}
    </div>
  );
}

function getConnectorDescription(id: string) {
  switch (id) {
    case "farcaster":
      return "MiniApp wallet (auto-connect)";
    case "metaMask":
      return "MetaMask browser extension";
    case "rabby":
      return "Rabby / injected wallet";
    default:
      return "Injected EIP-6963 wallet";
  }
}
