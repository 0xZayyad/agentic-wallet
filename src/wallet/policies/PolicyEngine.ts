// ---------------------------------------------------------------------------
// PolicyEngine — Evaluates all registered policies against an intent.
// Short-circuits on the first denial.
// ---------------------------------------------------------------------------

import type { IPolicyEngine } from "../../core/interfaces/IPolicyEngine.js";
import type { IPolicy, PolicyContext } from "../../core/interfaces/IPolicy.js";
import type { ILogger } from "../../core/interfaces/ILogger.js";
import type { Intent } from "../../core/intents/Intent.js";
import type { PolicyDecision } from "../../core/types/PolicyDecision.js";

export class PolicyEngine implements IPolicyEngine {
  private readonly policies: IPolicy[] = [];
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  register(policy: IPolicy): void {
    this.policies.push(policy);
    this.logger.info("Policy registered", {
      policyId: policy.policyId,
      name: policy.name,
    });
  }

  async evaluateAll(
    intent: Intent,
    context: PolicyContext,
  ): Promise<PolicyDecision> {
    for (const policy of this.policies) {
      const decision = await policy.evaluate(intent, context);

      this.logger.debug("Policy evaluated", {
        policyId: policy.policyId,
        allowed: decision.allowed,
        intentId: intent.id,
        ...(!decision.allowed ? { reason: decision.reason } : {}),
      });

      if (!decision.allowed) {
        return decision; // Short-circuit on first denial
      }
    }

    // All policies passed
    return {
      allowed: true,
      policyId: "policy-engine",
    };
  }
}
