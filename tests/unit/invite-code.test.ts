import { describe, expect, it } from "vitest";
import { generateInviteCode } from "@/lib/invite-code";

describe("generateInviteCode", () => {
  it("is always 8 characters formatted XXXX-XXXX", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateInviteCode()).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }
  });

  it("never uses characters students misread off a whiteboard", () => {
    // 0/O and 1/I/L are excluded on purpose (docs/FEATURES.md §2).
    for (let i = 0; i < 500; i++) {
      expect(generateInviteCode()).not.toMatch(/[01OIL]/);
    }
  });

  it("does not collide over a realistic number of codes", () => {
    const codes = new Set(Array.from({ length: 2000 }, generateInviteCode));
    // 31^8 ≈ 850 billion combinations; 2000 draws colliding would mean the
    // randomness is broken, not bad luck.
    expect(codes.size).toBe(2000);
  });
});
