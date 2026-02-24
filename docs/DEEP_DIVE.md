# Agentic Wallet: Architectural Deep Dive

This document provides a comprehensive look at the design decisions, security models, and AI interaction patterns of the Agentic Wallet prototype. It is designed to evaluate against the highest standards of autonomous AI integrations on the Solana blockchain.

---

## 1. Separation of Concerns (Architecture)

The fundamental problem with early "AI Wallets" is that the AI agent was handed a raw private key. If the AI hallucinates, gets prompt-injected, or simply makes a mathematical error, funds are irrevocably lost.

Agentic Wallet solves this using strict separation of concerns.

- **The Agent Layer**: Makes analytical decisions based on context. It never sees a private key, nor does it know how to construct a Solana connection. It outputs a pure JSON `Intent`.
- **The Policy Engine Layer**: Acts as a firewall. It reads the agent's intent, evaluates it against programmable rules (Spend limits, velocity limits, program whitelists, circuit breakers), and returns a binary ALLOW/DENY.
- **The Execution Engine**: If the intent is allowed, the execution engine maps the intent to a protocol adapter (e.g., standard system transfer or Orca Whirlpools swap), builds the raw blockchain transaction, and routes it to the Signer.

---

## 2. Security and Proper Key Management

To operate in a sandboxed, autonomous environment securely, the `IKeyStore` boundary is strictly enforced.

- **Key Isolation**: Private keys live exclusively in the KeyStore (currently an `EncryptedFileKeyStore` for the prototype).
- **UUIDs, Not Keys**: Agents only possess a `walletId` (a UUID). When an agent wants to transact, it passes this UUID in the Intent.
- **Transient Memory**: Only the `Signer` class can request the private key from the KeyStore. The key is retrieved, the transaction is signed, and the key is immediately dropped from the local execution context. The agent never gains access to the byte array.
- **Future-proofing**: Because the interface is abstracted to `IKeyStore`, upgrading this system from local encrypted files to an AWS KMS (Key Management Service) or an HSM (Hardware Security Module) requires replacing exactly one file, with zero modifications to the core engine or the agents.

---

## 3. Scalability: Supporting Multiple Agents Independently

The `ScenarioRunner` is built to run simulation loops concurrently.
- Agents are entirely stateless locally. They accept the chain state (balances) and their own UUID, decide on an action, and complete the tick.
- The system heavily uses `Promise.all()` to ensure that `N` agents can think, construct intents, and submit them simultaneously.
- Since agents interact through the `IntentRouter` instead of locking global state, you can scale the system horizontally by placing an event queue (like Kafka or Redis) directly in front of the IntentRouter.

---

## 4. AI Interaction: The CLI Intent Runner and LLM Interoperability

One of the standout features of the Agentic Wallet is how external AI (like GPT-4, Claude, or local models) can plug into it without writing TypeScript.

### The Problem: Hallucinated Transactions
LLMs are terrible at constructing raw binary RPC structures, correctly calculating nonce/recent blockhashes, or handling ed25519 cryptography.

### The Solution: The CLI Intent Runner
We expose the `IntentRouter` directly via the terminal. An AI model merely has to produce a standard JSON payload representing its goal.

```json
{
  "type": "transfer",
  "fromWalletId": "5tzFkiKscXHK5ZXCGbXZjtY783mrtkK8Cud5xowqY25p",
  "to": "Alice11111111111111111111111111111111111111",
  "amount": "5000000",
  "reasoning": "Paying Alice for API services rendered."
}
```

The AI can then execute this safely by shelling out to the CLI toolkit provided in the project:
```bash
npm run intent-runner -- --intent '{"type":"transfer","fromWalletId":"..."}'
```

### The AI Experience
1. **Reads `SKILLS.md`**: The AI agent reads the SKILLS.md file in the root directory to understand the available JSON schemas.
2. **Observes state**: The AI checks its balance.
3. **Decides & Executes**: The AI generates the JSON above, and runs the CLI command.
4. **Safety Net**: Because the CLI immediately feeds this JSON into the `PolicyEngine` (the firewall), if the AI hallucinated transferring 100,000 SOL (violating the `SpendingLimitPolicy`), the CLI cleanly rejects it and outputs a human-readable error back to the AI's standard output.
5. **Recovery**: The AI reads the stdout error ("DENIED: Spending limit exceeded"), realizes its mistake, alters the JSON, and tries again.

This provides an incredibly safe, deterministic, and sandboxed environment for LLMs to become fully autonomous financial actors.
