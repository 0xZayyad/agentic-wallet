// ---------------------------------------------------------------------------
// WalletFactory — Provisions wallets and funds them via airdrop.
// ---------------------------------------------------------------------------

import type { IWallet } from "../core/interfaces/IWallet.js";
import type { ILogger } from "../core/interfaces/ILogger.js";
import { WalletManager } from "../wallet/WalletManager.js";
import { SolanaClient } from "../adapters/solana/SolanaClient.js";

export class WalletFactory {
  private readonly walletManager: WalletManager;
  private readonly solanaClient: SolanaClient;
  private readonly logger: ILogger;

  constructor(
    walletManager: WalletManager,
    solanaClient: SolanaClient,
    logger: ILogger,
  ) {
    this.walletManager = walletManager;
    this.solanaClient = solanaClient;
    this.logger = logger;
  }

  /**
   * Create a new wallet and fund it with devnet SOL via airdrop.
   */
  async createAndFund(
    airdropLamports: number,
    label?: string,
  ): Promise<IWallet> {
    const wallet = await this.walletManager.createWallet("solana", label);
    const publicKey = wallet.getPublicKey();

    this.logger.info("Funding wallet via airdrop", {
      walletId: wallet.walletId,
      publicKey,
      lamports: airdropLamports,
    });

    try {
      await this.solanaClient.requestAirdrop(publicKey, airdropLamports);
    } catch (error) {
      this.logger.warn(`Failed to fund wallet ${publicKey} via airdrop:`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return wallet;
  }

  /**
   * Create and fund multiple wallets.
   */
  async createAndFundMany(
    count: number,
    airdropLamports: number,
  ): Promise<IWallet[]> {
    const wallets: IWallet[] = [];
    for (let i = 0; i < count; i++) {
      const wallet = await this.createAndFund(
        airdropLamports,
        `agent-${i + 1}`,
      );
      wallets.push(wallet);
      // Brief delay between airdrops to avoid rate limiting
      if (i < count - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    return wallets;
  }
}
