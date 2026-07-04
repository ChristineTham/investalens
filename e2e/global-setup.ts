import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Global authentication setup.
 *
 * Registers (or reuses) a primary test user through the real /register UI and
 * saves the resulting NextAuth session to storageState, so every authenticated
 * spec starts already logged in. Wired into playwright.config.ts as the "setup"
 * project that the browser projects depend on.
 *
 * Requirements to run: a built app served on baseURL AND a reachable Postgres
 * (Prisma) database. If either is missing, the assertions below fail with a
 * clear message — that failure is EXPECTED in a CI-less / DB-less dev
 * environment and simply means the suite cannot run there.
 */

const AUTH_DIR = path.join(__dirname, ".auth");
const USER_FILE = path.join(AUTH_DIR, "user.json");

// Stable credentials so re-runs reuse the same user. Override via env to run
// against a shared/remote database without colliding with other users.
export const PRIMARY_USER = {
  name: process.env.E2E_USER_NAME ?? "E2E Primary",
  email: process.env.E2E_USER_EMAIL ?? "e2e.primary@investalens.test",
  password: process.env.E2E_USER_PASSWORD ?? "e2e-Password-123",
};

setup("authenticate primary user", async ({ page, baseURL }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Confirm the app is reachable before anything else, so a missing
  // server/DB produces an obvious failure rather than a cryptic timeout.
  const response = await page.goto("/login").catch((err: unknown) => {
    throw new Error(
      `Could not reach the app at ${baseURL}. A built app (npm run build && ` +
        `npm run start) and a reachable Postgres database are required to run ` +
        `the e2e suite. Original error: ${String(err)}`
    );
  });
  expect(
    response,
    `No HTTP response from ${baseURL}/login — is the app running?`
  ).toBeTruthy();

  // Try logging in first (user may already exist from a previous run).
  await page.getByLabel("Email").fill(PRIMARY_USER.email);
  await page.getByLabel("Password").fill(PRIMARY_USER.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Successful sign-in redirects to /portfolio. If credentials are rejected
  // (first run — user doesn't exist yet) an inline alert appears instead.
  // waitUntil "commit" resolves on the URL change without waiting for the
  // dashboard to finish compiling (dev-mode first compile can be slow), so a
  // valid login isn't misread as a failure.
  const signedIn = await page
    .waitForURL("**/portfolio", { timeout: 30000, waitUntil: "commit" })
    .then(() => true)
    .catch(() => false);

  if (!signedIn) {
    // Register the user via the UI; the register server action auto-signs-in
    // and redirects to /portfolio.
    await page.goto("/register");
    await page.getByLabel("Name").fill(PRIMARY_USER.name);
    await page.getByLabel("Email").fill(PRIMARY_USER.email);
    await page.getByLabel("Password", { exact: true }).fill(PRIMARY_USER.password);
    await page.getByLabel("Confirm Password").fill(PRIMARY_USER.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/portfolio", { timeout: 30000, waitUntil: "commit" });
  }

  await expect(page).toHaveURL(/\/portfolio/, { timeout: 15000 });
  await page.context().storageState({ path: USER_FILE });
});
