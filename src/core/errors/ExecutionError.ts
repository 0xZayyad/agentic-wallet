// ---------------------------------------------------------------------------
// ExecutionError — Thrown when a pipeline stage fails.
// ---------------------------------------------------------------------------

import { DomainError } from "./DomainError.js";
import type { PipelineStage } from "../types/ExecutionResult.js";

export class ExecutionError extends DomainError {
  readonly stage: PipelineStage;

  constructor(stage: PipelineStage, message: string, cause?: Error) {
    super("EXECUTION_ERROR", `Pipeline failed at "${stage}": ${message}`, cause);
    this.name = "ExecutionError";
    this.stage = stage;
  }
}
