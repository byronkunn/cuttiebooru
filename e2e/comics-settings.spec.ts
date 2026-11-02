import { expect, test } from "@playwright/test";
import path from "node:path";

const asset = (...parts: string[]) => path.join(process.cwd(), "sfw", ...parts);

async function registerUser(page: import("@playwright/test").Page) {
  const username = `e2e_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`;
  const response = await page.request.post("/api/account", {
    data: { mode: "register", username, password: "test-password-1234", displayName: "E2E Creator" },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return username;
}

test.describe("comics and account settings", () => {
  test("creates a manga series and publishes a chapter using sfw image fixtures", async ({ page }) => {
    const username = await registerUser(page);
    const title = `E2E Manga ${Date.now()}`;
    await page.goto("/comics");
    await page.getByRole("button", { name: "Creator Studio" }).click();
    await page.getByRole("button", { name: "Create New Series" }).click();

    await page.getByPlaceholder("e.g. Succubus After Dark").fill(title);
    await page.getByPlaceholder("Synopsis, premise, characters, and notes...").fill("Created by the Playwright end-to-end suite.");
    await page.locator("select").nth(0).selectOption("rtl");
    await page.locator("select").nth(1).selectOption("ongoing");
    await page.getByPlaceholder("Ecchi, Fantasy, Romance").fill("Fantasy, Action");
    await page.getByPlaceholder("succubus, lingerie, 18+").fill("e2e, test_series");

    await page.locator('input[type="file"]').nth(0).setInputFiles(asset("image", "sample_a751377aaf675242a651fef9c7e2f5a6.jpg"));
    await expect(page.getByAltText("Cover preview")).toBeVisible();
    await page.locator("form").filter({ has: page.getByPlaceholder("e.g. Succubus After Dark") }).getByRole("button", { name: "Create Series", exact: true }).click();
    await expect(page.getByText(title, { exact: true })).toBeVisible();

    const seriesResponse = await page.request.get("/api/comics");
    const { series } = await seriesResponse.json();
    const createdSeries = series.find((item: { title: string }) => item.title === title);
    expect(createdSeries, "created series appears in API list").toBeTruthy();
    expect(createdSeries.creator.username).toBe(username);

    await page.getByRole("button", { name: "Upload Chapter", exact: true }).click();
    await page.getByPlaceholder("e.g. Chapter 1: The Awakening").fill("Chapter 1: Arrival");
    await page.locator('input[type="number"]').fill("1");
    await page.locator('input[type="file"]').nth(0).setInputFiles(asset("image", "sample_71987dc61241813e1fe10683a2d2e6ed.jpg"));
    await expect(page.getByText(/Pages \(1\)/)).toBeVisible();
    await page.getByRole("button", { name: "Publish Chapter Live" }).click();
    await expect(page.getByText("Chapter 1: Arrival", { exact: true })).toBeVisible();

    const detailResponse = await page.request.get(`/api/comics?id=${createdSeries.id}`);
    const detail = await detailResponse.json();
    expect(detail.series.chapters).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: "Chapter 1: Arrival", published: true, pages: [expect.objectContaining({ position: 0 })] }),
    ]));
  });

  test("saves profile, privacy, notification, and local display preferences", async ({ page }) => {
    await registerUser(page);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.getByPlaceholder("Your display name").fill("Settings E2E Artist");
    await page.locator("textarea").first().fill("Profile settings persisted by the browser suite.");

    await page.getByRole("button", { name: "Privacy and safety" }).click();
    await page.getByRole("radio", { name: /Allow messages only from people you follow/ }).check();
    // Exercise the privacy toggles by their accessible switch labels.
    await page.getByRole("switch").nth(0).click();

    await page.getByRole("button", { name: "Notifications" }).click();
    await page.getByRole("switch").first().click();

    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText(/settings have been saved successfully/i)).toBeVisible();
    const account = await (await page.request.get("/api/account")).json();
    expect(account.user.displayName).toBe("Settings E2E Artist");
    expect(account.user.bio).toBe("Profile settings persisted by the browser suite.");
    expect(account.user.allowDMs).toBe("followers");
    expect(account.user.privateProfile).toBe(true);
    expect(account.user.notifyFollows).toBe(false);

    await page.reload();
    await page.getByRole("button", { name: "Privacy and safety" }).click();
    await expect(page.getByRole("radio", { name: /Allow messages only from people you follow/ })).toBeChecked();
  });
});
