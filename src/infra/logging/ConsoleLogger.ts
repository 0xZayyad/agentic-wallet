// ---------------------------------------------------------------------------
// ConsoleLogger — Structured JSON logging implementation.
// ---------------------------------------------------------------------------

import type { ILogger } from "../../core/interfaces/ILogger.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class ConsoleLogger implements ILogger {
  private readonly minLevel: number;
  private readonly context: string;

  constructor(context: string, level: LogLevel = "info") {
    this.context = context;
    this.minLevel = LOG_LEVEL_PRIORITY[level];
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log("error", message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log("debug", message, meta);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVEL_PRIORITY[level] < this.minLevel) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...meta,
    };

    const output = JSON.stringify(entry, this.bigIntReplacer);

    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "debug":
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  /** Handle BigInt serialization in JSON.stringify */
  private bigIntReplacer(_key: string, value: unknown): unknown {
    return typeof value === "bigint" ? value.toString() : value;
  }
}
