import { test, expect } from "@playwright/test";
import { openSeededPortfolio } from "./helpers";

/**
 * Delisted holding (read-only, v2.1.x).
 *
 * The seeded APT (Afterpay Limited) holding has InstrumentInfo.quoteType =
 * "DELISTED", frozen at its last traded price (66.42, delisted 02 Feb 2022),
 * with a single 2018 BUY and no sell. Its holding detail page therefore shows
 * the "Delisted" control in the "Yes" state (the DelistedToggle switch is
 * aria-checked, and the adjacent label reads "Yes").
 *
 * READ-ONLY: the delisted toggle is only INSPECTED, never clicked (clicking it
 * off would mutate shared seed state and hit a live enrichment fetch). Runs
 * authenticated (shared storageState = test@investalens.dev).
 */
test.describe("delisted holding (seeded)", () => {
  test("the APT holding shows as delisted and values at the frozen price", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await openSeededPortfolio(page);

    // The APT row in the (server-rendered) holdings table values at the frozen
    // last-traded price of $66.42 — the price never moves post-delisting.
    const aptRow = page.getByRole("row", { name: /APT/ }).first();
    await expect(aptRow.getByText("$66.42")).toBeVisible();

    // Open the APT holding (its code links to the holding detail; the code can
    // appear more than once — holdings table + performers list — so take first).
    await page.getByRole("link", { name: "APT", exact: true }).first().click();
    await page.waitForURL(/\/holdings\/[a-z0-9]+/i);

    // Header confirms we're on the APT (Afterpay) holding.
    await expect(page.getByRole("heading", { name: "APT" })).toBeVisible();
    await expect(page.getByText(/Afterpay Limited/)).toBeVisible();

    // The Holding Summary shows a "Delisted" field: the toggle switch is checked
    // (driven by InstrumentInfo.quoteType === "DELISTED") and the label reads
    // "Yes". The label is INSPECTED only, never toggled off.
    const delistedSwitch = page.getByRole("switch", {
      name: "Delisted Status",
    });
    await expect(delistedSwitch).toBeVisible();
    await expect(delistedSwitch).toHaveAttribute("aria-checked", "true");

    // The adjacent label reads "Yes" (as opposed to "No" for active holdings).
    const delistedSection = page
      .locator("div")
      .filter({ has: page.getByRole("switch", { name: "Delisted Status" }) })
      .last();
    await expect(delistedSection.getByText("Yes", { exact: true })).toBeVisible();
  });
});
