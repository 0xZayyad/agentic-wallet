// ---------------------------------------------------------------------------
// LLMAgent — An agent that uses the AI SDK to interpret a natural language
// prompt and produce a structured Intent. Extends BaseAgent; never touches keys.
// ---------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { BaseAgent } from "../agents/BaseAgent.js";
import type { AgentContext } from "../core/interfaces/IAgent.js";
import type { Intent } from "../core/intents/Intent.js";
import { IntentSchema } from "../core/intents/Intent.js";
import { AIClient, type AIClientOptions } from "./AIClient.js";
import { resolveToken, isBase58Address } from "../adapters/solana/whirlpool/OrcaTokenResolver.js";
import { resolvePool } from "../adapters/solana/whirlpool/OrcaPoolResolver.js";

// ── System prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an autonomous AI wallet agent for the Agentic Wallet kernel running on Solana devnet.
Your job is to interpret the user's request and output a single JSON intent object — nothing else.

The intent MUST be one of these types, with EXACTLY these fields:

1. TRANSFER (send SOL or SPL tokens)
{
  "type": "transfer",
  "fromWalletId": "<sender public key>",
  "to": "<recipient base58 public key>",
  "amount": "<lamports as string, 1 SOL = 1000000000>",
  "tokenMint": "<optional SPL mint address or symbol (e.g., 'USDC', 'SOL'), omit for native SOL>",
  "reasoning": "<your reasoning>"
}

2. SWAP (swap via Orca Whirlpools)
{
  "type": "swap",
  "fromWalletId": "<sender public key>",
  "tokenInMint": "<input token symbol, e.g. 'SOL', 'USDC'>",
  "tokenOutMint": "<output token symbol, e.g. 'USDC', 'BONK'>",
  "amountIn": "<amount as string in smallest unit>",
  "minAmountOut": "<estimated minimum output as string in smallest unit, or '0'>",
  "reasoning": "<your reasoning>"
}

3. CREATE_MINT (create a new SPL token)
{
  "type": "create_mint",
  "fromWalletId": "<sender public key>",
  "decimals": 9,
  "reasoning": "<your reasoning>"
}

4. MINT_TOKEN (mint existing SPL token to a wallet)
{
  "type": "mint_token",
  "fromWalletId": "<sender public key>",
  "mint": "<token mint address or symbol>",
  "to": "<recipient public key>",
  "amount": "<amount as string>",
  "reasoning": "<your reasoning>"
}

Rules:
- Output ONLY raw JSON with no markdown, no code fences, no explanation.
- Use the exact fromWalletId provided in the user context.
- For amount fields use strings (the system will convert to BigInt). 1 SOL = 1000000000 lamports.
- For SWAP intents: use token symbols (e.g. "SOL", "USDC") for tokenInMint/tokenOutMint — do NOT include poolAddress, the system finds the best pool automatically.
- For SWAP intents: to apply slippage, estimate the minAmountOut based on current market prices and the requested slippage. Set minAmountOut to "0" if slippage is not mentioned or you cannot estimate it.
- If the request is ambiguous or unsafe, still output a best-guess JSON intent.
- The reasoning field should be a concise human-readable explanation of your decision.`;

// ── LLMAgent ──────────────────────────────────────────────────────────────

export class LLMAgent extends BaseAgent {
  private readonly ai: AIClient;
  /** The active AI provider. */
  public readonly provider: string;
  /** The active model ID. */
  public readonly modelId: string;
  /** Raw reasoning string from the last model response (for the API to relay). */
  public lastReasoning: string = "";

  constructor(walletId: string, aiOptions?: AIClientOptions, agentId?: string) {
    super(walletId, agentId ?? `llm-agent-${randomUUID()}`);
    this.ai = new AIClient(aiOptions);
    this.provider = this.ai.provider;
    this.modelId = this.ai.modelId;
  }

  protected async strategy(context: AgentContext): Promise<Intent | null> {
    const userPrompt = (context.meta?.userPrompt as string | undefined) ?? "";
    if (!userPrompt.trim()) return null;

    const contextualPrompt = `Wallet context:
- Your wallet (fromWalletId): ${this.walletId}
- Current SOL balance: ${Number(context.balance) / 1e9} SOL (${context.balance} lamports)
- Known peer wallets: ${context.knownWallets.join(", ") || "none"}

User request: ${userPrompt}

Respond with ONLY a JSON intent object:`;

    let raw: string;
    try {
      raw = await this.ai.prompt(contextualPrompt, SYSTEM_PROMPT);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`AI model call failed: ${msg}`);
    }

    // Extract JSON — handle model wrapping in markdown fences
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Model did not return valid JSON. Raw output: ${raw}`);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      throw new Error(`Failed to parse model JSON: ${jsonMatch[0]}`);
    }

    // Capture reasoning before injecting auto-fields
    this.lastReasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "";

    // ── Swap resolution ────────────────────────────────────────────────────
    // If this looks like a swap intent, resolve any symbolic token names and
    // auto-discover the best pool — no mint addresses required from the user.
    if (parsed.type === "swap") {
      parsed = await this.enrichSwapIntent(parsed);
    }

    // Convert string amount fields to BigInt
    for (const field of ["amount", "amountIn", "minAmountOut"]) {
      if (typeof parsed[field] === "string" || typeof parsed[field] === "number") {
        try {
          parsed[field] = BigInt(parsed[field] as string | number);
        } catch {
          // Let Zod surface the error
        }
      }
    }

    // Inject required base fields
    parsed.id = randomUUID();
    parsed.chain = "solana";
    parsed.createdAt = new Date().toISOString();

    const validation = IntentSchema.safeParse(parsed);
    if (!validation.success) {
      throw new Error(
        `Model produced an invalid intent: ${JSON.stringify(validation.error.format())}\nRaw: ${jsonMatch[0]}`
      );
    }

    return validation.data;
  }

  /**
   * Enriches a raw swap intent parsed from the LLM by:
   *  1. Resolving symbolic token names (e.g. "SOL", "USDC") to mint addresses.
   *  2. Auto-discovering the best Orca pool when poolAddress is missing.
   */
  private async enrichSwapIntent(
    parsed: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const tokenInRaw = typeof parsed.tokenInMint === "string" ? parsed.tokenInMint : "";
    const tokenOutRaw = typeof parsed.tokenOutMint === "string" ? parsed.tokenOutMint : "";

    // Resolve input token if it looks like a name/symbol rather than an address
    if (tokenInRaw && !isBase58Address(tokenInRaw)) {
      const resolved = await resolveToken(tokenInRaw);
      parsed.tokenInMint = resolved.address;
    }

    // Resolve output token if it looks like a name/symbol rather than an address
    if (tokenOutRaw && !isBase58Address(tokenOutRaw)) {
      const resolved = await resolveToken(tokenOutRaw);
      parsed.tokenOutMint = resolved.address;
    }

    // Auto-discover pool if not already provided
    const poolAddress = typeof parsed.poolAddress === "string" ? parsed.poolAddress.trim() : "";
    if (!poolAddress || !isBase58Address(poolAddress)) {
      if (parsed.tokenInMint && parsed.tokenOutMint) {
        const pool = await resolvePool(
          parsed.tokenInMint as string,
          parsed.tokenOutMint as string
        );
        parsed.poolAddress = pool.address;
      }
    }

    return parsed;
  }
}
