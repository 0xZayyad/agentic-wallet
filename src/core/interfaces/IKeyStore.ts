// ---------------------------------------------------------------------------
// IKeyStore — Contract for private key storage.
// Key material is only ever accessed by the Signer implementation.
// ---------------------------------------------------------------------------

export interface IKeyStore {
  /** Store a secret key under a wallet ID */
  store(walletId: string, secretKey: Uint8Array): Promise<void>;
  /** Retrieve a secret key by wallet ID */
  retrieve(walletId: string): Promise<Uint8Array>;
  /** Check if a key exists for the given wallet ID */
  has(walletId: string): Promise<boolean>;
  /** Permanently delete key material */
  delete(walletId: string): Promise<void>;
  /** Return all stored wallet IDs */
  listAll(): Promise<string[]>;
}
