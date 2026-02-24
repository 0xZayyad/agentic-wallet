// ---------------------------------------------------------------------------
// TokenEcosystemScenario — Full lifecycle demonstration of SPL tokens.
// Agents create mints, mint tokens, and distribute them collectively.
// ---------------------------------------------------------------------------

import { loadConfig } from "../../infra/config/ConfigLoader.js";
import { createLogger, setDefaultLogLevel } from "../../infra/logging/LoggerFactory.js";
import { EncryptedFileKeyStore } from "../../wallet/keystore/EncryptedFileKeyStore.js";
import { WalletManager } from "../../wallet/WalletManager.js";
import { Signer } from "../../wallet/Signer.js";
import { PolicyEngine } from "../../wallet/policies/PolicyEngine.js";
import { SpendingLimitPolicy } from "../../wallet/policies/SpendingLimitPolicy.js";
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
  const config = loadConfig();
  setDefaultLogLevel(config.LOG_LEVEL);
  const logger = createLogger("TokenEcosystemScenario");

  logger.info("=== Token Ecosystem Scenario ===");

  // 1. Setup Infrastructure
  // Using an encrypted keystore for persistent storage across runs
  const keyStore = new EncryptedFileKeyStore("./.secrets", "dev-passphrase-not-for-prod");
  const solanaClient = new SolanaClient(config.SOLANA_RPC_URL, createLogger("SolanaClient"));
  const walletManager = new WalletManager(keyStore, createLogger("WalletManager"));
  const signer = new Signer(keyStore, createLogger("Signer"));

  // 2. Setup Policy Engine
  const policyEngine = new PolicyEngine(createLogger("PolicyEngine"));
  policyEngine.register(new SpendingLimitPolicy(config.MAX_SPEND_LAMPORTS));

  // 3. Setup Protocol Layer
  const txBuilder = new SolanaTransactionBuilder(
    solanaClient,
    createLogger("TxBuilder"),
    (walletId) => walletManager.getPublicKey(walletId),
  );
  const solanaAdapter = new SolanaProtocolAdapter(solanaClient, txBuilder, createLogger("SolanaAdapter"));
  const adapterFactory = new AdapterFactory();
  adapterFactory.register(solanaAdapter);

  // 4. Setup Orchestrator
  const router = new IntentRouter(adapterFactory, createLogger("IntentRouter"));
  const executor = new Executor({
    router,
    policyEngine,
    signer,
    logger: createLogger("Executor"),
    getBalance: async (walletId) => solanaClient.getBalance(walletManager.getPublicKey(walletId)),
  });

  // 5. Create or Load Wallets
  const walletFactory = new WalletFactory(walletManager, solanaClient, createLogger("WalletFactory"));
  logger.info("Initializing wallets on devnet...");

  let wallets = await walletManager.loadExistingWallets();

  if (wallets.length < 2) {
    const needed = 2 - wallets.length;
    logger.info(`Need ${needed} more wallets. Creating and funding...`);
    const newWallets = await walletFactory.createAndFundMany(needed, 2_000_000_000);
    wallets = [...wallets, ...newWallets];
  } else {
    logger.info(`Loaded ${wallets.length} existing wallets.`);
    // Check balances of loaded wallets and top up conditionally to avoid 429
    for (const w of wallets) {
      const bal = await solanaClient.getBalance(w.getPublicKey());
      if (bal < 500_000_000n) { // Less than 0.5 SOL
        logger.info(`Topping up existing wallet: ${w.getPublicKey()} (Balance: ${bal})`);
        try {
          // Wrap in try catch so a 429 rate limit doesn't completely kill the flow if they have some SOL
          await solanaClient.requestAirdrop(w.getPublicKey(), 2_000_000_000);
        } catch (error) {
          logger.warn(`Failed to top up wallet ${w.getPublicKey()}, skipping:`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
  }

  // 6. Create Agents (Token Manager & Peer)
  const agentFactory = new AgentFactory();
  if (wallets.length < 2) {
    throw new Error("Failed to create enough wallets");
  }

  const tokenManager = agentFactory.create({
    walletId: wallets[0]!.walletId,
    strategy: "token-manager",
  });

  const peerAgent = agentFactory.create({
    walletId: wallets[1]!.walletId,
    strategy: "random-transfer",
  });

  // 7. Run Simulation
  const runner = new ScenarioRunner({
    agents: [tokenManager, peerAgent],
    executor,
    walletManager,
    solanaClient,
    logger: createLogger("ScenarioRunner"),
  });

  // We need at least 3 rounds to see the full cycle: 
  // Round 1: Create Mint
  // Round 2: Mint Tokens
  // Round 3: Transfer Tokens
  const rounds = 4;
  await runner.run(rounds);

  logger.info("=== Simulation Finished ===");
}

main().catch((error) => {
  console.error("Scenario failed:", error);
  process.exit(1);
});
