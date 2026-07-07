import { test, expect } from "@playwright/test";
import { SEEDED_PORTFOLIO } from "./helpers";

/**
 * Capital Gains Tax report — sale-allocation optimisation (v2.1.x).
 *
 * Toggling "Optimise" on the CGT report reveals a sale-allocation method
 * comparison table (FIFO / LIFO / etc.) with the optimal method flagged.
 * The seeded "Sample Growth Portfolio" has a REALISED disposal (a partial BHP
 * SELL in 2024 → long-term CGT), so the comparison renders with a row badged
 * "Optimal". Runs authenticated (shared storageState = test@investalens.dev).
 */
test.describe("CGT optimisation (seeded)", () => {
  test("toggling Optimise shows the method comparison with the optimal method flagged", async ({
    page,
  }) => {
    // /tax/cgt is a heavy route; its first-compile on a cold dev server can take
    // a while, leaving little of a 60s budget for the interactions below.
    test.setTimeout(120000);

    await page.goto("/tax/cgt");
    await expect(
      page.getByRole("heading", { name: "Capital Gains Tax" })
    ).toBeVisible({ timeout: 60000 });

    // Select the seeded portfolio — the comparison is only computed for a single
    // portfolio, and this one has realised disposals. Selecting drives a client
    // navigation that adds ?portfolio=<id>.
    const portfolioSelect = page.getByLabel("Portfolio:", { exact: true });
    await portfolioSelect.selectOption({ label: SEEDED_PORTFOLIO });
    await expect(page).toHaveURL(/portfolio=/, { timeout: 30000 });

    // The seeded BHP SELL is dated 2024-11-20 → Australian FY2024/25 (year=2025).
    // The report defaults to the current FY, which has no disposals, so pick the
    // year that contains the realised sale.
    await page.getByLabel("Tax Year:", { exact: true }).selectOption("2025");
    await expect(page).toHaveURL(/year=2025/, { timeout: 30000 });

    // Toggle "Optimise". It is a controlled checkbox that drives ?optimise=1 via
    // client navigation (router.push), which can race the just-completed
    // portfolio navigation, so click it and retry if the URL hasn't updated.
    const optimise = page.getByRole("checkbox", { name: /optimise/i });
    await expect(optimise).toBeVisible();
    for (let attempt = 0; attempt < 3; attempt++) {
      await optimise.click();
      const on = await page
        .waitForURL(/optimise=1/, { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (on) break;
      // The click may have toggled it back off (or been swallowed by a
      // concurrent navigation); re-sync before retrying.
      if (await optimise.isChecked()) await optimise.click().catch(() => {});
    }

    // The URL carries the optimise flag and the comparison section appears.
    await expect(page).toHaveURL(/optimise=1/);
    await expect(
      page.getByRole("heading", { name: "Sale-allocation method comparison" })
    ).toBeVisible();

    // The comparison table lists methods; the optimal one is badged "Optimal".
    // The seeded BHP disposal guarantees real CGT data, so the badge renders.
    await expect(page.getByText("Optimal", { exact: true })).toBeVisible({
      timeout: 30000,
    });
  });
});
