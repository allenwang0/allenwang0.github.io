import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4321", reducedMotion: "reduce" },
  webServer: {
    command: "npx astro preview --port 4321 --ignore-lock",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
});
