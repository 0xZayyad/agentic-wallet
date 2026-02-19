// ---------------------------------------------------------------------------
// WalletInfo — Public metadata for a wallet. Never contains private keys.
// ---------------------------------------------------------------------------

export interface WalletInfo {
  /** Internal wallet identifier */
  readonly walletId: string;
  /** Public key (base58 for Solana) */
  readonly publicKey: string;
  /** Chain this wallet is associated with */
  readonly chain: string;
  /** ISO-8601 creation timestamp */
  readonly createdAt: string;
  /** Optional human-readable label */
  readonly label?: string;
}
