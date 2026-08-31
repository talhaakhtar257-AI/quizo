// 8 uppercase alphanumeric characters, formatted XXXX-XXXX, excluding
// characters students commonly misread for each other when copying a code
// by hand off a whiteboard: 0/O, 1/I/L. Per docs/FEATURES.md §2.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
