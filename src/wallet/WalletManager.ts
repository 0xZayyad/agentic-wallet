// ---------------------------------------------------------------------------
// WalletManager — Creates, lists, and resolves wallets.
// Handles keypair generation and delegates storage to IKeyStore.
// Exposes ONLY public metadata via IWallet.
// ---------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import type { IKeyStore } from "../core/interfaces/IKeyStore.js";
import type { IWallet } from "../core/interfaces/IWallet.js";
import type { ILogger } from "../core/interfaces/ILogger.js";
import type { WalletInfo } from "../core/types/WalletInfo.js";
import { Keypair } from "@solana/web3.js";

class ManagedWallet implements IWallet {
  readonly walletId: string;
  private readonly info: WalletInfo;

  constructor(info: WalletInfo) {
    this.walletId = info.walletId;
    this.info = info;
  }

  getPublicKey(): string {
    return this.info.publicKey;
  }

  async getInfo(): Promise<WalletInfo> {
    return this.info;
  }
}

export class WalletManager {
  private readonly keyStore: IKeyStore;
  private readonly logger: ILogger;
  private readonly wallets = new Map<string, ManagedWallet>();

  constructor(keyStore: IKeyStore, logger: ILogger) {
    this.keyStore = keyStore;
    this.logger = logger;
  }

  /**
   * Create a new wallet: generate keypair, store secret key, return public info.
   */
  async createWallet(
    chain: string = "solana",
    label?: string,
  ): Promise<IWallet> {
    const walletId = randomUUID();
    const keypair = Keypair.generate();

    // Store secret key in the KeyStore — this is the ONLY place it's held
    await this.keyStore.store(walletId, keypair.secretKey);

    const info: WalletInfo = {
      walletId,
      publicKey: keypair.publicKey.toBase58(),
      chain,
      createdAt: new Date().toISOString(),
      label,
    };

    const wallet = new ManagedWallet(info);
    this.wallets.set(walletId, wallet);

    this.logger.info("Wallet created", {
      walletId,
      publicKey: info.publicKey,
      chain,
    });

    return wallet;
  }

  /**
   * Resolve a wallet by ID.
   */
  getWallet(walletId: string): IWallet | undefined {
    return this.wallets.get(walletId);
  }

  /**
   * Return all managed wallets.
   */
  getAllWallets(): IWallet[] {
    return Array.from(this.wallets.values());
  }

  /**
   * Return all public keys of managed wallets.
   */
  getAllPublicKeys(): string[] {
    return Array.from(this.wallets.values()).map((w) => w.getPublicKey());
  }

  /**
   * Get the public key for a given wallet ID.
   * Throws if the wallet is not found.
   */
  getPublicKey(walletId: string): string {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet "${walletId}" not found`);
    }
    return wallet.getPublicKey();
  }

  /**
   * Load all previously stored wallets from the KeyStore into memory.
   */
  async loadExistingWallets(chain: string = "solana"): Promise<IWallet[]> {
    const loadedWallets: IWallet[] = [];
    const walletIds = await this.keyStore.listAll();

    for (const walletId of walletIds) {
      if (this.wallets.has(walletId)) {
        continue;
      }

      try {
        const secretKey = await this.keyStore.retrieve(walletId);
        const keypair = Keypair.fromSecretKey(secretKey);

        const info: WalletInfo = {
          walletId,
          publicKey: keypair.publicKey.toBase58(),
          chain,
          createdAt: new Date().toISOString(),
          label: `loaded-${walletId.slice(0, 8)}`,
        };

        const wallet = new ManagedWallet(info);
        this.wallets.set(walletId, wallet);
        loadedWallets.push(wallet);

        this.logger.info("Wallet loaded from storage", {
          walletId,
          publicKey: info.publicKey,
          chain,
        });
      } catch (error) {
        this.logger.error(`Failed to load wallet ${walletId} from storage`, { error });
      }
    }

    return loadedWallets;
  }
}
