// ---------------------------------------------------------------------------
// SpendingLimitPolicy — Enforces per-agent spending caps in a sliding window.
// ---------------------------------------------------------------------------

import type { IPolicy, PolicyContext } from "../../core/interfaces/IPolicy.js";
import type { Intent } from "../../core/intents/Intent.js";
import type { PolicyDecision } from "../../core/types/PolicyDecision.js";
import { isTransferIntent, isSwapIntent } from "../../core/intents/Intent.js";

interface SpendRecord {
  totalSpent: bigint;
  windowStart: number;
}

export class SpendingLimitPolicy implements IPolicy {
  readonly policyId = "spending-limit";
  readonly name = "Spending Limit Policy";

  private readonly maxLamports: bigint;
  private readonly windowMs: number;
  private readonly records = new Map<string, SpendRecord>();

  constructor(maxLamports: bigint, windowMs: number = 60_000) {
    this.maxLamports = maxLamports;
    this.windowMs = windowMs;
  }

  async evaluate(intent: Intent, context: PolicyContext): Promise<PolicyDecision> {
    const amount = this.extractAmount(intent);
    if (amount === null) {
      return { allowed: true, policyId: this.policyId };
    }

    const now = Date.now();
    const record = this.getOrCreateRecord(context.agentId, now);

    // Reset window if expired
    if (now - record.windowStart > this.windowMs) {
      record.totalSpent = 0n;
      record.windowStart = now;
    }

    const projectedSpend = record.totalSpent + amount;

    if (projectedSpend > this.maxLamports) {
      return {
        allowed: false,
        policyId: this.policyId,
        reason: `Spending limit exceeded: projected ${projectedSpend} > limit ${this.maxLamports} lamports in current window`,
        meta: {
          currentSpend: record.totalSpent.toString(),
          requestedAmount: amount.toString(),
          limit: this.maxLamports.toString(),
        },
      };
    }

    // Record the spend (optimistically — will be confirmed after tx)
    record.totalSpent = projectedSpend;

    return { allowed: true, policyId: this.policyId };
  }

  private extractAmount(intent: Intent): bigint | null {
    if (isTransferIntent(intent)) return intent.amount;
    if (isSwapIntent(intent)) return intent.amountIn;
    return null;
  }

  private getOrCreateRecord(agentId: string, now: number): SpendRecord {
    let record = this.records.get(agentId);
    if (!record) {
      record = { totalSpent: 0n, windowStart: now };
      this.records.set(agentId, record);
    }
    return record;
  }
}
