// ---------------------------------------------------------------------------
// ChainTransaction — Chain-agnostic transaction representation.
// Adapters produce this; the Signer consumes the serialized payload.
// ---------------------------------------------------------------------------

export interface ChainTransaction {
  /** Chain identifier (e.g. "solana") */
  readonly chain: string;
  /** Serialized unsigned transaction bytes */
  readonly payload: Uint8Array;
  /** Program IDs / contract addresses this tx interacts with */
  readonly programIds: string[];
  /** Estimated fee in the chain's smallest unit */
  readonly estimatedFee?: bigint;
  /** Optional metadata for logging / auditing */
  readonly meta?: Record<string, unknown>;
}
