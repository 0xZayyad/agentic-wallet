# Agentic Wallet Skills

This document outlines the machine-readable and autonomous capabilities (skills) exposed by the Agentic Wallet prototype. AI agents and orchestration systems can ingest this file to understand how to interact with the wallet infrastructure.

## Core Capabilities

### 1. Intent Declaration
Agents do not directly sign transactions. Instead, they emit **Intents**.
- **Schema Validation**: All intents must conform to the Zod `IntentSchema`.
- **Reasoning**: Agents must provide a human-readable `reasoning` string explaining *why* they emitted an intent (crucial for auditability).

### 2. Supported Intent Types

#### `transfer`
Transfers native SOL or SPL tokens to a specified recipient.
- **Fields**: `to` (base58 pubkey), `amount` (bigint in smallest units), `tokenMint` (optional base58 pubkey).

#### `swap`
(Simulated/Placeholder) Swaps one token for another via a DEX.
- **Fields**: `tokenInMint`, `tokenOutMint`, `amountIn`, `minAmountOut`.

#### `create_mint`
Creates a brand new SPL token mint on Solana.
- **Fields**: `decimals` (integer 0-9), `mintAuthority` (optional), `freezeAuthority` (optional).
- **Result**: The newly created base58 mint address is returned in the execution `meta.mint` field.

#### `mint_token`
Mints an existing SPL token to a target wallet.
- **Fields**: `mint` (base58 pubkey), `to` (base58 pubkey), `amount` (bigint).

### 3. Policy Constraints
Agents must be aware that intents are subject to policies evaluated by the `PolicyEngine`.
- **Spending Limits**: Agents will fail execution if they exceed global or per-tick spending limits.
- **Approval Chains**: Sensitive actions (like large transfers) may be routed to a block state requiring user approval via multisig or circuit breakers.

### 4. Context & Metadata
Agents operate within an `AgentContext` provided every tick:
- `tick`: The current execution round.
- `balance`: Current native SOL balance.
- `knownWallets`: Addresses of other participants.
- `meta`: Arbitrary key-value store. Agents should read `meta.lastMintAddress` to discover newly created tokens from peers.

### 5. Observability Integration
Transactions processed by the Executor include an `explorerUrl` (Solscan) in the result metadata for immediate verification.
