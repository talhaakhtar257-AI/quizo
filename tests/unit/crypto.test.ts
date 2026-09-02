import { describe, expect, it } from "vitest";
import { decrypt, encrypt, maskApiKey } from "@/lib/crypto";

// Each academy's Gemini key is stored encrypted (CLAUDE.md rule 10). If
// encrypt/decrypt ever stopped agreeing, every saved key would become
// unreadable — and there is no plaintext copy anywhere to recover from.

const SAMPLE_KEY = "AIzaSyDummyKeyForTestsOnly_0123456789nsB";

describe("encrypt / decrypt", () => {
  it("round-trips a value unchanged", () => {
    expect(decrypt(encrypt(SAMPLE_KEY))).toBe(SAMPLE_KEY);
  });

  it("round-trips non-ASCII text", () => {
    expect(decrypt(encrypt("مفتاح — clé — 鍵"))).toBe("مفتاح — clé — 鍵");
  });

  it("round-trips an empty string", () => {
    expect(decrypt(encrypt(""))).toBe("");
  });

  it("produces different ciphertext every time (random IV)", () => {
    expect(encrypt(SAMPLE_KEY)).not.toBe(encrypt(SAMPLE_KEY));
  });

  it("stores iv:authTag:ciphertext with the documented lengths", () => {
    const [iv, tag] = encrypt(SAMPLE_KEY).split(":");
    expect(iv).toHaveLength(24); // 12 bytes hex
    expect(tag).toHaveLength(32); // 16 bytes hex
  });

  it("refuses a tampered ciphertext instead of returning garbage", () => {
    const [iv, tag, body] = encrypt(SAMPLE_KEY).split(":");
    const flipped = body.startsWith("a") ? `b${body.slice(1)}` : `a${body.slice(1)}`;
    expect(() => decrypt(`${iv}:${tag}:${flipped}`)).toThrow();
  });

  it("rejects a value that is not in the expected shape", () => {
    expect(() => decrypt("not-encrypted-at-all")).toThrow(/expected iv:authTag:ciphertext shape/);
  });
});

describe("maskApiKey", () => {
  it("shows only the first 6 and last 4 characters", () => {
    expect(maskApiKey("AIzaSyABCDEFGH9nsB")).toBe("AIzaSy••••••9nsB");
  });

  it("hides a short value completely", () => {
    expect(maskApiKey("short")).toBe("•••••");
  });

  it("never leaks the middle of the key", () => {
    expect(maskApiKey(SAMPLE_KEY)).not.toContain("DummyKey");
  });
});
