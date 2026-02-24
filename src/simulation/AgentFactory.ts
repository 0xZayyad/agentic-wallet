// ---------------------------------------------------------------------------
// AgentFactory — Creates agents with strategies and assigns wallets.
// ---------------------------------------------------------------------------

import type { IAgent } from "../core/interfaces/IAgent.js";
import { RandomTransferAgent } from "../agents/strategies/RandomTransferStrategy.js";
import { TokenManagerAgent } from "../agents/strategies/TokenManagerAgent.js";

export type AgentStrategyType = "random-transfer" | "token-manager";

export interface AgentFactoryOptions {
  walletId: string;
  strategy: AgentStrategyType;
  chain?: string;
  maxAmountLamports?: bigint;
}

export class AgentFactory {
  /**
   * Create an agent with the specified strategy.
   */
  create(options: AgentFactoryOptions): IAgent {
    switch (options.strategy) {
      case "random-transfer":
        return new RandomTransferAgent(options.walletId, {
          chain: options.chain ?? "solana",
          maxAmountLamports: options.maxAmountLamports ?? 100_000_000n,
        });
      case "token-manager":
        return new TokenManagerAgent(options.walletId);
      default:
        throw new Error(`Unknown agent strategy: ${options.strategy}`);
    }
  }

  /**
   * Create multiple agents with the same strategy.
   */
  createMany(
    walletIds: string[],
    strategy: AgentStrategyType,
    options?: { chain?: string; maxAmountLamports?: bigint },
  ): IAgent[] {
    return walletIds.map((walletId) =>
      this.create({ walletId, strategy, ...options }),
    );
  }
}
