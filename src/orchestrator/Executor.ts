// ---------------------------------------------------------------------------
// Executor — Runs the full execution pipeline:
// Validate Intent → Enforce Policy → Build Tx → Sign → Send → Confirm
// ---------------------------------------------------------------------------

import type { IExecutor } from "../core/interfaces/IExecutor.js";
import type { IPolicyEngine } from "../core/interfaces/IPolicyEngine.js";
import type { ISigner } from "../core/interfaces/ISigner.js";
import type { ILogger } from "../core/interfaces/ILogger.js";
import type { PolicyContext } from "../core/interfaces/IPolicy.js";
import type { Intent } from "../core/intents/Intent.js";
import type { ExecutionResult } from "../core/types/ExecutionResult.js";
import { IntentSchema } from "../core/intents/Intent.js";
import { IntentRouter } from "./IntentRouter.js";
import { PolicyViolation } from "../core/errors/PolicyViolation.js";
import { ExecutionError } from "../core/errors/ExecutionError.js";

export class Executor implements IExecutor {
  private readonly router: IntentRouter;
  private readonly policyEngine: IPolicyEngine;
  private readonly signer: ISigner;
  private readonly logger: ILogger;
  private readonly getBalance: (walletId: string) => Promise<bigint>;

  constructor(deps: {
    router: IntentRouter;
    policyEngine: IPolicyEngine;
    signer: ISigner;
    logger: ILogger;
    getBalance: (walletId: string) => Promise<bigint>;
  }) {
    this.router = deps.router;
    this.policyEngine = deps.policyEngine;
    this.signer = deps.signer;
    this.logger = deps.logger;
    this.getBalance = deps.getBalance;
  }

  async execute(intent: Intent, agentId: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.logger.info("Pipeline started", {
      intentId: intent.id,
      agentId,
      type: intent.type,
      chain: intent.chain,
    });

    try {
      // ── Stage 1: Validation ────────────────────────────────────────
      const validation = IntentSchema.safeParse(intent);
      if (!validation.success) {
        return {
          status: "failure",
          errorCode: "VALIDATION_ERROR",
          errorMessage: `Invalid intent: ${validation.error.message}`,
          failedAt: "validation",
        };
      }

      // ── Stage 2: Policy Enforcement ────────────────────────────────
      const balance = await this.getBalance(intent.fromWalletId);
      const policyContext: PolicyContext = {
        agentId,
        walletId: intent.fromWalletId,
        balance,
        evaluatedAt: new Date().toISOString(),
      };

      const policyDecision = await this.policyEngine.evaluateAll(
        intent,
        policyContext,
      );

      if (!policyDecision.allowed) {
        this.logger.warn("Policy denied intent", {
          intentId: intent.id,
          policyId: policyDecision.policyId,
          reason: policyDecision.reason,
        });
        return {
          status: "failure",
          errorCode: "POLICY_VIOLATION",
          errorMessage: policyDecision.reason,
          failedAt: "policy",
          cause: new PolicyViolation(
            policyDecision.policyId,
            policyDecision.reason,
          ),
        };
      }

      // ── Stage 3: Build Transaction ─────────────────────────────────
      const adapter = this.router.resolve(intent);
      const chainTx = await adapter.buildTransaction(intent);

      this.logger.debug("Transaction built", {
        intentId: intent.id,
        programIds: chainTx.programIds,
      });

      // ── Stage 4: Sign Transaction ──────────────────────────────────
      const signedTx = await this.signer.sign(
        intent.fromWalletId,
        chainTx.payload,
      );

      // ── Stage 5: Send Transaction ──────────────────────────────────
      const txHash = await adapter.sendTransaction(signedTx);

      // ── Stage 6: Confirm Transaction ───────────────────────────────
      const confirmed = await adapter.confirmTransaction(txHash);

      if (!confirmed) {
        return {
          status: "failure",
          errorCode: "CONFIRMATION_FAILED",
          errorMessage: `Transaction ${txHash} failed to confirm`,
          failedAt: "confirm",
        };
      }

      const elapsed = Date.now() - startTime;
      this.logger.info("Pipeline completed", {
        intentId: intent.id,
        txHash,
        elapsedMs: elapsed,
      });

      return {
        status: "success",
        txHash,
        chain: intent.chain,
        confirmedAt: new Date().toISOString(),
        meta: { elapsedMs: elapsed },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown pipeline error";
      const stage =
        error instanceof ExecutionError
          ? error.stage
          : error instanceof PolicyViolation
            ? "policy"
            : "send";

      this.logger.error("Pipeline failed", {
        intentId: intent.id,
        stage,
        error: message,
      });

      return {
        status: "failure",
        errorCode: error instanceof ExecutionError ? error.code : "PIPELINE_ERROR",
        errorMessage: message,
        failedAt: stage,
        cause: error instanceof Error ? error : undefined,
      };
    }
  }
}
