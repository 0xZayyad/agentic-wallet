// ---------------------------------------------------------------------------
// AdapterFactory — Registry-based factory for resolving chain adapters.
// New chains are added by implementing IProtocolAdapter and registering here.
// ---------------------------------------------------------------------------

import type { IProtocolAdapter } from "../core/interfaces/IProtocolAdapter.js";

export class AdapterFactory {
  private readonly adapters = new Map<string, IProtocolAdapter>();

  /**
   * Register an adapter for a chain.
   */
  register(adapter: IProtocolAdapter): void {
    if (this.adapters.has(adapter.chain)) {
      throw new Error(`Adapter already registered for chain "${adapter.chain}"`);
    }
    this.adapters.set(adapter.chain, adapter);
  }

  /**
   * Resolve an adapter by chain identifier.
   * @throws If no adapter is registered for the given chain.
   */
  resolve(chain: string): IProtocolAdapter {
    const adapter = this.adapters.get(chain);
    if (!adapter) {
      throw new Error(
        `No adapter registered for chain "${chain}". ` +
        `Available chains: [${Array.from(this.adapters.keys()).join(", ")}]`,
      );
    }
    return adapter;
  }

  /**
   * List all registered chain identifiers.
   */
  getRegisteredChains(): string[] {
    return Array.from(this.adapters.keys());
  }
}
