// ---------------------------------------------------------------------------
// AgentFactory — Creates agents with strategies and assigns wallets.
// ---------------------------------------------------------------------------

import type { IAgent } from "../core/interfaces/IAgent.js";
import { RandomTransferAgent } from "../agents/strategies/RandomTransferStrategy.js";
import { TokenManagerAgent } from "../agents/strategies/TokenManagerAgent.js";
import { OrcaSwapAgent, type OrcaSwapConfig } from "../agents/strategies/OrcaSwapAgent.js";

export type AgentStrategyType = "random-transfer" | "token-manager" | "orca-swap";

export interface AgentFactoryOptions {
  walletId: string;
  strategy: AgentStrategyType;
  chain?: string;
  maxAmountLamports?: bigint;
  orcaSwapConfig?: OrcaSwapConfig;
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
      case "orca-swap":
        if (!options.orcaSwapConfig) {
          throw new Error("orcaSwapConfig is required for orca-swap strategy");
        }
        return new OrcaSwapAgent(options.walletId, options.orcaSwapConfig);
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
