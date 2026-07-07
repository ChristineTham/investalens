import { test, expect } from "@playwright/test";
import { PRIMARY_USER } from "./helpers";

/**
 * Authentication flows (v2.1.x).
 *
 * Documents: signing in with the standing seeded user, rejecting invalid
 * credentials, signing out, the register page's client-side password-match
 * validation (which does NOT persist a user), and that "Continue with Google"
 * is offered on the login page only.
 *
 * These exercise the unauthenticated entry points, so they run WITHOUT the
 * shared storageState. NO account is registered/persisted here — the valid
 * login uses the pre-seeded test user.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("authentication", () => {
  test("sign-in with valid credentials lands on /portfolio", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();

    await page.getByLabel("Email").fill(PRIMARY_USER.email);
    await page.getByLabel("Password").fill(PRIMARY_USER.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    // On success the client navigates to /portfolio; on a transient CSRF race it
    // stays on /login with an alert — retry once.
    const landed = await page
      .waitForURL(/\/portfolio/, { timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (!landed) {
      await page.getByLabel("Email").fill(PRIMARY_USER.email);
      await page.getByLabel("Password").fill(PRIMARY_USER.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.waitForURL(/\/portfolio/, { timeout: 15000 });
    }
    await expect(page).toHaveURL(/\/portfolio/);
  });

  test("invalid credentials show an error and stay on /login", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@investalens.test");
    await page.getByLabel("Password").fill("wrong-Password-123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Invalid email or password" })
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("log out from the dashboard returns to /login", async ({ page }) => {
    // Sign in as the seeded user, then sign out.
    await page.goto("/login");
    await page.getByLabel("Email").fill(PRIMARY_USER.email);
    await page.getByLabel("Password").fill(PRIMARY_USER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/portfolio/, { timeout: 15000 });

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("mismatched passwords are rejected before submitting (no user persisted)", async ({
    page,
  }) => {
    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: "Create an account" })
    ).toBeVisible();

    await page.getByLabel("Name").fill("Mismatch");
    await page
      .getByLabel("Email")
      .fill(`e2e.mismatch.${Date.now()}@investalens.test`);
    await page.getByLabel("Password", { exact: true }).fill("e2e-Password-123");
    await page.getByLabel("Confirm Password").fill("different-Password-123");
    await page.getByRole("button", { name: "Create account" }).click();

    // Client-side validation blocks the submit — no server call, no user row.
    await expect(
      page.getByRole("alert").filter({ hasText: "Passwords do not match" })
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test("Google sign-in is offered on login but not on register", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Google" })).toBeVisible();
    await expect(page.getByText("Or continue with")).toBeVisible();

    await page.goto("/register");
    await expect(page.getByRole("button", { name: "Google" })).toHaveCount(0);
  });
});
