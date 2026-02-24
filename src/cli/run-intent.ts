// ---------------------------------------------------------------------------
// run-intent — CLI interface for raw intent execution.
// Proves AI compatibility by treating Executor as the boundary.
// ---------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { IntentSchema, type Intent } from "../core/intents/Intent.js";
import { loadConfig } from "../infra/config/ConfigLoader.js";
import { createLogger, setDefaultLogLevel } from "../infra/logging/LoggerFactory.js";
import { EncryptedFileKeyStore } from "../wallet/keystore/EncryptedFileKeyStore.js";
import { WalletManager } from "../wallet/WalletManager.js";
import { Signer } from "../wallet/Signer.js";
import { PolicyEngine } from "../wallet/policies/PolicyEngine.js";
import { SpendingLimitPolicy } from "../wallet/policies/SpendingLimitPolicy.js";
import { ProgramWhitelistPolicy } from "../wallet/policies/ProgramWhitelistPolicy.js";
import { RateLimitPolicy } from "../wallet/policies/RateLimitPolicy.js";
import { SolanaClient } from "../adapters/solana/SolanaClient.js";
import { SolanaTransactionBuilder } from "../adapters/solana/SolanaTransactionBuilder.js";
import { SolanaProtocolAdapter } from "../adapters/solana/SolanaProtocolAdapter.js";
import { AdapterFactory } from "../adapters/AdapterFactory.js";
import { IntentRouter } from "../orchestrator/IntentRouter.js";
import { Executor } from "../orchestrator/Executor.js";
import { setWhirlpoolsConfig, setRpc } from "@orca-so/whirlpools";

import { randomUUID } from "node:crypto";

function sanitizeIntentData(obj: any): any {
  if (typeof obj !== "object" || obj === null) return obj;
  for (const [key, value] of Object.entries(obj)) {
    if (["amount", "amountIn", "minAmountOut"].includes(key) && typeof value !== "undefined") {
      try {
        obj[key] = BigInt(value as any);
      } catch (e) {
        // Let Zod catch the type error if BigInt parsing fails
      }
    } else if (typeof value === "object") {
      obj[key] = sanitizeIntentData(value);
    }
  }
  return obj;
}

function injectDefaultIntentFields(obj: any): any {
  if (typeof obj !== "object" || obj === null) return obj;

  if (!obj.id) obj.id = randomUUID();
  if (!obj.chain) obj.chain = "solana";
  if (!obj.createdAt) obj.createdAt = new Date().toISOString();

  return obj;
}

async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      intent: { type: "string" },
    },
  });

  let rawJson = "";
  if (values.file) {
    rawJson = readFileSync(values.file, "utf-8");
  } else if (values.intent) {
    rawJson = values.intent;
  } else {
    console.error("Usage: npm run run-intent -- --file <path> | --intent <json>");
    process.exit(1);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err: any) {
    console.error("Failed to parse JSON:", err.message);
    process.exit(1);
  }

  const withDefaults = injectDefaultIntentFields(parsed);
  const sanitized = sanitizeIntentData(withDefaults);

  const validation = IntentSchema.safeParse(sanitized);
  if (!validation.success) {
    console.error("Intent validation failed:");
    console.error(validation.error.format());
    process.exit(1);
  }

  const intent: Intent = validation.data;

  // Setup Infrastructure
  const config = loadConfig();
  setDefaultLogLevel(config.LOG_LEVEL);
  const logger = createLogger("RawIntentRunner");

  logger.info(`Intent received: ${intent.type} (${intent.id})`);
  logger.info("Validation passed.");

  // Orca Global setup
  await setWhirlpoolsConfig("solanaDevnet");
  await setRpc(config.SOLANA_RPC_URL || "https://api.devnet.solana.com");

  const keyStore = new EncryptedFileKeyStore("./.secrets", "dev-passphrase-not-for-prod");
  const solanaClient = new SolanaClient(config.SOLANA_RPC_URL, createLogger("SolanaClient"));
  const walletManager = new WalletManager(keyStore, createLogger("WalletManager"));
  const signer = new Signer(keyStore, createLogger("Signer"));

  const policyEngine = new PolicyEngine(createLogger("PolicyEngine"));
  policyEngine.register(new SpendingLimitPolicy(config.MAX_SPEND_LAMPORTS));
  policyEngine.register(new ProgramWhitelistPolicy(config.ALLOWED_PROGRAMS));
  policyEngine.register(new RateLimitPolicy(config.MAX_TX_PER_MINUTE));

  const txBuilder = new SolanaTransactionBuilder(
    solanaClient,
    createLogger("TxBuilder"),
    (walletId) => walletManager.getPublicKey(walletId),
    (walletId) => signer.getSecretKey(walletId),
  );

  const solanaAdapter = new SolanaProtocolAdapter(solanaClient, txBuilder, createLogger("SolanaAdapter"));
  const adapterFactory = new AdapterFactory();
  adapterFactory.register(solanaAdapter);

  const router = new IntentRouter(adapterFactory, createLogger("IntentRouter"));
  const executor = new Executor({
    router,
    policyEngine,
    signer,
    logger: createLogger("Executor"),
    getBalance: async (walletId) => solanaClient.getBalance(walletManager.getPublicKey(walletId)),
  });

  // Verify wallet exists
  const hasWallet = await keyStore.has(intent.fromWalletId);
  if (!hasWallet) {
    logger.error(`Wallet ${intent.fromWalletId} not found in Keystore. Make sure to run a simulation first to generate test wallets.`);
    process.exit(1);
  }

  // Load wallets so WalletManager knows about them
  await walletManager.loadExistingWallets();

  // Execute
  logger.info("Routing intent to Executor...");
  const agentId = "cli-runner";

  const startTime = Date.now();
  const result = await executor.execute(intent, agentId);
  const durationMs = Date.now() - startTime;

  if (result.status === "success") {
    logger.info("Execution successful:", {
      signature: result.txHash,
      explorer: result.meta?.explorerUrl,
      durationMs,
      chain: result.chain,
    });
  } else {
    logger.error("Execution failed:", {
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      failedAt: result.failedAt,
    });
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
