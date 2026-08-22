import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:5173",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "npm run start",
      cwd: ".",
      env: { PORT: "3000", DB_PATH: "data/marginalia-e2e.sqlite" },
      port: 3000,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev",
      cwd: "web",
      port: 5173,
      reuseExistingServer: false,
    },
  ],
});
