# Large Language Model (LLM) Integration

Agentic Wallet provides a first-class AI integration layer, allowing natural language prompts from users to be seamlessly converted into deterministic, secure on-chain wallet intents.

## Architecture Overview

The system bridges frontend user interactions with the backend executing kernel through three tightly synchronized components:

1. **Vercel AI SDK Client** (`src/llm/AIClient.ts`)
2. **Intent Interpreter Agent** (`src/llm/LLMAgent.ts`)
3. **API Bridge & Frontend UI** (`src/server/`, `frontend/`)

### 1. Provider-Agnostic AI Client (`AIClient`)

The `AIClient` wraps the `ai` package (Vercel AI SDK) to provide a generic, extensible interface for querying language models.

* **Current Default**: Google Gemini (`gemini-2.0-flash` or `gemini-2.5-flash`) via `@ai-sdk/google`.
* **Extensiblity**: By editing the `resolveModel` factory, developers can easily plug in `@ai-sdk/openai`, `@ai-sdk/anthropic`, or custom local models (e.g., Ollama).
* **Configuration**: Models and providers are dynamically configurable via `AIClientOptions`, keeping agent logic strictly decoupled from specific API providers.

### 2. The `LLMAgent`

The `LLMAgent` extends the core `BaseAgent` class representing an autonomous logic unit. However, unlike traditional programmatic strategies (like arbitrage bots), the `LLMAgent` relies entirely on the `AIClient` to interpret user intent.

**Workflow**:

1. It receives a context object containing the target wallet's `walletId`, current SOL balance, and knowledge of other peer wallets in the ecosystem.
2. It constructs a highly contextual prompt combined with strictly enforced JSON schemas (defined in `Intent.ts`).
3. It validates the output using Zod. If the model hallucinates or provides malformed JSON, the `LLMAgent` instantly throws a validation error, halting the pipeline long before keys are ever fetched.
4. It attaches a human-readable `reasoning` string, offering transparency into *why* the model decided on the specific intent.

### 3. API Bridge & Frontend UI

Running alongside the core wallet kernel is a full-stack interface designed for real-time interaction.

#### **Fastify API Server (`src/server/`)**

The server acts as the conduit between the Next.js UI and the wallet kernel.

* **`/api/wallets`**: Exposes balances and keys of active simulation wallets.
* **`/api/agent/prompt`**: Receives a raw natural-language prompt and an active `walletId`. It instantiates a runtime `LLMAgent`, asks it to decide on an intent, aggressively validates the output, and executes it via the `Executor` if policies pass.

#### **Next.js Full-Stack UI (`frontend/`)**

A responsive, cyberpunk-themed interface optimized for mobile and desktop.

* **AgentChat**: Users converse with the `LLMAgent`. The UI visually unpacks the pipeline stage by stage: `Think` → `Validate` → `Policy` → `Build` → `Sign` → `Send` → `Confirm`.
* **Inline Action Cards**: Emulating ChatGPT/Claude interfaces, agent actions display execution statuses, parsed JSON intents, reasoning strings, and successful transaction hashes directly below the agent's chat bubble.
* **Multi-Wallet Explorer**: Users can hot-swap between different simulation wallets actively managed by the kernel.

## Security Guarantees

Integrating AI directly with private keys requires zero trust out of the box.

* **No Raw Payloads**: The LLM *never* constructs instructions, transactions, or bytecode. It *only* outputs a predefined Intent standard.
* **Total Key Segregation**: The `LLMAgent` has no access to the `KeyStore`. It merely passes its Intent to the centralized `Executor`, which enforces `PolicyEngine` checks before the `Signer` retrieves keys.
* **Bounded Scope**: Regardless of the prompt (even explicit jailbreaks), if the output Intent violates `RateLimitPolicy` or `MaxSpendPolicy`, execution drops.

## Environment Variables required for LLM functionality

If using the default Google provider:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here
# Optional configuration
GEMINI_MODEL=gemini-2.0-flash 
```

## Running the Interface

To experience the AI integration firsthand, ensure your environment variables are set up and run:

```bash
npm run dev
```

This spins up the stack simultaneously:
* **Backend**: The `src/server/index.ts` API bridge starts on port `:3001`.
* **Frontend**: The `frontend/` Next.js application starts on port `:3000`.

Visit **<http://localhost:3000>** to select a wallet and direct the agent using plain English!
