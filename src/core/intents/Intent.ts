// ---------------------------------------------------------------------------
// Intent — Discriminated union of all agent intent types.
// This is a pure domain type with ZERO blockchain-specific imports.
// ---------------------------------------------------------------------------

import { z } from "zod";

// ── Shared fields ──────────────────────────────────────────────────────────

const BaseIntentSchema = z.object({
  /** Unique intent ID (UUID) */
  id: z.string().uuid(),
  /** Which chain this intent targets */
  chain: z.string().min(1),
  /** Wallet ID of the sender */
  fromWalletId: z.string().min(1),
  /** ISO-8601 timestamp when the agent created this intent */
  createdAt: z.string().datetime(),
});

// ── Transfer Intent ────────────────────────────────────────────────────────

export const TransferIntentSchema = BaseIntentSchema.extend({
  type: z.literal("transfer"),
  /** Recipient public key (base58 for Solana) */
  to: z.string().min(1),
  /** Amount in the smallest unit (e.g. lamports) */
  amount: z.bigint().positive(),
  /** Optional SPL token mint address. Omit for native SOL. */
  tokenMint: z.string().optional(),
});

export type TransferIntent = z.infer<typeof TransferIntentSchema>;

// ── Swap Intent ────────────────────────────────────────────────────────────

export const SwapIntentSchema = BaseIntentSchema.extend({
  type: z.literal("swap"),
  /** Mint address of the input token */
  tokenInMint: z.string().min(1),
  /** Mint address of the output token */
  tokenOutMint: z.string().min(1),
  /** Amount of input token (smallest unit) */
  amountIn: z.bigint().positive(),
  /** Minimum acceptable output (slippage protection) */
  minAmountOut: z.bigint().nonnegative(),
});

export type SwapIntent = z.infer<typeof SwapIntentSchema>;

// ── Discriminated Union ────────────────────────────────────────────────────

export const IntentSchema = z.discriminatedUnion("type", [
  TransferIntentSchema,
  SwapIntentSchema,
]);

export type Intent = z.infer<typeof IntentSchema>;

// ── Intent type guard helpers ──────────────────────────────────────────────

export function isTransferIntent(intent: Intent): intent is TransferIntent {
  return intent.type === "transfer";
}

export function isSwapIntent(intent: Intent): intent is SwapIntent {
  return intent.type === "swap";
}
