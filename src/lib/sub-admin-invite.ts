import { randomBytes } from "crypto";

// URL-safe, 32 bytes of randomness — this token is the entire secret in a
// sub-admin invite link (docs/FEATURES.md §12), so it needs to be
// unguessable, unlike the short human-typed course invite codes.
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}
