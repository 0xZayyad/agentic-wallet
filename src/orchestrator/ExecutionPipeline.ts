// ---------------------------------------------------------------------------
// ExecutionPipeline — Pipeline stage definitions and hooks.
// Provides a structured representation of the pipeline for logging/auditing.
// ---------------------------------------------------------------------------

import type { PipelineStage } from "../core/types/ExecutionResult.js";

export interface PipelineStageInfo {
  stage: PipelineStage;
  name: string;
  description: string;
}

/** Ordered list of pipeline stages. */
export const PIPELINE_STAGES: readonly PipelineStageInfo[] = [
  {
    stage: "validation",
    name: "Intent Validation",
    description: "Validate intent schema with Zod",
  },
  {
    stage: "policy",
    name: "Policy Enforcement",
    description: "Evaluate all policies — deny short-circuits",
  },
  {
    stage: "build",
    name: "Transaction Build",
    description: "Convert intent to chain-native transaction",
  },
  {
    stage: "sign",
    name: "Transaction Signing",
    description: "Sign via Signer using KeyStore",
  },
  {
    stage: "send",
    name: "Transaction Send",
    description: "Submit signed transaction to the network",
  },
  {
    stage: "confirm",
    name: "Transaction Confirmation",
    description: "Await finality on chain",
  },
] as const;
