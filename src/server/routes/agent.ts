// ---------------------------------------------------------------------------
// agent route — POST /api/agent/prompt
// Accepts a natural-language prompt + walletId, runs it through LLMAgent,
// executes the resulting intent, and returns the full result.
// ---------------------------------------------------------------------------

import type { FastifyInstance } from "fastify";
import type { Executor } from "../../orchestrator/Executor.js";
import type { WalletManager } from "../../wallet/WalletManager.js";
import type { SolanaClient } from "../../adapters/solana/SolanaClient.js";
import { LLMAgent } from "../../llm/LLMAgent.js";
import type { AIClientOptions, AIProvider } from "../../llm/AIClient.js";
import type { Intent } from "../../core/intents/Intent.js";
import type { ExecutionResult } from "../../core/types/ExecutionResult.js";

interface PromptBody {
  prompt: string;
  walletId: string;
  /** Override the AI provider (default: "google") */
  provider?: AIProvider;
  /** Override the model ID within the provider (default: GEMINI_MODEL env or "gemini-2.0-flash") */
  model?: string;
}

interface PromptResponse {
  intent: object | null;
  result: ExecutionResult;
  reasoning: string;
  agentId: string;
  provider: string;
  model: string;
}

export async function agentRoute(
  fastify: FastifyInstance,
  deps: {
    executor: Executor;
    walletManager: WalletManager;
    solanaClient: SolanaClient;
  }
): Promise<void> {
  fastify.post<{ Body: PromptBody }>("/api/agent/prompt", async (req, reply) => {
    const { prompt, walletId, provider = "google", model } = req.body;

    if (!prompt?.trim()) {
      return reply.status(400).send({ error: "prompt is required" });
    }
    if (!walletId?.trim()) {
      return reply.status(400).send({ error: "walletId is required" });
    }

    // Verify the wallet exists in the KeyStore
    const wallet = deps.walletManager.getWallet(walletId);
    if (!wallet) {
      return reply.status(404).send({ error: `Wallet ${walletId} not found` });
    }

    // Fetch on-chain balance and peer wallets for context
    let balance = 0n;
    try {
      balance = await deps.solanaClient.getBalance(wallet.getPublicKey());
    } catch {
      // proceed with 0 balance if RPC fails
    }

    const allWallets = deps.walletManager.getAllWallets();
    const knownWallets = allWallets
      .map((w) => w.walletId)
      .filter((id) => id !== walletId);

    // Build agent and decide
    const aiOptions: AIClientOptions = { provider, ...(model ? { model } : {}) };
    const agent = new LLMAgent(walletId, aiOptions);
    const context = {
      tick: 0,
      balance,
      knownWallets,
      meta: { userPrompt: prompt },
    };

    let intent: Intent | null;
    try {
      intent = await agent.decide(context);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(422).send({ error: `LLM failed to produce an intent: ${message}` });
    }

    if (!intent) {
      return reply.status(422).send({ error: "Agent returned no intent for this prompt" });
    }

    // Execute through existing pipeline (validate → policy → build → sign → send → confirm)
    const result = await deps.executor.execute(intent, agent.agentId);

    // Serialize BigInt fields for JSON transport
    const intentForJson = JSON.parse(
      JSON.stringify(intent, (_key, val) =>
        typeof val === "bigint" ? val.toString() : val
      )
    ) as object;

    const response: PromptResponse = {
      intent: intentForJson,
      result,
      reasoning: agent.lastReasoning,
      agentId: agent.agentId,
      provider: agent.provider,
      model: agent.modelId,
    };

    return reply.send(response);
  });
}
