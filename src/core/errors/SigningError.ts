// ---------------------------------------------------------------------------
// SigningError — Thrown when key retrieval or signing fails.
// ---------------------------------------------------------------------------

import { DomainError } from "./DomainError.js";

export class SigningError extends DomainError {
  readonly walletId: string;

  constructor(walletId: string, message: string, cause?: Error) {
    super("SIGNING_ERROR", `Signing failed for wallet "${walletId}": ${message}`, cause);
    this.name = "SigningError";
    this.walletId = walletId;
  }
}
