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

    const timestamp = new Date().toISOString();

    // ANSI color codes
    const colors = {
      reset: "\x1b[0m",
      dim: "\x1b[2m",
      info: "\x1b[36m", // Cyan
      warn: "\x1b[33m", // Yellow
      error: "\x1b[31m", // Red
      debug: "\x1b[35m", // Magenta
      context: "\x1b[32m", // Green
    };

    const color = colors[level];
    const levelStr = `[${level.toUpperCase()}]`.padEnd(7);
    const ctxStr = `[${this.context}]`;

    // Format metadata if it exists
    let metaStr = "";
    if (meta && Object.keys(meta).length > 0) {
      // Stringify meta nicely, but keep it on one line if small, or pretty print if large
      const metaJson = JSON.stringify(meta, this.bigIntReplacer);
      metaStr = `\n${colors.dim}  ↳ ${metaJson}${colors.reset}`;
    }

    const output = `${colors.dim}${timestamp}${colors.reset} ${color}${levelStr}${colors.reset} ${colors.context}${ctxStr}${colors.reset} ${message}${metaStr}`;

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
