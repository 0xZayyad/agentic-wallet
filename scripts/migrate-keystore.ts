import { EncryptedFileKeyStore } from "../src/wallet/keystore/EncryptedFileKeyStore.js";
import { Keypair } from "@solana/web3.js";

async function migrate() {
  const store = new EncryptedFileKeyStore("./.secrets", "dev-passphrase-not-for-prod");
  const walletIds = await store.listAll();

  if (walletIds.length === 0) {
    console.log("No wallets found to migrate.");
    return;
  }

  for (const walletId of walletIds) {
    // If it's already a base58 public key (length around 43-44), skip
    if (!walletId.includes("-") && walletId.length > 30) {
      console.log(`Skipping ${walletId} (already migrated)`);
      continue;
    }

    try {
      const secretKey = await store.retrieve(walletId);
      const keypair = Keypair.fromSecretKey(secretKey);
      const pubkey = keypair.publicKey.toBase58();

      console.log(`Migrating ${walletId} -> ${pubkey}...`);
      await store.store(pubkey, secretKey);
      await store.delete(walletId);
    } catch (e) {
      console.error(`Failed to migrate ${walletId}:`, e);
    }
  }
  console.log("Migration complete.");
}

migrate().catch(console.error);
