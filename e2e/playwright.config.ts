import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",

  // The in-memory backend is shared state across tests, so the suite must
  // not run in parallel. Tests use unique guest emails so they don't collide
  // semantically, but a single worker keeps the slot timeline predictable.
  fullyParallel: false,
  workers: 1,

  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",

  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Spawn the full stack before tests run. Backend boots first; once both
  // ports respond, Playwright begins. Locally, an already-running stack is
  // reused (so iteration is fast); in CI both are started fresh.
  webServer: [
    {
      command: "mvn -B -ntp -DskipTests spring-boot:run",
      cwd: "../backend",
      url: "http://localhost:8081/admin/event-types",
      reuseExistingServer: !isCI,
      timeout: 180_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: "npm run serve",
      cwd: "../frontend",
      url: "http://localhost:8080/index.html",
      reuseExistingServer: !isCI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
