// ---------------------------------------------------------------------------
// LoggerFactory — Creates logger instances with consistent configuration.
// ---------------------------------------------------------------------------

import type { ILogger } from "../../core/interfaces/ILogger.js";
import { ConsoleLogger } from "./ConsoleLogger.js";

type LogLevel = "debug" | "info" | "warn" | "error";

let defaultLevel: LogLevel = "info";

export function setDefaultLogLevel(level: LogLevel): void {
  defaultLevel = level;
}

export function createLogger(context: string, level?: LogLevel): ILogger {
  return new ConsoleLogger(context, level ?? defaultLevel);
}
