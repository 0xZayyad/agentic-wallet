// ---------------------------------------------------------------------------
// MultiAgentSwapScenario — Multi-agent simulation with Orca swap intents.
// Agents persistently swap tokens using Orca Whirlpools SDK.
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
import { setWhirlpoolsConfig, setRpc } from '@orca-so/whirlpools';
import { ProgramWhitelistPolicy } from '../../wallet/policies/ProgramWhitelistPolicy.js';
import { RateLimitPolicy } from '../../wallet/policies/RateLimitPolicy.js';

async function main() {
  const config = loadConfig();
  setDefaultLogLevel(config.LOG_LEVEL);
  const logger = createLogger("MultiAgentSwapScenario");

  logger.info("=== Multi-Agent Orca Swap Scenario ===");

  // Setup Orca Devnet config Globally
  await setWhirlpoolsConfig('solanaDevnet');
  await setRpc(config.SOLANA_RPC_URL || 'https://api.devnet.solana.com');

  // 1. Setup Infrastructure
  // Using an encrypted keystore for persistent storage across runs
  const keyStore = new EncryptedFileKeyStore("./.secrets", "dev-passphrase-not-for-prod");
  const solanaClient = new SolanaClient(config.SOLANA_RPC_URL, createLogger("SolanaClient"));
  const walletManager = new WalletManager(keyStore, createLogger("WalletManager"));
  const signer = new Signer(keyStore, createLogger("Signer"));

  // 2. Setup Policy Engine
  const policyEngine = new PolicyEngine(createLogger("PolicyEngine"));
  policyEngine.register(new SpendingLimitPolicy(config.MAX_SPEND_LAMPORTS));
  policyEngine.register(new ProgramWhitelistPolicy(config.ALLOWED_PROGRAMS));
  policyEngine.register(new RateLimitPolicy(config.MAX_TX_PER_MINUTE));

  // 3. Setup Protocol Layer
  const txBuilder = new SolanaTransactionBuilder(
    solanaClient,
    createLogger("TxBuilder"),
    (walletId) => walletManager.getPublicKey(walletId),
    (walletId) => signer.getSecretKey(walletId),
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
    for (const w of wallets) {
      const bal = await solanaClient.getBalance(w.getPublicKey());
      if (bal < 500_000_000n) { // 0.5 SOL min threshold
        logger.info(`Topping up existing wallet: ${w.getPublicKey()} (Balance: ${bal})`);
        try {
          await solanaClient.requestAirdrop(w.getPublicKey(), 2_000_000_000);
        } catch (error) {
          logger.warn(`Failed to top up wallet ${w.getPublicKey()}, skipping`);
        }
      }
    }
  }

  // 6. Create Agents (Orca Switchers)
  const agentFactory = new AgentFactory();

  // Define Orca details
  const whirlpoolAddress = "3KBZiL2g8C7tiJ32hTv5v3KM7aK9htpqTw4cTXz1HvPt";
  const wSolMint = "So11111111111111111111111111111111111111112"; // WSOL
  const otherMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC

  const orcaAgent1 = agentFactory.create({
    walletId: wallets[0]!.walletId,
    strategy: "orca-swap",
    orcaSwapConfig: {
      poolAddress: whirlpoolAddress,
      tokenInMint: wSolMint,
      tokenOutMint: otherMint,
      amountIn: 100_000n, // Swap a small amount of SOL to avoid balance exhaustion (0.0001 SOL)
      chance: 1.0, // Always try to swap
    }
  });

  const orcaAgent2 = agentFactory.create({
    walletId: wallets[1]!.walletId,
    strategy: "orca-swap",
    orcaSwapConfig: {
      poolAddress: whirlpoolAddress,
      tokenInMint: wSolMint,
      tokenOutMint: otherMint,
      amountIn: 100_000n, // Swap a small amount of SOL to avoid balance exhaustion (0.0001 SOL)
      chance: 1.0,
    }
  });

  // 7. Run Simulation
  const runner = new ScenarioRunner({
    agents: [orcaAgent1, orcaAgent2],
    executor,
    walletManager,
    solanaClient,
    logger: createLogger("ScenarioRunner"),
  });

  // Run a couple of rounds to let agents swap
  const rounds = 2;
  await runner.run(rounds);

  logger.info("=== Simulation Finished ===");
}

main().catch((error) => {
  console.error("Scenario failed:", error);
  process.exit(1);
});
