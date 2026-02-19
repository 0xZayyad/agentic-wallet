// ---------------------------------------------------------------------------
// IExecutor — Contract for the full execution pipeline.
// Agent → Intent → Policy → Build → Sign → Send → Confirm → Result
// ---------------------------------------------------------------------------

import type { Intent } from "../intents/Intent.js";
import type { ExecutionResult } from "../types/ExecutionResult.js";

export interface IExecutor {
  /**
   * Execute the full pipeline for an intent.
   * @param intent  - The validated intent from an agent.
   * @param agentId - The agent that created this intent (for policy context).
   * @returns An ExecutionResult (success with txHash or failure with error details).
   */
  execute(intent: Intent, agentId: string): Promise<ExecutionResult>;
}
