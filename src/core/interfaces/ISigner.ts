// ---------------------------------------------------------------------------
// ISigner — Contract for transaction signing.
// The Signer bridges the KeyStore and the unsigned transaction payload.
// Private key retrieval and signing happen exclusively within this boundary.
// ---------------------------------------------------------------------------

export interface ISigner {
  /**
   * Sign a raw payload using the private key associated with the wallet.
   * @param walletId - The wallet whose key to sign with.
   * @param payload  - Serialized unsigned transaction bytes.
   * @returns Signed transaction bytes ready for submission.
   */
  sign(walletId: string, payload: Uint8Array): Promise<Uint8Array>;
}
