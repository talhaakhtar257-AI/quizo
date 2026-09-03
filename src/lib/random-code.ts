// Codes that act as keys — a course invite code lets someone join an
// academy, a certificate number lets anyone fetch that certificate's public
// verification page — must be unguessable. `Math.random()` is not: it is a
// fast, predictable generator, and both of these were using it.
//
// `crypto.getRandomValues` is available on the global object in every
// runtime this project uses (Node on Vercel, and the edge runtime), so this
// needs no import and works everywhere.

// The same alphabet as the invite codes have always used: uppercase letters
// and digits with the pairs people misread when copying by hand removed —
// 0/O and 1/I/L. 31 characters.
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomCode(length: number, alphabet = CODE_ALPHABET): string {
  // 31 does not divide 256 evenly, so taking `byte % 31` would make the
  // first few letters slightly more likely than the rest. Bytes above the
  // largest whole multiple are thrown away and redrawn instead, which keeps
  // every character equally likely.
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  let code = "";

  while (code.length < length) {
    const bytes = new Uint8Array(length - code.length);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= limit) continue;
      code += alphabet[byte % alphabet.length];
      if (code.length === length) break;
    }
  }

  return code;
}
