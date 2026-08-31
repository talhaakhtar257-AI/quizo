import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Encrypts each academy's own Gemini key at rest (CLAUDE.md rule #10: "each
// academy's Gemini key is encrypted at rest and decrypted server-side
// only"). Server-only — never import this from a client component.
//
// AES-256-GCM: a random 12-byte IV per encryption (so the same key never
// produces the same ciphertext twice) plus a 16-byte auth tag (so a
// tampered ciphertext fails to decrypt instead of silently returning
// garbage). Stored together as iv:authTag:ciphertext, hex-encoded.

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY is missing or the wrong length in .env.local — it must be a 64-character hex string (32 bytes)."
    );
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decrypt(stored: string): string {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Stored value is not in the expected iv:authTag:ciphertext shape.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

// Masks a decrypted key for display: "AIzaSy...9nsB" instead of the full
// value. Used in the settings UI so a saved key never round-trips back to
// the browser in full.
export function maskApiKey(key: string): string {
  if (key.length <= 10) return "•".repeat(key.length);
  return `${key.slice(0, 6)}${"•".repeat(6)}${key.slice(-4)}`;
}
