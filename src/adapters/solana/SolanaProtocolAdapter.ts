// ---------------------------------------------------------------------------
// SolanaProtocolAdapter — Implements IProtocolAdapter for Solana.
// Bridges the chain-agnostic pipeline to Solana-specific operations.
// ---------------------------------------------------------------------------

// @solana/web3.js types used indirectly via SolanaClient
import type { IProtocolAdapter } from "../../core/interfaces/IProtocolAdapter.js";
import type { ILogger } from "../../core/interfaces/ILogger.js";
import type { Intent } from "../../core/intents/Intent.js";
import type { ChainTransaction } from "../../core/types/ChainTransaction.js";
import { ExecutionError } from "../../core/errors/ExecutionError.js";
import { SolanaClient } from "./SolanaClient.js";
import { SolanaTransactionBuilder } from "./SolanaTransactionBuilder.js";

export class SolanaProtocolAdapter implements IProtocolAdapter {
  readonly chain = "solana";

  private readonly client: SolanaClient;
  private readonly txBuilder: SolanaTransactionBuilder;
  private readonly logger: ILogger;

  constructor(
    client: SolanaClient,
    txBuilder: SolanaTransactionBuilder,
    logger: ILogger,
  ) {
    this.client = client;
    this.txBuilder = txBuilder;
    this.logger = logger;
  }

  async buildTransaction(intent: Intent): Promise<ChainTransaction> {
    try {
      return await this.txBuilder.build(intent);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown build error";
      throw new ExecutionError("build", message, error instanceof Error ? error : undefined);
    }
  }

  async sendTransaction(signedTx: Uint8Array): Promise<string> {
    try {
      const signature = await this.client.connection.sendRawTransaction(
        Buffer.from(signedTx),
        { skipPreflight: false, preflightCommitment: "confirmed" },
      );

      this.logger.info("Transaction sent", { signature });
      return signature;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown send error";
      throw new ExecutionError("send", message, error instanceof Error ? error : undefined);
    }
  }

  async confirmTransaction(txHash: string): Promise<boolean> {
    try {
      const latestBlockhash = await this.client.getLatestBlockhash();
      const result = await this.client.connection.confirmTransaction(
        {
          signature: txHash,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed",
      );

      const success = !result.value.err;
      this.logger.info("Transaction confirmation", {
        txHash,
        success,
        error: result.value.err,
      });

      return success;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown confirm error";
      throw new ExecutionError("confirm", message, error instanceof Error ? error : undefined);
    }
  }
}
