import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { PRIMARY_USER } from "./helpers";

/**
 * Global authentication setup.
 *
 * Logs in as the STANDING seeded test user (test@investalens.dev) through the
 * real /login UI and saves the resulting NextAuth session to storageState, so
 * every authenticated spec starts already logged in against the pre-seeded
 * "Sample Growth Portfolio". Wired into playwright.config.ts as the "setup"
 * project that the browser projects depend on.
 *
 * NO registration happens here — the user and its representative portfolio are
 * created out-of-band by scripts/seed-sample-portfolio.ts.
 *
 * Requirements to run: the app served on baseURL AND a reachable Postgres
 * (Prisma) database already seeded with the test user. If the app is
 * unreachable the reachability guard below fails with a clear message.
 */

const AUTH_DIR = path.join(__dirname, ".auth");
const USER_FILE = path.join(AUTH_DIR, "user.json");

setup("authenticate the standing test user", async ({ page, baseURL }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Confirm the app is reachable before anything else, so a missing
  // server/DB produces an obvious failure rather than a cryptic timeout.
  const response = await page.goto("/login").catch((err: unknown) => {
    throw new Error(
      `Could not reach the app at ${baseURL}. A running app (npm run dev) and ` +
        `a reachable Postgres database seeded with the test user are required ` +
        `to run the e2e suite. Original error: ${String(err)}`
    );
  });
  expect(
    response,
    `No HTTP response from ${baseURL}/login — is the app running?`
  ).toBeTruthy();

  // Log in as the existing seeded user. waitUntil "commit" resolves on the URL
  // change without waiting for the dashboard to finish compiling (dev-mode
  // first compile can be slow), so a valid login isn't misread as a failure.
  await page.getByLabel("Email").fill(PRIMARY_USER.email);
  await page.getByLabel("Password").fill(PRIMARY_USER.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("**/portfolio", {
    timeout: 30000,
    waitUntil: "commit",
  });

  await expect(page).toHaveURL(/\/portfolio/, { timeout: 15000 });
  await page.context().storageState({ path: USER_FILE });
});
