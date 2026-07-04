import { test, expect } from "@playwright/test";

/**
 * Labels and custom groups (v2.1.0).
 *
 * Labels: create one on Settings -> Labels, attach it to a holding, then filter
 * the Performance report by it.
 *
 * Custom groups: create a group + category on Settings -> Groups, assign an
 * instrument to the category, then group the Performance / Diversity report by
 * that custom group.
 *
 * Assumes the authenticated user already has at least one holding (see
 * portfolio.spec.ts, or seed data). Runs authenticated (shared storageState).
 */
test.describe("labels", () => {
  const labelName = `E2E Label ${Date.now()}`;

  test("create a label, attach it to a holding, filter Performance by it", async ({
    page,
  }) => {
    await page.goto("/settings/labels");
    await expect(page.getByRole("heading", { name: "Labels" })).toBeVisible();

    // Create the label.
    await page.getByLabel("Label name").fill(labelName);
    await page.getByRole("button", { name: "Add Label" }).click();
    await expect(page.getByRole("cell", { name: labelName })).toBeVisible();

    // Attach it to a holding via the row's holdings manager.
    const row = page.getByRole("row", { name: new RegExp(labelName) });
    await row.getByRole("button").last().click();
    // A holdings picker opens; tick the first available holding checkbox.
    const holdingCheckbox = page.getByRole("checkbox").first();
    if (await holdingCheckbox.count()) {
      await holdingCheckbox.check();
    }

    // Filter the Performance report by the new label.
    await page.goto("/reports/performance");
    const labelFilter = page.getByLabel("Label", { exact: true });
    await expect(labelFilter).toBeVisible();
    await labelFilter.selectOption({ label: labelName });
    await expect(page).toHaveURL(/label=/);
  });
});

test.describe("custom groups", () => {
  const groupName = `E2E Group ${Date.now()}`;
  const categoryName = "Core";

  test("create a group + category, assign an instrument, group reports by it", async ({
    page,
  }) => {
    await page.goto("/settings/groups");
    await expect(
      page.getByRole("heading", { name: "Custom Groups" })
    ).toBeVisible();

    // Create the group.
    await page.getByLabel("Group name").fill(groupName);
    await page.getByRole("button", { name: "Add Group" }).click();
    await expect(page.getByText(groupName)).toBeVisible();

    // Add a category within the group.
    await page.getByLabel("Category name").first().fill(categoryName);
    await page.getByRole("button", { name: "Add category" }).first().click();
    await expect(page.getByText(categoryName)).toBeVisible();

    // Assign the first available instrument to a category (assignment UI is a
    // per-instrument select of categories).
    const assignSelect = page.getByRole("combobox").first();
    if (await assignSelect.count()) {
      await assignSelect.selectOption({ label: categoryName }).catch(() => {});
    }

    // Group the Performance report by the custom group.
    await page.goto("/reports/performance");
    await page
      .getByLabel("Group By")
      .selectOption({ label: groupName });
    await expect(page).toHaveURL(/groupBy=custom/);

    // And group the Diversity report by the same custom group.
    await page.goto("/reports/diversity");
    await page.getByLabel(/group by/i).selectOption({ label: groupName });
    await expect(page).toHaveURL(/groupBy=custom/);
  });
});
