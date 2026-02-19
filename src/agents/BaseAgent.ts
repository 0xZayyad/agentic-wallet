// ---------------------------------------------------------------------------
// BaseAgent — Abstract agent providing the template for strategy-based decisions.
// Agents ONLY emit Intent objects. They never access keys or sign transactions.
// ---------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import type { IAgent, AgentContext } from "../core/interfaces/IAgent.js";
import type { Intent } from "../core/intents/Intent.js";

export abstract class BaseAgent implements IAgent {
  readonly agentId: string;
  readonly walletId: string;

  constructor(walletId: string, agentId?: string) {
    this.agentId = agentId ?? randomUUID();
    this.walletId = walletId;
  }

  /**
   * Template method: calls the concrete strategy to produce an intent.
   * Subclasses override `strategy()` to implement decision logic.
   */
  async decide(context: AgentContext): Promise<Intent | null> {
    return this.strategy(context);
  }

  /**
   * Override this method in subclasses to implement agent decision logic.
   * Return a structured Intent or null to skip this tick.
   */
  protected abstract strategy(context: AgentContext): Promise<Intent | null>;
}
