import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Unit + integration tests only. Browser journeys live in tests/e2e and are
// run by Playwright (`npm run test:e2e`), which has its own runner — the
// exclude below keeps Vitest from trying to execute them.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    // Integration tests talk to the real Supabase project over the network,
    // so the default 5s timeout is too tight.
    testTimeout: 30_000,
    // Building a throwaway academy means several real round-trips to
    // Supabase before the first assertion runs.
    hookTimeout: 60_000,
    setupFiles: ["tests/setup.ts"],
  },
});
