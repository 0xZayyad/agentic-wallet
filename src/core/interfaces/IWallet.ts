// ---------------------------------------------------------------------------
// IWallet — Contract for wallet metadata access.
// Wallets expose public info only. They never make decisions.
// ---------------------------------------------------------------------------

import type { WalletInfo } from "../types/WalletInfo.js";

export interface IWallet {
  /** Internal wallet identifier */
  readonly walletId: string;
  /** Return the public key (base58 for Solana) */
  getPublicKey(): string;
  /** Return full public metadata */
  getInfo(): Promise<WalletInfo>;
}
