import { expect, test } from "@playwright/test";

for (const width of [375, 1440]) {
  test(`directory stages include/exclude until Go at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/bootstrap?*", async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      await route.fulfill({ json: {
        ...data,
        tags: ["stage_include", "stage_exclude"].map((name, index) => ({
          id: `stage_${index}`, name, displayName: name, category: "general",
          description: "Search staging fixture", usageCount: 0,
        })),
      } });
    });
    const searches: URLSearchParams[] = [];
    await page.route("**/api/posts?*", async (route) => {
      searches.push(new URL(route.request().url()).searchParams);
      await route.fulfill({ json: { posts: [], total: 0, totalPages: 1 } });
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    if (width < 1024) {
      await page.getByTitle("Open Navigation Menu").click();
      await page.locator("aside").filter({ hasText: "Cuttiebooru Navigation" })
        .getByRole("button", { name: "Tags Directory", exact: true }).click();
    } else {
      await page.locator("aside").getByRole("button", { name: "Tags & Search", exact: true }).click();
    }

    await expect(page.getByRole("heading", { name: /Booru Tag Directory/ })).toBeVisible();
    const includeCard = page.locator("div").filter({
      has: page.locator("span").filter({ hasText: /^#stage_include$/ }),
    }).filter({ has: page.getByRole("button", { name: "Include", exact: true }) }).last();
    const excludeCard = page.locator("div").filter({
      has: page.locator("span").filter({ hasText: /^#stage_exclude$/ }),
    }).filter({ has: page.getByRole("button", { name: "Exclude", exact: true }) }).last();
    const initialRequests = searches.length;
    await includeCard.getByRole("button", { name: "Include", exact: true }).click();
    await expect(page.locator("header").getByTitle("Remove #stage_include")).toBeVisible();
    await excludeCard.getByRole("button", { name: "Exclude", exact: true }).click();
    await expect(page.locator("header").getByTitle("Remove excluded #stage_exclude")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Booru Tag Directory/ })).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(searches.length).toBe(initialRequests);

    // A tag can be included or excluded, but never both.
    await includeCard.getByRole("button", { name: "Exclude", exact: true }).click();
    await expect(page.locator("header").getByTitle("Remove #stage_include")).toHaveCount(0);
    await includeCard.getByRole("button", { name: "Include", exact: true }).click();
    await expect(page.locator("header").getByTitle("Remove excluded #stage_include")).toHaveCount(0);
    await page.locator("header").getByRole("button", { name: "Go", exact: true }).click();
    await page.waitForLoadState("networkidle");
    expect(searches.at(-1)?.get("tags")).toBe("stage_include");
    expect(searches.at(-1)?.get("excludeTags")).toBe("stage_exclude");
    await expect(page.getByRole("heading", { name: /Booru Tag Directory/ })).toHaveCount(0);
    const appliedRequests = searches.length;
    await page.getByTitle("Remove excluded #stage_exclude").click();
    await page.waitForLoadState("networkidle");
    expect(searches.length).toBe(appliedRequests);
    await page.locator("header").getByRole("button", { name: "Go", exact: true }).click();
    await page.waitForLoadState("networkidle");
    expect(searches.at(-1)?.get("excludeTags")).toBe("");
    await page.getByTitle("Clear tags and search").click();
    await expect(page.locator("header").getByTitle("Remove #stage_include")).toHaveCount(0);
  });
}
