// ---------------------------------------------------------------------------
// OrcaPoolResolver — Finds the best Orca Whirlpool for a token pair.
// Queries https://api.orca.so/v2/solana/pools sorted by TVL descending
// and returns the top result (highest liquidity = lowest slippage).
// ---------------------------------------------------------------------------

export interface PoolInfo {
  address: string;
  tokenMintA: string;
  tokenMintB: string;
  /** Current price of tokenA denominated in tokenB */
  price: string;
  tvlUsdc: string;
}

/**
 * Hardcoded Devnet pools since the Orca API only returns Mainnet pools.
 * These are required for the agentic-wallet to function correctly on devnet.
 */
const DEVNET_POOLS: Record<string, PoolInfo> = {
  // SOL <-> USDC Devnet Pool
  "So11111111111111111111111111111111111111112-EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
    address: "3KBZiL2g8C7tiJ32hTv5v3KM7aK9htpqTw4cTXz1HvPt",
    tokenMintA: "So11111111111111111111111111111111111111112",
    tokenMintB: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    price: "0",
    tvlUsdc: "0",
  }
};

/**
 * Finds the highest-TVL Orca pool that contains both `mintA` and `mintB`.
 *
 * @throws if the API returns no matching pools or the request fails.
 */
export async function resolvePool(
  mintA: string,
  mintB: string
): Promise<PoolInfo> {
  // Check Devnet fast-path first (since agentic-wallet runs on devnet)
  const pair1 = `${mintA}-${mintB}`;
  const pair2 = `${mintB}-${mintA}`;
  if (DEVNET_POOLS[pair1]) return DEVNET_POOLS[pair1]!;
  if (DEVNET_POOLS[pair2]) return DEVNET_POOLS[pair2]!;

  const url =
    `https://api.orca.so/v2/solana/pools` +
    `?tokensBothOf=${encodeURIComponent(mintA)},${encodeURIComponent(mintB)}` +
    `&sortBy=tvl&sortDirection=desc`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Orca pool search failed for mints [${mintA}, ${mintB}]: HTTP ${response.status}`
    );
  }

  const json = (await response.json()) as {
    data?: Array<{
      address: string;
      tokenMintA: string;
      tokenMintB: string;
      price?: string;
      tvlUsdc?: string;
    }>;
  };

  const first = json.data?.[0];
  if (!first) {
    throw new Error(
      `No Orca pool found for token pair [${mintA}, ${mintB}]`
    );
  }

  return {
    address: first.address,
    tokenMintA: first.tokenMintA,
    tokenMintB: first.tokenMintB,
    price: first.price ?? "0",
    tvlUsdc: first.tvlUsdc ?? "0",
  };
}
