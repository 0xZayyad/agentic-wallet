// ---------------------------------------------------------------------------
// ExecutionResult — Result envelope for the execution pipeline.
// ---------------------------------------------------------------------------

export type ExecutionResult =
  | ExecutionSuccess
  | ExecutionFailure;

export interface ExecutionSuccess {
  readonly status: "success";
  /** Transaction hash on the target chain */
  readonly txHash: string;
  /** Chain identifier (e.g. "solana") */
  readonly chain: string;
  /** ISO-8601 timestamp of confirmation */
  readonly confirmedAt: string;
  /** Optional metadata */
  readonly meta?: Record<string, unknown>;
}

export interface ExecutionFailure {
  readonly status: "failure";
  /** Machine-readable error code */
  readonly errorCode: string;
  /** Human-readable error message */
  readonly errorMessage: string;
  /** Which pipeline stage failed */
  readonly failedAt: PipelineStage;
  /** Original error for debugging */
  readonly cause?: Error;
}

export type PipelineStage =
  | "validation"
  | "policy"
  | "build"
  | "sign"
  | "send"
  | "confirm";
