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
  /** Human-readable reasoning from the agent for this action (for audit/walkthroughs) */
  reasoning: z.string().optional(),
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
  /** Pool address for the Orca Whirlpool or AMM */
  poolAddress: z.string().min(1),
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

// ── SPL Token Intents ──────────────────────────────────────────────────────

export const CreateMintIntentSchema = BaseIntentSchema.extend({
  type: z.literal("create_mint"),
  /** Number of decimals for the new token (0–9) */
  decimals: z.number().int().min(0).max(9),
  /** Optional: authority allowed to mint tokens. Defaults to sender. */
  mintAuthority: z.string().optional(),
  /** Optional: authority allowed to freeze token accounts. Defaults to sender. */
  freezeAuthority: z.string().optional(),
});

export type CreateMintIntent = z.infer<typeof CreateMintIntentSchema>;

export const MintTokenIntentSchema = BaseIntentSchema.extend({
  type: z.literal("mint_token"),
  /** SPL mint address */
  mint: z.string().min(1),
  /** Destination wallet public key */
  to: z.string().min(1),
  /** Amount to mint in smallest units */
  amount: z.bigint().positive(),
});

export type MintTokenIntent = z.infer<typeof MintTokenIntentSchema>;

// ── Discriminated Union ────────────────────────────────────────────────────

export const IntentSchema = z.discriminatedUnion("type", [
  TransferIntentSchema,
  SwapIntentSchema,
  CreateMintIntentSchema,
  MintTokenIntentSchema,
]);

export type Intent = z.infer<typeof IntentSchema>;

// ── Intent type guard helpers ──────────────────────────────────────────────

export function isTransferIntent(intent: Intent): intent is TransferIntent {
  return intent.type === "transfer";
}

export function isSwapIntent(intent: Intent): intent is SwapIntent {
  return intent.type === "swap";
}

export function isCreateMintIntent(intent: Intent): intent is CreateMintIntent {
  return intent.type === "create_mint";
}

export function isMintTokenIntent(intent: Intent): intent is MintTokenIntent {
  return intent.type === "mint_token";
}
