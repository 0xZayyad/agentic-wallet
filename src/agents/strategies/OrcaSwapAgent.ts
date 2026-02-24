// ---------------------------------------------------------------------------
// OrcaSwapAgent — Emits swap intents for an Orca Whirlpool.
// ---------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { BaseAgent } from "../BaseAgent.js";
import type { AgentContext } from "../../core/interfaces/IAgent.js";
import type { Intent, SwapIntent } from "../../core/intents/Intent.js";

export interface OrcaSwapConfig {
  poolAddress: string;
  tokenInMint: string;
  tokenOutMint: string;
  amountIn: bigint;
  chain?: string;
  chance?: number; // Probability of swapping each tick (0-1)
}

export class OrcaSwapAgent extends BaseAgent {
  private readonly config: OrcaSwapConfig;

  constructor(walletId: string, config: OrcaSwapConfig, agentId?: string) {
    super(walletId, agentId);
    this.config = { chain: "solana", chance: 0.5, ...config };
  }

  protected async strategy(context: AgentContext): Promise<Intent | null> {
    // Random chance to skip tick
    if (Math.random() > this.config.chance!) {
      return null;
    }

    const intent: SwapIntent = {
      id: randomUUID(),
      type: "swap",
      chain: this.config.chain!,
      fromWalletId: this.walletId,
      poolAddress: this.config.poolAddress,
      tokenInMint: this.config.tokenInMint,
      tokenOutMint: this.config.tokenOutMint,
      amountIn: this.config.amountIn,
      minAmountOut: 0n,
      createdAt: new Date().toISOString(),
      reasoning: "Executing Orca swap strategy",
    };

    return intent;
  }
}
