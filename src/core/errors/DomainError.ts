// ---------------------------------------------------------------------------
// DomainError — Base error class for all domain-specific errors.
// ---------------------------------------------------------------------------

export class DomainError extends Error {
  /** Machine-readable error code */
  readonly code: string;

  constructor(code: string, message: string, cause?: Error) {
    super(message, { cause });
    this.name = "DomainError";
    this.code = code;
  }
}
