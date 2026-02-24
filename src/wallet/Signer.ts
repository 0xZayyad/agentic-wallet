// ---------------------------------------------------------------------------
// Signer — Signs transaction payloads using keys from IKeyStore.
// This is the ONLY component that retrieves private keys.
// Keys are retrieved, used for signing, and immediately discarded.
// ---------------------------------------------------------------------------

import type { ISigner } from "../core/interfaces/ISigner.js";
import type { IKeyStore } from "../core/interfaces/IKeyStore.js";
import type { ILogger } from "../core/interfaces/ILogger.js";
import { SigningError } from "../core/errors/SigningError.js";
import { Keypair, Transaction } from "@solana/web3.js";

export class Signer implements ISigner {
  private readonly keyStore: IKeyStore;
  private readonly logger: ILogger;

  constructor(keyStore: IKeyStore, logger: ILogger) {
    this.keyStore = keyStore;
    this.logger = logger;
  }

  /**
   * Sign a serialized unsigned transaction using the wallet's private key.
   * The private key is retrieved from the KeyStore, used once, and discarded.
   */
  async sign(walletId: string, payload: Uint8Array): Promise<Uint8Array> {
    try {
      // Retrieve secret key — scoped to this function, no persistence
      const secretKey = await this.keyStore.retrieve(walletId);
      const keypair = Keypair.fromSecretKey(secretKey);

      // Deserialize the unsigned transaction
      const transaction = Transaction.from(Buffer.from(payload));

      // Sign the transaction
      transaction.partialSign(keypair);

      this.logger.debug("Transaction signed", {
        walletId,
        publicKey: keypair.publicKey.toBase58(),
      });

      // Return the signed transaction bytes
      return transaction.serialize();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown signing error";
      throw new SigningError(walletId, message, error instanceof Error ? error : undefined);
    }
  }
  /**
   * Retrieve the raw secret key for the wallet.
   * This is required for Orca Swap integration.
   */
  async getSecretKey(walletId: string): Promise<Uint8Array> {
    try {
      return await this.keyStore.retrieve(walletId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown keystone retrieval error";
      throw new SigningError(walletId, message, error instanceof Error ? error : undefined);
    }
  }
}
