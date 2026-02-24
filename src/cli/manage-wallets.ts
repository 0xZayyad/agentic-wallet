// ---------------------------------------------------------------------------
// manage-wallets — CLI utility to list and create Agentic Wallets.
// ---------------------------------------------------------------------------

import { parseArgs } from "node:util";

import { loadConfig } from "../infra/config/ConfigLoader.js";
import { createLogger, setDefaultLogLevel } from "../infra/logging/LoggerFactory.js";
import { EncryptedFileKeyStore } from "../wallet/keystore/EncryptedFileKeyStore.js";
import { WalletManager } from "../wallet/WalletManager.js";
import { SolanaClient } from "../adapters/solana/SolanaClient.js";

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      label: { type: "string" },
    },
  });

  const command = positionals[0];

  if (!command || !["list", "create"].includes(command)) {
    console.error("Usage: npm run wallets -- <list|create> [--label <name>]");
    process.exit(1);
  }

  // Setup Infrastructure
  const config = loadConfig();
  setDefaultLogLevel(config.LOG_LEVEL);
  const logger = createLogger("WalletManagerCLI");

  const keyStore = new EncryptedFileKeyStore("./.secrets", "dev-passphrase-not-for-prod");
  const solanaClient = new SolanaClient(config.SOLANA_RPC_URL, createLogger("SolanaClient"));
  const walletManager = new WalletManager(keyStore, createLogger("WalletManager"));

  if (command === "list") {
    logger.info("Loading existing wallets from KeyStore...");
    const wallets = await walletManager.loadExistingWallets();

    if (wallets.length === 0) {
      logger.info(
        "No wallets found in .secrets. Use `npm run wallets -- create` or run a scenario to generate some.",
      );
      process.exit(0);
    }

    console.log();
    console.log("=== Agentic Wallets ===");
    for (const wallet of wallets) {
      const info = await wallet.getInfo();
      const balance = await solanaClient.getBalance(wallet.getPublicKey());

      const balanceSol = Number(balance) / 1_000_000_000;

      console.log(`- Wallet   : ${info.publicKey}`);
      console.log(`  Label    : ${info.label || "unknown"}`);
      console.log(`  Balance  : ${balanceSol.toFixed(4)} SOL`);
      console.log(`  CreatedAt: ${info.createdAt}`);
      console.log();
    }
    process.exit(0);
  }

  if (command === "create") {
    const label = values.label;
    logger.info(`Creating new wallet${label ? ` with label '${label}'` : ""}...`);

    const wallet = await walletManager.createWallet("solana", label);
    const pubkey = wallet.getPublicKey();

    console.log();
    console.log("=== Wallet Created Successfully ===");
    console.log(`Public Key (Wallet ID): ${pubkey}`);
    console.log(`Label                 : ${label || "none"}`);
    console.log();
    console.log(`Next Step: Fund this wallet on devnet: https://faucet.solana.com/`);
    console.log(`Or via CLI if you have local tools: solana airdrop 2 ${pubkey} --url devnet`);
    console.log();
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
