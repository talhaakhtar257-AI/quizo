import { GoogleGenerativeAI } from "@google/generative-ai";

// gemini-2.0-flash and gemini-2.5-flash are retired — see CLAUDE.md.
export const GEMINI_MODEL = "gemini-3.6-flash";

// Settings save flow needs to know a key actually works before storing it
// (docs/API-ROUTES.md: "Validate key with a test API call → encrypt →
// store"). A trivial one-token prompt is enough to prove the key is real
// and the model name resolves, without spending a meaningful amount of the
// academy's free-tier quota. Full question-generation prompting is built
// in Phase H on top of this same client setup.
export async function validateGeminiKey(
  apiKey: string
): Promise<{ valid: true } | { valid: false; reason: string }> {
  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: GEMINI_MODEL });
    await model.generateContent("Reply with the single word: ok");
    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("API_KEY_INVALID") || message.includes("API key not valid")) {
      return { valid: false, reason: "That doesn't look like a valid Gemini API key." };
    }
    if (message.includes("429") || message.toLowerCase().includes("quota")) {
      // The key IS valid — it's just rate-limited right now. Don't block
      // saving a real key over a transient quota hiccup.
      return { valid: true };
    }
    return {
      valid: false,
      reason: "Could not verify this key with Google right now. Please try again.",
    };
  }
}
