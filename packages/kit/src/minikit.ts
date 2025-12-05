import { sdk } from "@farcaster/miniapp-sdk";
import type { ExternalProvider } from "@ethersproject/providers";

export async function ensureMiniAppReady() {
  await sdk.actions.ready();
}

export async function ensureMiniAppContext() {
  const isMiniApp = await sdk.isInMiniApp();
  if (!isMiniApp) {
    throw new Error("This screen is only available in a Farcaster Mini App context");
  }
}

export async function getEthereumProvider() {
  const provider = await sdk.wallet.getEthereumProvider();
  if (!provider) {
    throw new Error("Wallet provider unavailable");
  }
  return provider as ExternalProvider;
}

export async function requestSelectionHaptic() {
  if (typeof sdk?.haptics?.selectionChanged === "function") {
    await sdk.haptics.selectionChanged();
  }
}

