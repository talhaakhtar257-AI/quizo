import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, randomCode } from "@/lib/random-code";

// These codes are keys. An invite code lets a stranger join an academy; a
// certificate number lets a stranger read a student's name and score off the
// public verification page. Both used to come from Math.random(), and the
// certificate number used only five digits — a space small enough to list in
// full.

describe("randomCode", () => {
  it("returns exactly the requested length", () => {
    for (const length of [1, 4, 8, 10, 32]) {
      expect(randomCode(length)).toHaveLength(length);
    }
  });

  it("never emits a character people misread", () => {
    const draws = Array.from({ length: 500 }, () => randomCode(12)).join("");
    expect(draws).not.toMatch(/[01OIL]/);
    for (const character of draws) {
      expect(CODE_ALPHABET).toContain(character);
    }
  });

  it("does not repeat itself", () => {
    const codes = new Set(Array.from({ length: 5000 }, () => randomCode(10)));
    expect(codes.size).toBe(5000);
  });

  it("spreads evenly across the alphabet rather than favouring the start", () => {
    // 31 characters do not divide 256 evenly. A naive `byte % 31` would make
    // the first eight letters roughly 25% more likely than the rest, which is
    // exactly the kind of bias that shrinks a key space quietly.
    const counts = new Map<string, number>();
    const total = 31 * 2000;
    for (const character of randomCode(total)) {
      counts.set(character, (counts.get(character) ?? 0) + 1);
    }

    expect(counts.size).toBe(CODE_ALPHABET.length);
    const expected = total / CODE_ALPHABET.length;
    for (const [character, count] of counts) {
      // Generous bounds — this is checking for a systematic 25% skew, not
      // proving randomness, and a flaky test helps nobody.
      expect(count, `${character} appeared ${count} times`).toBeGreaterThan(expected * 0.85);
      expect(count, `${character} appeared ${count} times`).toBeLessThan(expected * 1.15);
    }
  });
});
