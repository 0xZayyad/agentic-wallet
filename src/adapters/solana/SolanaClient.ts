// ---------------------------------------------------------------------------
// SolanaClient — Wraps @solana/web3.js Connection for RPC interactions.
// Provides chain-specific operations: balance queries, airdrops, etc.
// ---------------------------------------------------------------------------

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { ILogger } from "../../core/interfaces/ILogger.js";

export class SolanaClient {
  readonly connection: Connection;
  private readonly logger: ILogger;

  constructor(rpcUrl: string, logger: ILogger) {
    this.connection = new Connection(rpcUrl, "confirmed");
    this.logger = logger;
  }

  /**
   * Get the SOL balance (in lamports) for a public key.
   */
  async getBalance(publicKey: string): Promise<bigint> {
    const balance = await this.connection.getBalance(new PublicKey(publicKey));
    return BigInt(balance);
  }

  /**
   * Request an airdrop of SOL on devnet.
   */
  async requestAirdrop(publicKey: string, lamports: number): Promise<string> {
    this.logger.info("Requesting airdrop", {
      publicKey,
      lamports,
      sol: lamports / LAMPORTS_PER_SOL,
    });

    const signature = await this.connection.requestAirdrop(
      new PublicKey(publicKey),
      lamports,
    );

    // Wait for confirmation
    const latestBlockhash = await this.connection.getLatestBlockhash();
    await this.connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    this.logger.info("Airdrop confirmed", { publicKey, signature });
    return signature;
  }

  /**
   * Get the latest blockhash for transaction construction.
   */
  async getLatestBlockhash() {
    return this.connection.getLatestBlockhash();
  }
}
