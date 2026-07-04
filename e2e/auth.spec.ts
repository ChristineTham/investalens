import { test, expect } from "@playwright/test";

/**
 * Authentication flows (v2.1.0).
 *
 * Documents: registering a new user, signing in, signing out, that a
 * successful sign-in lands on /portfolio, and that the "Continue with Google"
 * button is offered on the login page only (not on register).
 *
 * These tests exercise the unauthenticated entry points, so they run WITHOUT
 * the shared storageState.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("authentication", () => {
  test("register creates an account and lands on /portfolio", async ({
    page,
  }) => {
    // Unique email per run so registration always succeeds.
    const email = `e2e.register.${Date.now()}@investalens.test`;

    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: "Create an account" })
    ).toBeVisible();

    await page.getByLabel("Name").fill("Register Flow");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("e2e-Password-123");
    await page.getByLabel("Confirm Password").fill("e2e-Password-123");
    await page.getByRole("button", { name: "Create account" }).click();

    // The register server action signs the user in and redirects.
    await expect(page).toHaveURL(/\/portfolio/);
  });

  test("mismatched passwords are rejected before submitting", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Mismatch");
    await page.getByLabel("Email").fill(`e2e.mismatch.${Date.now()}@investalens.test`);
    await page.getByLabel("Password", { exact: true }).fill("e2e-Password-123");
    await page.getByLabel("Confirm Password").fill("different-Password-123");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Passwords do not match" })
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test("sign-in with valid credentials lands on /portfolio", async ({
    page,
  }) => {
    // Register a fresh user, sign out, then sign back in through /login.
    const email = `e2e.login.${Date.now()}@investalens.test`;
    const password = "e2e-Password-123";

    await page.goto("/register");
    await page.getByLabel("Name").fill("Login Flow");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/portfolio/);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);

    // Wait for the login page (and its next-auth CSRF setup) to be ready before
    // submitting, otherwise the credentials sign-in can race the session reset.
    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    // On success the client does window.location.href = "/portfolio"; on a
    // transient CSRF race it stays on /login with an alert — retry once.
    const landed = await page
      .waitForURL(/\/portfolio/, { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (!landed) {
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.waitForURL(/\/portfolio/, { timeout: 10000 });
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
    const email = `e2e.logout.${Date.now()}@investalens.test`;
    const password = "e2e-Password-123";

    await page.goto("/register");
    await page.getByLabel("Name").fill("Logout Flow");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/portfolio/);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
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
