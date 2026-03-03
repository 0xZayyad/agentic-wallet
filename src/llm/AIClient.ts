// ---------------------------------------------------------------------------
// AIClient — Provider-agnostic LLM wrapper built on the Vercel AI SDK.
// Currently backed by Google Gemini via @ai-sdk/google.
// Extend resolveModel() to add more providers.
// ---------------------------------------------------------------------------

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export type AIProvider = "google";

export interface AIClientOptions {
  /** Provider backend. Defaults to "google". */
  provider?: AIProvider;
  /**
   * Model ID within the provider.
   * Google examples: "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"
   * Defaults to GEMINI_MODEL env var, then "gemini-2.5-flash".
   */
  model?: string;
}

function resolveModel(opts: AIClientOptions): LanguageModel {
  const provider = opts.provider ?? "google";

  if (provider === "google") {
    const modelId =
      opts.model ??
      process.env.GEMINI_MODEL ??
      "gemini-2.5-flash";
    return google(modelId);
  }

  // Future providers: add a branch here (e.g. anthropic, openai)
  throw new Error(`Unsupported AI provider: "${provider}"`);
}

export class AIClient {
  private readonly model: LanguageModel;
  readonly modelId: string;
  readonly provider: AIProvider;

  constructor(opts: AIClientOptions = {}) {
    this.provider = opts.provider ?? "google";
    this.modelId =
      opts.model ??
      process.env.GEMINI_MODEL ??
      "gemini-2.5-flash";
    this.model = resolveModel(opts);
  }

  /**
   * Generate text from a system + user prompt pair.
   * Returns only the assistant message text.
   */
  async prompt(userMessage: string, systemMessage?: string): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      system: systemMessage,
      prompt: userMessage,
    });
    return text;
  }
}
