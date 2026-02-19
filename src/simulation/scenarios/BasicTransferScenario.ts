// ---------------------------------------------------------------------------
// BasicTransferScenario — Minimal scenario: 2 agents send SOL to each other.
// This is the main entry point for demonstrating the system.
// ---------------------------------------------------------------------------

import { loadConfig } from "../../infra/config/ConfigLoader.js";
import { createLogger, setDefaultLogLevel } from "../../infra/logging/LoggerFactory.js";
import { InMemoryKeyStore } from "../../wallet/keystore/InMemoryKeyStore.js";
import { WalletManager } from "../../wallet/WalletManager.js";
import { Signer } from "../../wallet/Signer.js";
import { PolicyEngine } from "../../wallet/policies/PolicyEngine.js";
import { SpendingLimitPolicy } from "../../wallet/policies/SpendingLimitPolicy.js";
import { ProgramWhitelistPolicy } from "../../wallet/policies/ProgramWhitelistPolicy.js";
import { RateLimitPolicy } from "../../wallet/policies/RateLimitPolicy.js";
import { SolanaClient } from "../../adapters/solana/SolanaClient.js";
import { SolanaTransactionBuilder } from "../../adapters/solana/SolanaTransactionBuilder.js";
import { SolanaProtocolAdapter } from "../../adapters/solana/SolanaProtocolAdapter.js";
import { AdapterFactory } from "../../adapters/AdapterFactory.js";
import { IntentRouter } from "../../orchestrator/IntentRouter.js";
import { Executor } from "../../orchestrator/Executor.js";
import { AgentFactory } from "../AgentFactory.js";
import { WalletFactory } from "../WalletFactory.js";
import { ScenarioRunner } from "../ScenarioRunner.js";

async function main() {
  // ── Configuration ──────────────────────────────────────────────────
  const config = loadConfig();
  setDefaultLogLevel(config.LOG_LEVEL);
  const logger = createLogger("BasicTransferScenario");

  logger.info("=== Basic Transfer Scenario ===");
  logger.info("Configuration loaded", {
    cluster: config.SOLANA_CLUSTER,
    rpcUrl: config.SOLANA_RPC_URL,
    agentCount: config.SIMULATION_AGENT_COUNT,
    rounds: config.SIMULATION_ROUNDS,
  });

  // ── Infrastructure ─────────────────────────────────────────────────
  const keyStore = new InMemoryKeyStore();
  const solanaClient = new SolanaClient(
    config.SOLANA_RPC_URL,
    createLogger("SolanaClient"),
  );

  // ── Wallet Engine ──────────────────────────────────────────────────
  const walletManager = new WalletManager(keyStore, createLogger("WalletManager"));
  const signer = new Signer(keyStore, createLogger("Signer"));

  // ── Policy Engine ──────────────────────────────────────────────────
  const policyEngine = new PolicyEngine(createLogger("PolicyEngine"));
  policyEngine.register(new SpendingLimitPolicy(config.MAX_SPEND_LAMPORTS));
  policyEngine.register(new ProgramWhitelistPolicy(config.ALLOWED_PROGRAMS));
  policyEngine.register(new RateLimitPolicy(config.MAX_TX_PER_MINUTE));

  // ── Protocol Adapter ──────────────────────────────────────────────
  const txBuilder = new SolanaTransactionBuilder(
    solanaClient,
    createLogger("TxBuilder"),
    (walletId) => walletManager.getPublicKey(walletId),
  );
  const solanaAdapter = new SolanaProtocolAdapter(
    solanaClient,
    txBuilder,
    createLogger("SolanaAdapter"),
  );

  const adapterFactory = new AdapterFactory();
  adapterFactory.register(solanaAdapter);

  // ── Orchestrator ───────────────────────────────────────────────────
  const router = new IntentRouter(adapterFactory, createLogger("IntentRouter"));
  const executor = new Executor({
    router,
    policyEngine,
    signer,
    logger: createLogger("Executor"),
    getBalance: async (walletId) => {
      const pk = walletManager.getPublicKey(walletId);
      return solanaClient.getBalance(pk);
    },
  });

  // ── Simulation Setup ──────────────────────────────────────────────
  const walletFactory = new WalletFactory(
    walletManager,
    solanaClient,
    createLogger("WalletFactory"),
  );

  logger.info("Creating and funding wallets...");
  const wallets = await walletFactory.createAndFundMany(
    config.SIMULATION_AGENT_COUNT,
    config.AIRDROP_LAMPORTS,
  );

  const agentFactory = new AgentFactory();
  const agents = agentFactory.createMany(
    wallets.map((w) => w.walletId),
    "random-transfer",
    { maxAmountLamports: 50_000_000n }, // 0.05 SOL max per transfer
  );

  // ── Run Scenario ───────────────────────────────────────────────────
  const runner = new ScenarioRunner({
    agents,
    executor,
    walletManager,
    solanaClient,
    logger: createLogger("ScenarioRunner"),
  });

  const result = await runner.run(config.SIMULATION_ROUNDS);

  // ── Report ─────────────────────────────────────────────────────────
  logger.info("=== Scenario Report ===");
  logger.info(`Rounds: ${result.totalRounds}`);
  logger.info(`Intents emitted: ${result.totalIntents}`);
  logger.info(`Successful txs: ${result.successfulTxs}`);
  logger.info(`Failed txs: ${result.failedTxs}`);
  logger.info(`Skipped ticks: ${result.skippedTicks}`);
  logger.info(`Duration: ${result.durationMs}ms`);

  // ── Final Balances ─────────────────────────────────────────────────
  logger.info("=== Final Balances ===");
  for (const wallet of wallets) {
    const balance = await solanaClient.getBalance(wallet.getPublicKey());
    logger.info(`${wallet.getPublicKey()}: ${balance} lamports`);
  }
}

main().catch((error) => {
  console.error("Scenario failed:", error);
  process.exit(1);
});
