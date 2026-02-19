// ---------------------------------------------------------------------------
// Core barrel export — single import point for the entire core domain.
// ---------------------------------------------------------------------------

// Intents
export {
  IntentSchema,
  TransferIntentSchema,
  SwapIntentSchema,
  isTransferIntent,
  isSwapIntent,
} from "./intents/Intent.js";
export type { Intent, TransferIntent, SwapIntent } from "./intents/Intent.js";

// Types
export type {
  ExecutionResult,
  ExecutionSuccess,
  ExecutionFailure,
  PipelineStage,
} from "./types/ExecutionResult.js";
export type { PolicyDecision, PolicyAllow, PolicyDeny } from "./types/PolicyDecision.js";
export { isPolicyAllowed } from "./types/PolicyDecision.js";
export type { WalletInfo } from "./types/WalletInfo.js";
export type { ChainTransaction } from "./types/ChainTransaction.js";

// Interfaces
export type { IAgent, AgentContext } from "./interfaces/IAgent.js";
export type { IWallet } from "./interfaces/IWallet.js";
export type { IKeyStore } from "./interfaces/IKeyStore.js";
export type { ISigner } from "./interfaces/ISigner.js";
export type { IPolicy, PolicyContext } from "./interfaces/IPolicy.js";
export type { IPolicyEngine } from "./interfaces/IPolicyEngine.js";
export type { IProtocolAdapter } from "./interfaces/IProtocolAdapter.js";
export type { IExecutor } from "./interfaces/IExecutor.js";
export type { ILogger } from "./interfaces/ILogger.js";

// Errors
export { DomainError } from "./errors/DomainError.js";
export { PolicyViolation } from "./errors/PolicyViolation.js";
export { SigningError } from "./errors/SigningError.js";
export { ExecutionError } from "./errors/ExecutionError.js";
