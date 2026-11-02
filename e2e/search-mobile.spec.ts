import { expect, test } from "@playwright/test";

for (const path of ["/", "/comics"]) {
  test(`global search parses multiple tags and keywords from ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const requests: URLSearchParams[] = [];
    await page.route("**/api/posts?*", async (route) => {
      requests.push(new URL(route.request().url()).searchParams);
      await route.fulfill({ json: { posts: [], total: 0, totalPages: 1 } });
    });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const input = page.getByRole("textbox", { name: "Search posts", exact: true });
    if (path !== "/") {
      await input.fill("discard");
      await page.getByRole("button", { name: "Clear search", exact: true }).click();
      await expect(input).toHaveValue("");
    }
    await input.fill("#LAYOUT #mobile -#exclude keywords #layout");
    await input.press("Enter");
    await expect(page.getByTitle("Remove #layout")).toBeVisible();
    await expect(page.getByTitle("Remove #mobile")).toBeVisible();
    await expect(page.getByTitle("Remove excluded #exclude")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search posts", exact: true })).toHaveValue("keywords");
    await page.waitForLoadState("networkidle");
    expect(requests.at(-1)?.get("tags")?.split(",").sort()).toEqual(["layout", "mobile"]);
    expect(requests.at(-1)?.get("excludeTags")).toBe("exclude");
    expect(requests.at(-1)?.get("q")).toBe("keywords");
    await page.getByRole("textbox", { name: "Search posts", exact: true }).fill("-#layout");
    await page.locator("header").getByRole("button", { name: "Go", exact: true }).click();
    await expect(page.getByTitle("Remove #layout")).toHaveCount(0);
    await expect(page.getByTitle("Remove excluded #layout")).toBeVisible();
    await page.waitForLoadState("networkidle");
    const count = requests.length;
    const homeInput = page.getByRole("textbox", { name: "Search posts", exact: true });
    for (let index = 0; index < 3; index++) await homeInput.press("Backspace");
    await expect(page.getByTitle("Remove #mobile")).toHaveCount(0);
    await expect(page.getByTitle("Remove excluded #exclude")).toHaveCount(0);
    await expect(page.getByTitle("Remove excluded #layout")).toHaveCount(0);
    expect(requests.length).toBe(count);
  });
}

for (const width of [320, 375, 390, 430, 667, 768, 1440]) {
  test(`many search tags keep controls usable at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: width === 667 ? 375 : 667 });
    const tags = Array.from({ length: 24 }, (_, index) => `search_tag_${index}`);
    const requests: URLSearchParams[] = [];
    await page.route("**/api/bootstrap?*", async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      await route.fulfill({ json: { ...data, tags: tags.map((name) => ({
        id: name, name, displayName: name, category: "general",
        description: "Search stress fixture", usageCount: 0,
      })) } });
    });
    await page.route("**/api/posts?*", async (route) => {
      requests.push(new URL(route.request().url()).searchParams);
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
    const filter = page.getByPlaceholder("Filter tags by name...");
    const initialRequests = requests.length;
    for (let index = 0; index < tags.length; index++) {
      const tag = tags[index];
      await filter.fill(tag);
      const card = page.locator("div").filter({
        has: page.locator("span").filter({ hasText: new RegExp(`^#${tag}$`) }),
      }).filter({ has: page.getByRole("button", { name: "Include", exact: true }) }).last();
      await card.getByRole("button", { name: index % 2 ? "Exclude" : "Include", exact: true }).click();
    }
    expect(requests.length).toBe(initialRequests);
    await page.screenshot({ path: testInfo.outputPath("many-tags.png") });
    const header = page.locator("header");
    const height = await header.evaluate((element) => element.getBoundingClientRect().height);
    console.log(`${width}px with 24 tags: header ${Math.round(height)}px`);
    expect.soft(height, "Selected tags must not take over the screen").toBeLessThanOrEqual(180);
    const input = header.getByRole("textbox");
    expect.soft((await input.boundingBox())?.width, "Keyword input remains usable").toBeGreaterThanOrEqual(100);
    await header.getByRole("button", { name: "Go", exact: true }).click();
    await page.waitForLoadState("networkidle");
    expect(requests.at(-1)?.get("tags")?.split(",")).toEqual(tags.filter((_, index) => index % 2 === 0));
    expect(requests.at(-1)?.get("excludeTags")?.split(",")).toEqual(tags.filter((_, index) => index % 2 === 1));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
