// ---------------------------------------------------------------------------
// EncryptedFileKeyStore — Persistent encrypted key storage.
// Uses Node.js crypto to encrypt keys at rest with AES-256-GCM.
// Suitable for devnet prototype; production would use HSM / enclave.
// ---------------------------------------------------------------------------

import { readFile, writeFile, mkdir, unlink, access } from "node:fs/promises";
import { join } from "node:path";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import type { IKeyStore } from "../../core/interfaces/IKeyStore.js";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

export class EncryptedFileKeyStore implements IKeyStore {
  private readonly baseDir: string;
  private readonly passphrase: string;

  constructor(baseDir: string, passphrase: string) {
    this.baseDir = baseDir;
    this.passphrase = passphrase;
  }

  async store(walletId: string, secretKey: Uint8Array): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });

    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const derivedKey = scryptSync(this.passphrase, salt, KEY_LENGTH);

    const cipher = createCipheriv(ALGORITHM, derivedKey, iv);
    const encrypted = Buffer.concat([cipher.update(secretKey), cipher.final()]);
    const tag = cipher.getAuthTag();

    // File format: salt (32) + iv (16) + tag (16) + encrypted data
    const data = Buffer.concat([salt, iv, tag, encrypted]);
    await writeFile(this.filePath(walletId), data);
  }

  async retrieve(walletId: string): Promise<Uint8Array> {
    const data = await readFile(this.filePath(walletId));

    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const derivedKey = scryptSync(this.passphrase, salt, KEY_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return new Uint8Array(decrypted);
  }

  async has(walletId: string): Promise<boolean> {
    try {
      await access(this.filePath(walletId));
      return true;
    } catch {
      return false;
    }
  }

  async delete(walletId: string): Promise<void> {
    try {
      // Overwrite file content before unlinking
      const filePath = this.filePath(walletId);
      const size = (await readFile(filePath)).length;
      await writeFile(filePath, randomBytes(size));
      await unlink(filePath);
    } catch {
      // File may not exist — that's acceptable
    }
  }

  private filePath(walletId: string): string {
    // Sanitize walletId to prevent path traversal
    const safeId = walletId.replace(/[^a-zA-Z0-9\-]/g, "");
    return join(this.baseDir, `${safeId}.key`);
  }
}
