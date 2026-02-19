// ---------------------------------------------------------------------------
// PolicyDecision — Result of a single policy evaluation.
// ---------------------------------------------------------------------------

export type PolicyDecision =
  | PolicyAllow
  | PolicyDeny;

export interface PolicyAllow {
  readonly allowed: true;
  readonly policyId: string;
}

export interface PolicyDeny {
  readonly allowed: false;
  readonly policyId: string;
  /** Human-readable reason for denial */
  readonly reason: string;
  /** Optional metadata (e.g. current spend vs limit) */
  readonly meta?: Record<string, unknown>;
}

export function isPolicyAllowed(decision: PolicyDecision): decision is PolicyAllow {
  return decision.allowed;
}
