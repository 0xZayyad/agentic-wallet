// ---------------------------------------------------------------------------
// PolicyViolation — Thrown when a policy denies an intent.
// ---------------------------------------------------------------------------

import { DomainError } from "./DomainError.js";

export class PolicyViolation extends DomainError {
  readonly policyId: string;
  readonly reason: string;

  constructor(policyId: string, reason: string) {
    super("POLICY_VIOLATION", `Policy "${policyId}" denied: ${reason}`);
    this.name = "PolicyViolation";
    this.policyId = policyId;
    this.reason = reason;
  }
}
