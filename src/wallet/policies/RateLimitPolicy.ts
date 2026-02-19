// ---------------------------------------------------------------------------
// RateLimitPolicy — Throttles transaction frequency per agent.
// ---------------------------------------------------------------------------

import type { IPolicy, PolicyContext } from "../../core/interfaces/IPolicy.js";
import type { Intent } from "../../core/intents/Intent.js";
import type { PolicyDecision } from "../../core/types/PolicyDecision.js";

export class RateLimitPolicy implements IPolicy {
  readonly policyId = "rate-limit";
  readonly name = "Rate Limit Policy";

  private readonly maxTxPerMinute: number;
  private readonly timestamps = new Map<string, number[]>();

  constructor(maxTxPerMinute: number) {
    this.maxTxPerMinute = maxTxPerMinute;
  }

  async evaluate(_intent: Intent, context: PolicyContext): Promise<PolicyDecision> {
    const now = Date.now();
    const windowMs = 60_000;

    // Get or create timestamp list for this agent
    let agentTimestamps = this.timestamps.get(context.agentId);
    if (!agentTimestamps) {
      agentTimestamps = [];
      this.timestamps.set(context.agentId, agentTimestamps);
    }

    // Prune timestamps outside the window
    const cutoff = now - windowMs;
    const recentTimestamps = agentTimestamps.filter((ts) => ts > cutoff);
    this.timestamps.set(context.agentId, recentTimestamps);

    if (recentTimestamps.length >= this.maxTxPerMinute) {
      return {
        allowed: false,
        policyId: this.policyId,
        reason: `Rate limit exceeded: ${recentTimestamps.length}/${this.maxTxPerMinute} tx/min`,
        meta: {
          currentRate: recentTimestamps.length,
          limit: this.maxTxPerMinute,
        },
      };
    }

    // Record this transaction
    recentTimestamps.push(now);

    return { allowed: true, policyId: this.policyId };
  }
}
