// ---------------------------------------------------------------------------
// ConfigLoader — Loads and validates environment configuration using Zod.
// ---------------------------------------------------------------------------

import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Solana
  SOLANA_CLUSTER: z.enum(["devnet", "testnet", "mainnet-beta"]).default("devnet"),
  SOLANA_RPC_URL: z.string().url().default("https://api.devnet.solana.com"),

  // Policy
  MAX_SPEND_LAMPORTS: z.coerce.bigint().default(1_000_000_000n),
  MAX_TX_PER_MINUTE: z.coerce.number().int().positive().default(10),
  ALLOWED_PROGRAMS: z
    .string()
    .default("11111111111111111111111111111111,TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    .transform((s) => s.split(",")),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Simulation
  SIMULATION_AGENT_COUNT: z.coerce.number().int().positive().default(2),
  SIMULATION_ROUNDS: z.coerce.number().int().positive().default(5),
  AIRDROP_LAMPORTS: z.coerce.number().int().positive().default(2_000_000_000),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

let cachedConfig: AppConfig | null = null;

/**
 * Load, validate, and return application configuration.
 * Caches the result — subsequent calls return the same config.
 */
export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  // Load .env file
  loadDotenv();

  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Configuration validation failed:\n${formatted}`);
  }

  // Safety check: refuse to run on mainnet
  if (result.data.SOLANA_CLUSTER === "mainnet-beta") {
    throw new Error(
      "FATAL: This prototype must NOT run on mainnet. Set SOLANA_CLUSTER=devnet.",
    );
  }

  cachedConfig = result.data;
  return cachedConfig;
}
