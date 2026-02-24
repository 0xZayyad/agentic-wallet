# Agentic Wallet

> Autonomous wallet infrastructure for AI agents on Solana.

## Overview

Agentic Wallet is a production-grade prototype where AI agents can programmatically create wallets, sign transactions, hold SOL/SPL tokens, and interact with Solana protocols — all autonomously in a multi-agent simulation.

### Key Design Decisions

- **Strict separation of concerns** — Agents never touch keys. Wallets never make decisions. Policies sit between intent and signing.
- **Clean architecture** — Dependencies point inward. Core domain has zero external deps.
- **Security-first** — KeyStore abstraction, policy enforcement before signing, no raw model outputs trigger transactions.
- **Multi-chain ready** — Protocol adapters are registry-based. Adding a new chain requires zero changes to core, agents, or policies.

## Architecture

```
Agent.decide()
    │
    ▼
  Intent (validated Zod schema)
    │
    ▼
  PolicyEngine.evaluateAll()  ──▶  DENY → abort
    │
    ▼
  Adapter.buildTransaction()  (chain-specific)
    │
    ▼
  Signer.sign()  (KeyStore boundary)
    │
    ▼
  Adapter.sendTransaction()
    │
    ▼
  Adapter.confirmTransaction()
    │
    ▼
  ExecutionResult { txHash }
```

### Layer Dependencies

| Layer | Depends On |
|---|---|
| Core | Nothing — pure TypeScript |
| Agents | Core only |
| Wallet | Core only |
| Adapters | Core only |
| Orchestrator | Core, Wallet (interfaces), Adapters (interfaces) |
| Infra | Core (interfaces) |
| Simulation | All layers (composition root) |

## Quick Start

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10

### Setup

```bash
git clone <repo-url>
cd agentic-wallet
npm install
cp .env.example .env
```

### Run the Simulation

```bash
npm start
```

This runs the `BasicTransferScenario`: 2 agents create wallets, airdrop devnet SOL, and execute random transfers with full policy enforcement.

### Development Mode (watch)

```bash
npm run dev
```

## Project Structure

```
src/
├── core/           # Pure domain: intents, interfaces, types, errors
├── agents/         # Agent logic: BaseAgent, strategies, registry
├── wallet/         # Wallet engine: WalletManager, Signer, KeyStore, policies
├── adapters/       # Protocol adapters: Solana client, tx builder, token/swap
├── orchestrator/   # Execution pipeline: Executor, IntentRouter
├── infra/          # Infrastructure: config, logging, RPC, storage
└── simulation/     # Simulation runner: factories, scenarios
```

## Configuration

| Variable | Description | Default |
|---|---|---|
| `SOLANA_CLUSTER` | Solana cluster | `devnet` |
| `SOLANA_RPC_URL` | RPC endpoint | `https://api.devnet.solana.com` |
| `MAX_SPEND_LAMPORTS` | Spending limit per agent per window | `1000000000` |
| `MAX_TX_PER_MINUTE` | Rate limit per agent | `10` |
| `ALLOWED_PROGRAMS` | Comma-separated program IDs | System + Token |
| `LOG_LEVEL` | Logging level | `info` |
| `SIMULATION_AGENT_COUNT` | Number of agents | `2` |
| `SIMULATION_ROUNDS` | Simulation rounds | `5` |
| `AIRDROP_LAMPORTS` | SOL per wallet (lamports) | `2000000000` |

## Security Model

Security is the foundational layer of Agentic Wallet. Operations are strictly gated, preventing autonomous agents from acting maliciously or defecting while preserving their ability to make useful decisions.

- **Key Isolation** — Private keys live exclusively in `IKeyStore`. Only `Signer` retrieves them, uses them once, and discards them from memory. Agents only possess a UUID.
- **Policy Enforcement** — All intents pass through `PolicyEngine` before any transaction is built. Denial aborts the pipeline completely.
- **No Raw AI → Tx** — Agent decisions produce validated `Intent` objects (Zod schemas), never raw RPC payload construction.
- **Mainnet Protection** — `ConfigLoader` refuses to start if `SOLANA_CLUSTER=mainnet-beta` without additional environment flags.
- **Auditable Intent Reasoning** — Agents attach a `reasoning` string to every action, logged transparently before execution.

### Security Deep Dive: Extensible Policies

The `PolicyEngine` provides the true power of the wallet. Rather than hardcoding safety directly into the agent logic, you can protect the infrastructure by registering custom policies. Every `Intent` emitted by an agent is evaluated against these rules:

#### Example 1: `CircuitBreakerPolicy`
This policy monitors win/loss rates or total drained value. If the agent's performance drops below a threshold within a sliding window, the circuit breaker trips, universally denying all future intents.

```typescript
import { IPolicy, PolicyContext, PolicyDecision } from "../../interfaces/IPolicy.js";
import { Intent } from "../../intents/Intent.js";

export class CircuitBreakerPolicy implements IPolicy {
  readonly id = "circuit-breaker";
  private isTripped = false;

  constructor(private maxDrawdown: bigint) {}

  async evaluate(intent: Intent, context: PolicyContext): Promise<PolicyDecision> {
    if (this.isTripped) {
      return { policyId: this.id, allowed: false, reason: "Circuit breaker is active." };
    }
    
    // Logic to evaluate drawdown (omitted for brevity)
    // if (currentDrawdown > this.maxDrawdown) this.isTripped = true;

    return { policyId: this.id, allowed: true };
  }
}
```

#### Example 2: `MultiSigApprovalPolicy`
For high-value intents, this policy halts the execution pipeline and pings a webhook or database, requiring human validation (or DAO consensus) before the `Intent` is allowed to proceed to the transaction builder.

```typescript
export class MultiSigApprovalPolicy implements IPolicy {
  readonly id = "multisig-approval";
  
  constructor(private thresholdLamports: bigint) {}

  async evaluate(intent: Intent, context: PolicyContext): Promise<PolicyDecision> {
    if (intent.type === "transfer" && intent.amount > this.thresholdLamports) {
      const isApproved = await checkApprovalDB(intent.id);
      if (!isApproved) {
        return { 
          policyId: this.id, 
          allowed: false, 
          reason: `Requires human MultiSig approval for amounts > ${this.thresholdLamports}.` 
        };
      }
    }
    return { policyId: this.id, allowed: true };
  }
}
```

## Extending

### Adding a New Policy

1. Create `src/wallet/policies/YourPolicy.ts` implementing `IPolicy`.
2. Register it: `policyEngine.register(new YourPolicy())`.
3. Done — no other changes needed.

### Adding a New Chain

1. Create `src/adapters/<chain>/` with an `IProtocolAdapter` implementation.
2. Register: `adapterFactory.register(new YourAdapter())`.
3. Set `intent.chain = "<chain>"` in your agent's strategy.

### Adding a New Agent Strategy

1. Create `src/agents/strategies/YourStrategy.ts` extending `BaseAgent`.
2. Implement the `strategy()` method returning an `Intent`.
3. Add the strategy type to `AgentFactory`.

## Testing

```bash
npm test              # Unit tests
npm run test:watch    # Watch mode
npm run typecheck     # Type checking
```

## Roadmap

- [ ] Jupiter DEX integration for swap intents
- [ ] Multi-chain expansion (Ethereum, Sui)
- [ ] Persistent agent memory
- [ ] On-chain policy enforcement (program-level guards)
- [ ] HSM / enclave key storage
- [ ] Event-driven agent triggers

## License

MIT
