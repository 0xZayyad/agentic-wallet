// ---------------------------------------------------------------------------
// InMemoryKeyStore — Development-only key storage backed by a Map.
// WARNING: Keys are held in plaintext in memory. NOT for production.
// ---------------------------------------------------------------------------

import type { IKeyStore } from "../../core/interfaces/IKeyStore.js";

export class InMemoryKeyStore implements IKeyStore {
  private readonly keys = new Map<string, Uint8Array>();

  async store(walletId: string, secretKey: Uint8Array): Promise<void> {
    if (this.keys.has(walletId)) {
      throw new Error(`Key already exists for wallet "${walletId}"`);
    }
    // Store a copy to prevent external mutation
    this.keys.set(walletId, new Uint8Array(secretKey));
  }

  async retrieve(walletId: string): Promise<Uint8Array> {
    const key = this.keys.get(walletId);
    if (!key) {
      throw new Error(`No key found for wallet "${walletId}"`);
    }
    // Return a copy to prevent external mutation
    return new Uint8Array(key);
  }

  async has(walletId: string): Promise<boolean> {
    return this.keys.has(walletId);
  }

  async delete(walletId: string): Promise<void> {
    // Overwrite with zeros before deleting (basic key hygiene)
    const key = this.keys.get(walletId);
    if (key) {
      key.fill(0);
    }
    this.keys.delete(walletId);
  }

  async listAll(): Promise<string[]> {
    return Array.from(this.keys.keys());
  }
}
