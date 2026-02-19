// ---------------------------------------------------------------------------
// IPolicy — Contract for a single policy rule.
// Policies evaluate intents and return allow/deny decisions.
// ---------------------------------------------------------------------------

import type { Intent } from "../intents/Intent.js";
import type { PolicyDecision } from "../types/PolicyDecision.js";

/** Context provided to policies for evaluation. */
export interface PolicyContext {
  /** The agent that created this intent */
  readonly agentId: string;
  /** The wallet involved */
  readonly walletId: string;
  /** Current wallet balance (smallest unit) */
  readonly balance: bigint;
  /** Timestamp of intent evaluation */
  readonly evaluatedAt: string;
}

export interface IPolicy {
  /** Unique policy identifier */
  readonly policyId: string;
  /** Human-readable policy name */
  readonly name: string;
  /**
   * Evaluate an intent against this policy.
   * Must return a PolicyDecision (allow or deny with reason).
   */
  evaluate(intent: Intent, context: PolicyContext): Promise<PolicyDecision>;
}
