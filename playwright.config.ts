import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const PORT = 3100;

// Browser journeys only. Pure logic and RLS live in Vitest (`npm test`).
export default defineConfig({
  testDir: "./tests/e2e",
  // The tests share one live Supabase project, and several of them create
  // and tear down academies, so they run one at a time rather than racing.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  // Generous, deliberately. These tests run against the real Supabase free
  // tier, which is also the live database — it is not fast, and it gets
  // slower the more of the suite has already run. A page that takes 40
  // seconds to answer is a database under load, not a broken product, and a
  // suite that cries wolf about it is a suite people stop believing.
  timeout: 120_000,
  expect: { timeout: 25_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // A production build, because that is what the deployed site runs —
    // dev-mode hydration timing and error overlays hide real defects.
    command: `npx next build && npx next start --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
