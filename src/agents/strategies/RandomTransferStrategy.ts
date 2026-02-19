// ---------------------------------------------------------------------------
// RandomTransferStrategy — Simple agent that picks a random target and amount.
// Demonstrates the intent emission pattern without any chain-specific logic.
// ---------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { BaseAgent } from "../BaseAgent.js";
import type { AgentContext } from "../../core/interfaces/IAgent.js";
import type { Intent } from "../../core/intents/Intent.js";
import type { TransferIntent } from "../../core/intents/Intent.js";

export class RandomTransferAgent extends BaseAgent {
  private readonly chain: string;
  private readonly maxAmountLamports: bigint;

  constructor(
    walletId: string,
    options?: { chain?: string; maxAmountLamports?: bigint; agentId?: string },
  ) {
    super(walletId, options?.agentId);
    this.chain = options?.chain ?? "solana";
    this.maxAmountLamports = options?.maxAmountLamports ?? 100_000_000n; // 0.1 SOL
  }

  protected async strategy(context: AgentContext): Promise<Intent | null> {
    // Filter out our own wallet from potential targets
    const targets = context.knownWallets.filter((pk) => pk !== context.meta?.["ownPublicKey"]);
    if (targets.length === 0) return null;

    // Skip if balance is too low
    if (context.balance <= 0n) return null;

    // Pick a random target
    const targetIndex = Math.floor(Math.random() * targets.length);
    const target = targets[targetIndex];
    if (!target) return null;

    // Random amount between 1 and maxAmountLamports, capped at current balance
    const maxTransfer = context.balance < this.maxAmountLamports
      ? context.balance
      : this.maxAmountLamports;
    const amount = BigInt(Math.floor(Math.random() * Number(maxTransfer))) + 1n;

    const intent: TransferIntent = {
      id: randomUUID(),
      type: "transfer",
      chain: this.chain,
      fromWalletId: this.walletId,
      to: target,
      amount,
      createdAt: new Date().toISOString(),
    };

    return intent;
  }
}
