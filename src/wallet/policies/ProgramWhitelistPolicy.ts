// ---------------------------------------------------------------------------
// ProgramWhitelistPolicy — Only allows transactions targeting approved programs.
// ---------------------------------------------------------------------------

import type { IPolicy, PolicyContext } from "../../core/interfaces/IPolicy.js";
import type { Intent } from "../../core/intents/Intent.js";
import type { PolicyDecision } from "../../core/types/PolicyDecision.js";

export class ProgramWhitelistPolicy implements IPolicy {
  readonly policyId = "program-whitelist";
  readonly name = "Program Whitelist Policy";

  private readonly allowedPrograms: Set<string>;

  constructor(allowedPrograms: string[]) {
    this.allowedPrograms = new Set(allowedPrograms);
  }

  async evaluate(intent: Intent, _context: PolicyContext): Promise<PolicyDecision> {
    // Extract target program IDs from the intent
    const targetPrograms = this.extractTargetPrograms(intent);

    for (const programId of targetPrograms) {
      if (!this.allowedPrograms.has(programId)) {
        return {
          allowed: false,
          policyId: this.policyId,
          reason: `Program "${programId}" is not whitelisted`,
          meta: {
            deniedProgram: programId,
            allowedPrograms: Array.from(this.allowedPrograms),
          },
        };
      }
    }

    return { allowed: true, policyId: this.policyId };
  }

  /**
   * Extract target program IDs from an intent.
   * For transfers: System Program or Token Program.
   * For swaps: the swap program (e.g., Jupiter).
   */
  private extractTargetPrograms(intent: Intent): string[] {
    switch (intent.type) {
      case "transfer":
        // Native SOL uses System Program; SPL tokens use Token Program
        return intent.tokenMint
          ? ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"]
          : ["11111111111111111111111111111111"];
      case "swap":
        // Placeholder: Jupiter v6 program ID
        return ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"];
      default:
        return [];
    }
  }
}
