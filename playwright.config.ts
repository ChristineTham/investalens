import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`.
     * Point E2E_BASE_URL at an already-running instance (e.g. a preview
     * deployment) to test against it; otherwise the local webServer below
     * serves http://localhost:3000. */
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    /* Authenticates a test user once and writes storageState so the
     * authenticated specs below start already logged in. See e2e/global-setup.ts. */
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
    },

    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    /* Test against mobile viewports — the mobile-nav (a11y) spec needs a
     * phone-sized viewport to reveal the hamburger menu. */
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Boot a local DEV server for the tests and tear it down afterwards.
   *
   * Guarded so it ONLY starts when E2E_BASE_URL is unset — point the suite at
   * an external URL (e.g. a preview deployment) and nothing is booted locally.
   *
   * Dev mode (not `npm run start`) is deliberate: a production build sets
   * NextAuth's session cookie with the Secure flag, which browsers refuse to
   * send over plain http://localhost, so authenticated flows can't sign in.
   * `next dev` issues host-only, non-secure cookies that work over http.
   * The app still needs a reachable Postgres database (DATABASE_URL / Prisma).
   * The generous timeout covers dev first-compile. */
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
