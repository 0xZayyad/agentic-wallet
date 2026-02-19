// ---------------------------------------------------------------------------
// RpcClientFactory — Creates and pools Solana RPC connections.
// ---------------------------------------------------------------------------

import { Connection } from "@solana/web3.js";
import type { ILogger } from "../../core/interfaces/ILogger.js";

const connectionPool = new Map<string, Connection>();

/**
 * Get or create a cached Solana connection for the given RPC URL.
 */
export function getOrCreateConnection(
  rpcUrl: string,
  logger: ILogger,
): Connection {
  let connection = connectionPool.get(rpcUrl);
  if (!connection) {
    connection = new Connection(rpcUrl, "confirmed");
    connectionPool.set(rpcUrl, connection);
    logger.info("RPC connection created", { rpcUrl });
  }
  return connection;
}
