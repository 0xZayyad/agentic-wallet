// ---------------------------------------------------------------------------
// IPolicyEngine — Contract for policy aggregation.
// Evaluates all registered policies. First denial short-circuits.
// ---------------------------------------------------------------------------

import type { Intent } from "../intents/Intent.js";
import type { PolicyDecision } from "../types/PolicyDecision.js";
import type { IPolicy, PolicyContext } from "./IPolicy.js";

export interface IPolicyEngine {
  /** Register a new policy */
  register(policy: IPolicy): void;
  /**
   * Evaluate all registered policies against the intent.
   * Returns the first denial, or an allow if all pass.
   */
  evaluateAll(intent: Intent, context: PolicyContext): Promise<PolicyDecision>;
}
