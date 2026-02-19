// ---------------------------------------------------------------------------
// IAgent — Contract for an autonomous agent.
// Agents make decisions and emit Intent objects. They NEVER access keys.
// ---------------------------------------------------------------------------

import type { Intent } from "../intents/Intent.js";

/** Context provided to an agent for decision-making. */
export interface AgentContext {
  /** Current tick / round number in the simulation */
  readonly tick: number;
  /** Public keys of all wallets visible to this agent */
  readonly knownWallets: readonly string[];
  /** Current balance in the agent's wallet (smallest unit) */
  readonly balance: bigint;
  /** Optional metadata from the simulation runner */
  readonly meta?: Record<string, unknown>;
}

/** Contract for an autonomous agent. */
export interface IAgent {
  /** Unique agent identifier */
  readonly agentId: string;
  /** ID of the wallet this agent controls */
  readonly walletId: string;
  /**
   * Make a decision and return a structured Intent, or null to skip this tick.
   * Must NEVER access private keys or sign transactions directly.
   */
  decide(context: AgentContext): Promise<Intent | null>;
}
