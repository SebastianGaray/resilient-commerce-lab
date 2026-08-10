import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:4321/resilient-commerce-lab/en/",
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://127.0.0.1:4321/resilient-commerce-lab/",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
    { name: "mobile-320", use: { viewport: { width: 320, height: 720 } } },
  ],
});
