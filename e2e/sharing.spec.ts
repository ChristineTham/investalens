import { test, expect } from "@playwright/test";
import { SEEDED_PORTFOLIO } from "./helpers";

/**
 * Portfolio sharing — owner side (v2.1.x).
 *
 * The owner shares the seeded "Sample Growth Portfolio" read-only with a fixed
 * viewer email, confirms the share is listed under "Shared by you", then
 * removes it again to clean up. No recipient user is created or logged in.
 *
 * This spec DOES mutate (creates then removes one share), so it uses a UNIQUE
 * recipient email per run to avoid colliding with concurrent workers, and it
 * scopes assertions/removal to that email only — it never touches the seed's
 * holdings. Runs authenticated (shared storageState = test@investalens.dev).
 */
test.describe("portfolio sharing (owner side)", () => {
  test("share the seeded portfolio read-only, see it listed, then remove it", async ({
    page,
  }) => {
    test.setTimeout(120000);

    // Unique per run so parallel workers don't fight over the same share row.
    const viewerEmail = `viewer.${Date.now()}.${Math.floor(
      Math.random() * 1e4
    )}@investalens.dev`;

    await page.goto("/settings/sharing");
    await expect(
      page.getByRole("heading", { name: "Portfolio Sharing" })
    ).toBeVisible();

    // --- Share read-only to the fixed viewer email ---
    await page
      .getByLabel("Portfolio to share")
      .selectOption({ label: SEEDED_PORTFOLIO });
    await page.getByLabel("Email address").fill(viewerEmail);
    await page.getByLabel("Access level").selectOption("read");
    // Exact match so this doesn't also resolve the "Remove share" buttons.
    await page.getByRole("button", { name: "Share", exact: true }).click();

    // The new share appears under "Shared by you".
    const shareRow = page
      .locator("div")
      .filter({ hasText: viewerEmail })
      .filter({ has: page.getByRole("button", { name: "Remove share" }) })
      .last();
    await expect(shareRow).toBeVisible();
    await expect(page.getByText(viewerEmail)).toBeVisible();

    // --- Clean up: remove the share (RemoveShareButton uses a confirm dialog) ---
    page.once("dialog", (d) => d.accept());
    await shareRow.getByRole("button", { name: "Remove share" }).click();

    // The share row for this email is gone.
    await expect(page.getByText(viewerEmail)).toHaveCount(0);
  });
});
