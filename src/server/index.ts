// ---------------------------------------------------------------------------
// Server — Fastify HTTP API server bridging the frontend UI to the
// agentic-wallet execution kernel. Port 3001 (frontend runs on 3000).
// ---------------------------------------------------------------------------

import Fastify from "fastify";
import cors from "@fastify/cors";
import { setWhirlpoolsConfig, setRpc } from "@orca-so/whirlpools";

import { loadConfig } from "../infra/config/ConfigLoader.js";
import { createLogger, setDefaultLogLevel } from "../infra/logging/LoggerFactory.js";
import { EncryptedFileKeyStore } from "../wallet/keystore/EncryptedFileKeyStore.js";
import { WalletManager } from "../wallet/WalletManager.js";
import { Signer } from "../wallet/Signer.js";
import { PolicyEngine } from "../wallet/policies/PolicyEngine.js";
import { SpendingLimitPolicy } from "../wallet/policies/SpendingLimitPolicy.js";
import { RateLimitPolicy } from "../wallet/policies/RateLimitPolicy.js";
import { SolanaClient } from "../adapters/solana/SolanaClient.js";
import { SolanaTransactionBuilder } from "../adapters/solana/SolanaTransactionBuilder.js";
import { SolanaProtocolAdapter } from "../adapters/solana/SolanaProtocolAdapter.js";
import { AdapterFactory } from "../adapters/AdapterFactory.js";
import { IntentRouter } from "../orchestrator/IntentRouter.js";
import { Executor } from "../orchestrator/Executor.js";

import { walletsRoute } from "./routes/wallets.js";
import { agentRoute } from "./routes/agent.js";

async function main() {
  // ── Config & logging ───────────────────────────────────────────────────
  const config = loadConfig();
  setDefaultLogLevel(config.LOG_LEVEL);
  const logger = createLogger("Server");

  // ── Orca global setup ──────────────────────────────────────────────────
  await setWhirlpoolsConfig("solanaDevnet");
  await setRpc(config.SOLANA_RPC_URL);

  // ── Infrastructure ─────────────────────────────────────────────────────
  const keyStore = new EncryptedFileKeyStore("./.secrets", "dev-passphrase-not-for-prod");
  const solanaClient = new SolanaClient(config.SOLANA_RPC_URL, createLogger("SolanaClient"));
  const walletManager = new WalletManager(keyStore, createLogger("WalletManager"));
  const signer = new Signer(keyStore, createLogger("Signer"));

  // Load all stored wallets
  await walletManager.loadExistingWallets();

  // ── Policy engine ───────────────────────────────────────────────────────
  const policyEngine = new PolicyEngine(createLogger("PolicyEngine"));
  policyEngine.register(new SpendingLimitPolicy(config.MAX_SPEND_LAMPORTS));
  policyEngine.register(new RateLimitPolicy(config.MAX_TX_PER_MINUTE));

  // ── Executor ────────────────────────────────────────────────────────────
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
    getBalance: (walletId) => solanaClient.getBalance(walletManager.getPublicKey(walletId)),
  });

  // ── Fastify ─────────────────────────────────────────────────────────────
  const fastify = Fastify({ logger: { level: config.LOG_LEVEL } });

  await fastify.register(cors, {
    origin: ["http://localhost:3000", "http://localhost:3001"],
  });

  const deps = { walletManager, solanaClient, executor };
  await walletsRoute(fastify, deps);
  await agentRoute(fastify, deps);

  // Health check
  fastify.get("/api/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    wallets: walletManager.getAllWallets().length,
  }));

  const port = Number(process.env.API_PORT ?? 3001);
  await fastify.listen({ port, host: "0.0.0.0" });
  logger.info(`API server listening on http://0.0.0.0:${port}`);
}

main().catch((err) => {
  console.error("Fatal server error:", err);
  process.exit(1);
});
