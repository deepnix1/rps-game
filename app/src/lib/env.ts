export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "",
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "0"),
  rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://sepolia.base.org",
};

export function assertClientEnv() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing");
  }
  if (!env.contractAddress) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is missing");
  }
  if (!env.chainId) {
    throw new Error("NEXT_PUBLIC_CHAIN_ID is missing");
  }
}

