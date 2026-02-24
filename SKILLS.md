# Agentic Wallet Skills

This document outlines the machine-readable and autonomous capabilities (skills) exposed by the Agentic Wallet prototype. AI agents and orchestration systems can ingest this file to understand how to interact with the wallet infrastructure.

## Core Capabilities

### 1. Intent Declaration

Agents do not directly sign transactions. Instead, they emit **Intents**.

- **Schema Validation**: All intents must conform to the Zod `IntentSchema`.
- **Reasoning**: Agents must provide a human-readable `reasoning` string explaining *why* they emitted an intent (crucial for auditability).

### 2. Supported Intent Types (JSON Schemas)

#### `transfer`

Transfers native SOL or SPL tokens to a specified recipient.

```json
{
  "type": "transfer",
  "fromWalletId": "<your-wallet-uuid>",
  "to": "<recipient-base58-pubkey>",
  "amount": "100000000",
  "reasoning": "Explain why this transfer is being made",
  "tokenMint": "<optional-spl-token-mint-pubkey>"
}
```
*Note: `amount` must be a string representing BigInt in the smallest unit (lamports for SOL).*

#### `orca_swap`

Swaps one token for another via the Orca Whirlpools protocol.

```json
{
  "type": "orca_swap",
  "fromWalletId": "<your-wallet-uuid>",
  "poolAddress": "3KBZiL2g8C7tiJ32hTv5v3KM7aK9htpqTw4cTXz1HvPt",
  "tokenInMint": "So11111111111111111111111111111111111111112",
  "tokenOutMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amountIn": "50000",
  "chance": 1.0,
  "reasoning": "Swapping WSOL to USDC to preserve capital"
}
```

#### `create_mint`

Creates a brand new SPL token mint on Solana.

```json
{
  "type": "create_mint",
  "fromWalletId": "<your-wallet-uuid>",
  "decimals": 9,
  "reasoning": "Creating a new ecosystem token"
}
```

#### `mint_token`

Mints an existing SPL token to a target wallet.

```json
{
  "type": "mint_token",
  "fromWalletId": "<your-wallet-uuid>",
  "mint": "<mint-base58-pubkey>",
  "to": "<recipient-base58-pubkey>",
  "amount": "1000000000",
  "reasoning": "Airdropping tokens to user"
}
```

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
