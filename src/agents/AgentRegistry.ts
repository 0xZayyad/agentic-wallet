// ---------------------------------------------------------------------------
// AgentRegistry — Track and manage active agents by ID.
// ---------------------------------------------------------------------------

import type { IAgent } from "../core/interfaces/IAgent.js";

export class AgentRegistry {
  private readonly agents = new Map<string, IAgent>();

  register(agent: IAgent): void {
    if (this.agents.has(agent.agentId)) {
      throw new Error(`Agent "${agent.agentId}" is already registered`);
    }
    this.agents.set(agent.agentId, agent);
  }

  get(agentId: string): IAgent | undefined {
    return this.agents.get(agentId);
  }

  getAll(): IAgent[] {
    return Array.from(this.agents.values());
  }

  remove(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  get count(): number {
    return this.agents.size;
  }
}
