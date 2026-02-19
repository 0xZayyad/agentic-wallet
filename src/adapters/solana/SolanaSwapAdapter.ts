// ---------------------------------------------------------------------------
// SolanaSwapAdapter — Swap integration placeholder.
// In production, this would integrate with Jupiter or Orca.
// ---------------------------------------------------------------------------

import type { ILogger } from "../../core/interfaces/ILogger.js";
import { SolanaClient } from "./SolanaClient.js";

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpactPct: number;
  route: string;
}

export class SolanaSwapAdapter {
  private readonly _client: SolanaClient;
  private readonly logger: ILogger;

  constructor(client: SolanaClient, logger: ILogger) {
    this._client = client;
    this.logger = logger;
  }

  /**
   * Get a swap quote from a DEX aggregator.
   * TODO: Integrate with Jupiter API for devnet.
   */
  async getQuote(
    inputMint: string,
    outputMint: string,
    inputAmount: bigint,
  ): Promise<SwapQuote> {
    this.logger.warn("Swap quoting not yet implemented — returning placeholder", {
      inputMint,
      outputMint,
      inputAmount: inputAmount.toString(),
    });

    return {
      inputMint,
      outputMint,
      inputAmount,
      outputAmount: 0n,
      priceImpactPct: 0,
      route: "placeholder",
    };
  }
}
