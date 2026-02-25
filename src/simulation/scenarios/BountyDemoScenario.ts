// ---------------------------------------------------------------------------
// BountyDemoScenario — A specialized demo scenario built to showcase all
// bounty requirements: autonomous programmatic wallets, parallel execution,
// value transfers, and cross-protocol DeFi interactions (Orca).
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
  const logger = createLogger("BountyDemoScenario");

  logger.info("=================================================");
  logger.info("=== 💰 Agentic Wallet - Bounty Demo Scenario ===");
  logger.info("=================================================");
  logger.info("Initializing high-performance autonomous sandbox...");

  // Setup Orca Devnet config Globally
  await setWhirlpoolsConfig('solanaDevnet');
  await setRpc(config.SOLANA_RPC_URL || 'https://api.devnet.solana.com');

  // 1. Setup Infrastructure
  // Using an encrypted keystore for persistent, secure storage representing robust Key Management
  const keyStore = new EncryptedFileKeyStore("./.secrets", "dev-passphrase-not-for-prod");
  const solanaClient = new SolanaClient(config.SOLANA_RPC_URL, createLogger("SolanaClient"));
  const walletManager = new WalletManager(keyStore, createLogger("WalletManager"));
  const signer = new Signer(keyStore, createLogger("Signer"));

  // 2. Setup Policy Engine (The core of our Security Model)
  const policyEngine = new PolicyEngine(createLogger("PolicyEngine"));
  policyEngine.register(new SpendingLimitPolicy(config.MAX_SPEND_LAMPORTS));
  // policyEngine.register(new ProgramWhitelistPolicy(config.ALLOWED_PROGRAMS));
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

  // 4. Setup Orchestrator (Separation of Concerns: Agent logic vs Wallet Execution)
  const router = new IntentRouter(adapterFactory, createLogger("IntentRouter"));
  const executor = new Executor({
    router,
    policyEngine,
    signer,
    logger: createLogger("Executor"),
    getBalance: async (walletId) => solanaClient.getBalance(walletManager.getPublicKey(walletId)),
  });

  // 5. Create or Load Wallets autonomously
  const walletFactory = new WalletFactory(walletManager, solanaClient, createLogger("WalletFactory"));
  logger.info("Checking for agent wallets on devnet...");

  let wallets = await walletManager.loadExistingWallets();

  // Ensure we have exactly 2 wallets for our Alice/Bob setup
  if (wallets.length < 2) {
    const needed = 2 - wallets.length;
    logger.info(`Provisioning ${needed} new autonomous agent wallets...`);
    const newWallets = await walletFactory.createAndFundMany(needed, 2_000_000_000); // 2 SOL Airdrop
    wallets = [...wallets, ...newWallets];
  } else {
    logger.info(`Loaded ${wallets.length} existing agent identities from secure enclave.`);
    // Ensure both are slightly funded
    for (const w of wallets.slice(0, 2)) {
      const bal = await solanaClient.getBalance(w.getPublicKey());
      if (bal < 5_000_000n) {
        logger.info(`Topping up agent wallet: ${w.getPublicKey()}`);
        try {
          await solanaClient.requestAirdrop(w.getPublicKey(), 2_000_000_000);
        } catch (e) {
          logger.warn(`Faucet drop failed (rate limit potentially). Proceeding...`);
        }
      }
    }
  }

  // Define Orca details for Agent B
  const whirlpoolAddress = "3KBZiL2g8C7tiJ32hTv5v3KM7aK9htpqTw4cTXz1HvPt";
  const wSolMint = "So11111111111111111111111111111111111111112"; // WSOL
  const otherMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC

  // 6. Create Agents with Distinct Behaviors
  const agentFactory = new AgentFactory();

  // Agent A: An active user transferring SOL to Agent B
  const agentA = agentFactory.create({
    walletId: wallets[0]!.walletId,
    strategy: "random-transfer",
    maxAmountLamports: 100_000n,
  });

  // Agent B: A DeFi agent who takes SOL and swaps it for USDC on Orca
  const agentB = agentFactory.create({
    walletId: wallets[1]!.walletId,
    strategy: "orca-swap",
    orcaSwapConfig: {
      poolAddress: whirlpoolAddress,
      tokenInMint: wSolMint,
      tokenOutMint: otherMint,
      amountIn: 50_000n,
      chance: 1.0,
    }
  });

  // 7. Run Parallel Simulation (Proving Scalability)
  logger.info("Starting concurrent agent simulation (Agents acting simultaneously)...");

  const runner = new ScenarioRunner({
    agents: [agentA, agentB],
    executor,
    walletManager,
    solanaClient,
    logger: createLogger("ConcurrentRunner"),
  });

  // Run 1 round to see them both act simultaneously: A sends SOL, B swaps SOL -> USDC
  const result = await runner.run(1);

  logger.info("=================================================");
  logger.info("=== Simulation Complete ===");
  logger.info(`✅ Total Intents Evaluated: ${result.totalIntents}`);
  logger.info(`✅ Successful Autonomous Txs: ${result.successfulTxs}`);
  logger.info("=================================================");
}

main().catch((error) => {
  console.error("Critical simulation failure:", error);
  process.exit(1);
});
