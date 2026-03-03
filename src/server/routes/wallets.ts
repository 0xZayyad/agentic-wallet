// ---------------------------------------------------------------------------
// wallets route — GET /api/wallets
// Returns all wallets loaded from the KeyStore with their SOL balances.
// ---------------------------------------------------------------------------

import type { FastifyInstance } from "fastify";
import type { WalletManager } from "../../wallet/WalletManager.js";
import type { SolanaClient } from "../../adapters/solana/SolanaClient.js";

interface WalletEntry {
  id: string;
  publicKey: string;
  balance: string; // lamports as string (BigInt serialisation)
  balanceSol: number;
  balanceError?: string;
}

export async function walletsRoute(
  fastify: FastifyInstance,
  deps: { walletManager: WalletManager; solanaClient: SolanaClient }
): Promise<void> {
  fastify.get("/api/wallets", async (_req, reply) => {
    const wallets = deps.walletManager.getAllWallets();

    const entries: WalletEntry[] = await Promise.all(
      wallets.map(async (w) => {
        const publicKey = w.getPublicKey();
        let balance = 0n;
        let balanceError: string | undefined;

        try {
          balance = await deps.solanaClient.getBalance(publicKey);
        } catch (err: unknown) {
          balanceError = err instanceof Error ? err.message : String(err);
          fastify.log.warn({ walletId: w.walletId, error: balanceError }, "Failed to fetch balance");
        }

        return {
          id: w.walletId,
          publicKey,
          balance: balance.toString(),
          balanceSol: Number(balance) / 1e9,
          ...(balanceError ? { balanceError } : {}),
        };
      })
    );

    return reply.send({ wallets: entries });
  });
}
