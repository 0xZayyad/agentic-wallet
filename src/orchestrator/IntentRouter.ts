// ---------------------------------------------------------------------------
// IntentRouter — Routes intents to the correct protocol adapter.
// Uses AdapterFactory for registry-based resolution by chain identifier.
// ---------------------------------------------------------------------------

import type { Intent } from "../core/intents/Intent.js";
import type { IProtocolAdapter } from "../core/interfaces/IProtocolAdapter.js";
import type { ILogger } from "../core/interfaces/ILogger.js";
import { AdapterFactory } from "../adapters/AdapterFactory.js";

export class IntentRouter {
  private readonly adapterFactory: AdapterFactory;
  private readonly logger: ILogger;

  constructor(adapterFactory: AdapterFactory, logger: ILogger) {
    this.adapterFactory = adapterFactory;
    this.logger = logger;
  }

  /**
   * Resolve the correct protocol adapter for an intent based on its chain field.
   */
  resolve(intent: Intent): IProtocolAdapter {
    this.logger.debug("Routing intent", {
      intentId: intent.id,
      chain: intent.chain,
      type: intent.type,
    });

    return this.adapterFactory.resolve(intent.chain);
  }
}
