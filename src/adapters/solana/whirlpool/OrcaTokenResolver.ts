// ---------------------------------------------------------------------------
// OrcaTokenResolver — Resolves a token symbol/name to its Orca mint address.
// Uses https://api.orca.so/v2/solana/tokens/search and always picks data[0]
// (the highest-volume result for that query).
// ---------------------------------------------------------------------------

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

/**
 * Well-known addresses that don't require an API round-trip.
 * Keys are upper-cased symbols.
 */
const KNOWN_TOKENS: Record<string, TokenInfo> = {
  SOL: {
    address: "So11111111111111111111111111111111111111112",
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
  },
  WSOL: {
    address: "So11111111111111111111111111111111111111112",
    symbol: "WSOL",
    name: "Wrapped SOL",
    decimals: 9,
  },
  USDC: {
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
};

/**
 * Returns true when a string looks like a base58 Solana public key
 * (32–44 characters composed of base58 alphabet), i.e. it is already resolved.
 */
export function isBase58Address(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

/**
 * Resolves a human-readable token symbol or name (e.g. "USDC", "Bonk") to its
 * canonical mint address via the Orca token search API.
 *
 * @throws if the API returns no results or the request fails.
 */
export async function resolveToken(symbolOrName: string): Promise<TokenInfo> {
  const key = symbolOrName.trim().toUpperCase();

  // Fast path — no network call for well-known tokens
  if (KNOWN_TOKENS[key]) {
    return KNOWN_TOKENS[key];
  }

  const url = `https://api.orca.so/v2/solana/tokens/search?q=${encodeURIComponent(symbolOrName.trim())}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Orca token search failed for "${symbolOrName}": HTTP ${response.status}`
    );
  }

  const json = (await response.json()) as {
    data?: Array<{
      address: string;
      decimals: number;
      metadata?: { symbol?: string; name?: string };
    }>;
  };

  const first = json.data?.[0];
  if (!first) {
    throw new Error(
      `Orca token search returned no results for "${symbolOrName}"`
    );
  }

  return {
    address: first.address,
    symbol: first.metadata?.symbol ?? symbolOrName,
    name: first.metadata?.name ?? symbolOrName,
    decimals: first.decimals,
  };
}
