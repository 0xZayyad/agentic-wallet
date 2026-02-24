// ---------------------------------------------------------------------------
// TokenManagerAgent — An agent that creates and distributes its own SPL token.
// Demonstrates autonomous mint creation, self-minting, and token transfers.
// ---------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { BaseAgent } from "../BaseAgent.js";
import type { AgentContext } from "../../core/interfaces/IAgent.js";
import type { Intent, CreateMintIntent, MintTokenIntent, TransferIntent } from "../../core/intents/Intent.js";

export class TokenManagerAgent extends BaseAgent {
  private state: "INIT" | "MINT_CREATED" | "TOKENS_MINTED" | "DONE" = "INIT";
  private tokenMint?: string;

  constructor(walletId: string, agentId?: string) {
    super(walletId, agentId);
  }

  protected async strategy(context: AgentContext): Promise<Intent | null> {
    const now = new Date().toISOString();
    const meta = context.meta as Record<string, any> | undefined;

    // Recover mint address from context (if another agent or previous round created it)
    if (meta?.lastMintAddress && !this.tokenMint) {
      this.tokenMint = meta.lastMintAddress;
      // If we recovered it, jump state if we haven't already
      if (this.state === "INIT") {
        this.state = "MINT_CREATED";
      }
    }

    switch (this.state) {
      case "INIT": {
        this.state = "MINT_CREATED"; // Assume it will succeed
        const intent: CreateMintIntent = {
          id: randomUUID(),
          type: "create_mint",
          chain: "solana",
          fromWalletId: this.walletId,
          decimals: 9, // Standard SPL decimals
          createdAt: now,
          reasoning: "Creating a new autonomous SPL token to establish an agent economy.",
        };
        return intent;
      }

      case "MINT_CREATED": {
        if (!this.tokenMint) {
          // Wait if we don't know the mint address yet
          return null;
        }

        this.state = "TOKENS_MINTED";
        const intent: MintTokenIntent = {
          id: randomUUID(),
          type: "mint_token",
          chain: "solana",
          fromWalletId: this.walletId,
          mint: this.tokenMint,
          to: this.walletId, // mint to self first
          amount: 1_000_000_000_000n, // 1000 tokens
          createdAt: now,
          reasoning: `Minting initial supply of ${this.tokenMint} to the treasury wallet.`,
        };
        return intent;
      }

      case "TOKENS_MINTED": {
        const meta = context.meta as Record<string, any> | undefined;
        if (!this.tokenMint || !meta?.otherWallets || !Array.isArray(meta.otherWallets) || meta.otherWallets.length === 0) {
          return null;
        }

        const targetWallet = meta.otherWallets[0] as string;

        // We do this once, then we're done
        this.state = "DONE";

        const intent: TransferIntent = {
          id: randomUUID(),
          type: "transfer",
          chain: "solana",
          fromWalletId: this.walletId,
          to: targetWallet,
          amount: 100_000_000_000n, // 100 tokens
          tokenMint: this.tokenMint,
          createdAt: now,
          reasoning: `Distributing tokens to peer agent ${targetWallet} to bootstrap the ecosystem.`,
        };
        return intent;
      }

      case "DONE":
      default:
        // Already distributed tokens
        return null;
    }
  }
}
