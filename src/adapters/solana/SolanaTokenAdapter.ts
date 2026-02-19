// ---------------------------------------------------------------------------
// SolanaTokenAdapter — SPL token operations (balance, mint info).
// ---------------------------------------------------------------------------

import { PublicKey } from "@solana/web3.js";
import {
  getAccount,
  getMint,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import type { ILogger } from "../../core/interfaces/ILogger.js";
import { SolanaClient } from "./SolanaClient.js";

export interface TokenBalance {
  mint: string;
  amount: bigint;
  decimals: number;
}

export class SolanaTokenAdapter {
  private readonly client: SolanaClient;
  private readonly _logger: ILogger;

  constructor(client: SolanaClient, logger: ILogger) {
    this.client = client;
    this._logger = logger;
  }

  /**
   * Get the SPL token balance for a wallet.
   */
  async getTokenBalance(
    ownerPublicKey: string,
    mintAddress: string,
  ): Promise<TokenBalance> {
    const owner = new PublicKey(ownerPublicKey);
    const mint = new PublicKey(mintAddress);

    const ata = await getAssociatedTokenAddress(mint, owner);

    try {
      const account = await getAccount(this.client.connection, ata);
      const mintInfo = await getMint(this.client.connection, mint);

      return {
        mint: mintAddress,
        amount: account.amount,
        decimals: mintInfo.decimals,
      };
    } catch {
      // Account doesn't exist — zero balance
      return {
        mint: mintAddress,
        amount: 0n,
        decimals: 0,
      };
    }
  }

  /**
   * Get all token accounts owned by a wallet.
   */
  async getAllTokenBalances(ownerPublicKey: string): Promise<TokenBalance[]> {
    const owner = new PublicKey(ownerPublicKey);
    const tokenAccounts =
      await this.client.connection.getParsedTokenAccountsByOwner(owner, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      });

    return tokenAccounts.value.map((account) => {
      const info = account.account.data.parsed.info;
      return {
        mint: info.mint as string,
        amount: BigInt(info.tokenAmount.amount as string),
        decimals: info.tokenAmount.decimals as number,
      };
    });
  }
}
