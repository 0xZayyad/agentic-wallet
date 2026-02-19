// ---------------------------------------------------------------------------
// FileStorage — Simple file-based persistence for simulation state.
// ---------------------------------------------------------------------------

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export class FileStorage {
  /**
   * Read and parse a JSON file.
   */
  async read<T>(filePath: string): Promise<T | null> {
    try {
      const data = await readFile(filePath, "utf-8");
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Write an object to a JSON file (pretty-printed).
   */
  async write(filePath: string, data: unknown): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }
}
