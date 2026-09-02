import { config } from "dotenv";

// Tests read the same .env.local the dev server uses. Nothing here is
// committed — .env.local is gitignored — so in CI these come from GitHub
// Actions secrets instead, and the integration tests skip themselves when
// the Supabase variables are absent.
config({ path: ".env.local", quiet: true });

// crypto round-trip tests need *a* key, not the real one. Only filled in
// when the environment doesn't already have one (i.e. in CI).
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
}
