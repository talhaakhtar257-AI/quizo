import { randomCode } from "./random-code";

// 8 uppercase alphanumeric characters, formatted XXXX-XXXX, excluding
// characters students commonly misread for each other when copying a code
// by hand off a whiteboard: 0/O, 1/I/L. Per docs/FEATURES.md §2.
//
// An invite code is a key — whoever holds one can sign up as a student of
// that course — so the characters come from the cryptographic random source,
// not `Math.random()`.
export function generateInviteCode(): string {
  const code = randomCode(8);
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
