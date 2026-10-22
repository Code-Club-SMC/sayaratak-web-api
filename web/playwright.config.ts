import { defineConfig } from "@playwright/test"

// End-to-end tests run against the production build on port 3100 (3000 is the dev server).
const port = 3100

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  workers: 4,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${port}`,
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chrome" }],
  webServer: {
    command: `bun run build && PORT=${port} API_BASE_URL=http://localhost:${port} bun run start`,
    url: `http://localhost:${port}/ar`,
    reuseExistingServer: true,
    timeout: 600_000,
  },
})
