// ---------------------------------------------------------------------------
// IProtocolAdapter — Contract for chain-specific protocol adapters.
// Converts chain-agnostic Intents → chain-native transactions.
// ---------------------------------------------------------------------------

import type { Intent } from "../intents/Intent.js";
import type { ChainTransaction } from "../types/ChainTransaction.js";

export interface IProtocolAdapter {
  /** Chain identifier (e.g. "solana", "ethereum") */
  readonly chain: string;

  /** Build a chain-native transaction from a domain intent */
  buildTransaction(intent: Intent): Promise<ChainTransaction>;

  /** Submit a signed transaction to the network */
  sendTransaction(signedTx: Uint8Array): Promise<string>;

  /** Wait for transaction confirmation */
  confirmTransaction(txHash: string): Promise<boolean>;
}
