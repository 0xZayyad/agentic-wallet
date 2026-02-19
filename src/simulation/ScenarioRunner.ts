// ---------------------------------------------------------------------------
// ScenarioRunner — Orchestrates multi-agent simulation scenarios.
// This is the composition root that wires all layers together.
// ---------------------------------------------------------------------------

import type { IAgent, AgentContext } from "../core/interfaces/IAgent.js";
import type { IExecutor } from "../core/interfaces/IExecutor.js";
import type { ILogger } from "../core/interfaces/ILogger.js";
import type { ExecutionResult } from "../core/types/ExecutionResult.js";
import { WalletManager } from "../wallet/WalletManager.js";
import { SolanaClient } from "../adapters/solana/SolanaClient.js";

export interface ScenarioResult {
  totalRounds: number;
  totalIntents: number;
  successfulTxs: number;
  failedTxs: number;
  skippedTicks: number;
  results: ExecutionResult[];
  durationMs: number;
}

export class ScenarioRunner {
  private readonly agents: IAgent[];
  private readonly executor: IExecutor;
  private readonly walletManager: WalletManager;
  private readonly solanaClient: SolanaClient;
  private readonly logger: ILogger;

  constructor(deps: {
    agents: IAgent[];
    executor: IExecutor;
    walletManager: WalletManager;
    solanaClient: SolanaClient;
    logger: ILogger;
  }) {
    this.agents = deps.agents;
    this.executor = deps.executor;
    this.walletManager = deps.walletManager;
    this.solanaClient = deps.solanaClient;
    this.logger = deps.logger;
  }

  /**
   * Run a multi-agent simulation for the specified number of rounds.
   * Each round, every agent gets a chance to make a decision.
   */
  async run(rounds: number): Promise<ScenarioResult> {
    const startTime = Date.now();
    const allResults: ExecutionResult[] = [];
    let skippedTicks = 0;

    this.logger.info("Scenario started", {
      agentCount: this.agents.length,
      rounds,
    });

    for (let tick = 0; tick < rounds; tick++) {
      this.logger.info(`--- Round ${tick + 1}/${rounds} ---`);

      for (const agent of this.agents) {
        try {
          // Build agent context
          const context = await this.buildAgentContext(agent, tick);

          // Agent makes a decision
          const intent = await agent.decide(context);

          if (!intent) {
            skippedTicks++;
            this.logger.debug("Agent skipped tick", {
              agentId: agent.agentId,
              tick,
            });
            continue;
          }

          this.logger.info("Agent emitted intent", {
            agentId: agent.agentId,
            intentId: intent.id,
            type: intent.type,
          });

          // Execute the intent through the full pipeline
          const result = await this.executor.execute(intent, agent.agentId);
          allResults.push(result);

          if (result.status === "success") {
            this.logger.info("Transaction confirmed", {
              agentId: agent.agentId,
              txHash: result.txHash,
            });
          } else {
            this.logger.warn("Transaction failed", {
              agentId: agent.agentId,
              errorCode: result.errorCode,
              failedAt: result.failedAt,
            });
          }
        } catch (error) {
          this.logger.error("Agent tick error", {
            agentId: agent.agentId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }

        // Brief delay between agent actions within a round
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const durationMs = Date.now() - startTime;
    const successful = allResults.filter((r) => r.status === "success").length;
    const failed = allResults.filter((r) => r.status === "failure").length;

    const scenarioResult: ScenarioResult = {
      totalRounds: rounds,
      totalIntents: allResults.length,
      successfulTxs: successful,
      failedTxs: failed,
      skippedTicks,
      results: allResults,
      durationMs,
    };

    this.logger.info("Scenario completed", {
      ...scenarioResult,
      results: undefined, // Don't log all results in summary
    });

    return scenarioResult;
  }

  /**
   * Build the context an agent needs for decision-making.
   */
  private async buildAgentContext(
    agent: IAgent,
    tick: number,
  ): Promise<AgentContext> {
    const publicKey = this.walletManager.getPublicKey(agent.walletId);
    const balance = await this.solanaClient.getBalance(publicKey);
    const knownWallets = this.walletManager.getAllPublicKeys();

    return {
      tick,
      knownWallets,
      balance,
      meta: { ownPublicKey: publicKey },
    };
  }
}
