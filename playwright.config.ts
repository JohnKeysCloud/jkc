import { defineConfig, devices } from "@playwright/test";

const PORT = 3300;

/**
 * Builds the site against `e2e/fixtures/instagram` rather than the real
 * archive, so the suite never needs Instagram or real media. That build
 * replaces `.next`; run `npm run build` again before `npm start`.
 */
export default defineConfig({
  testDir: "e2e",
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    env: { INSTAGRAM_CONTENT_DIR: "e2e/fixtures/instagram" },
    url: `http://localhost:${PORT}/gallery`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
