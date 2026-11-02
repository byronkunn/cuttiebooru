import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const themes = [
  { id: "amoled", name: "Midnight AMOLED", background: "rgb(0, 0, 0)", surface: "rgb(10, 10, 13)" },
  { id: "cyberpunk", name: "Cyberpunk Neon", background: "rgb(9, 10, 24)", surface: "rgb(17, 20, 42)" },
  { id: "matcha", name: "Zen Matcha", background: "rgb(10, 19, 15)", surface: "rgb(17, 31, 25)" },
  { id: "sunset", name: "Sunset Ember", background: "rgb(21, 13, 27)", surface: "rgb(34, 20, 45)" },
  { id: "sakura", name: "Sakura Blossom", background: "rgb(250, 247, 252)", surface: "rgb(243, 237, 247)" },
  { id: "dark", name: "Dark Charcoal", background: "rgb(15, 16, 22)", surface: "" },
];

for (const width of [320, 1440]) {
  test(`all appearance themes apply and persist at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    for (const theme of themes) {
      await page.getByTitle("Site Appearance & Themes", { exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Site Appearance", exact: true });
      await dialog.getByRole("button", { name: theme.name, exact: true }).click();
      await expect(dialog.getByRole("button", { name: theme.name, exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("body > div").first()).toHaveCSS("background-color", theme.background);
      if (theme.id !== "dark" && theme.id !== "sakura") {
        await expect(page.locator("header").first()).toHaveCSS("background-color", theme.surface);
      }
      if (theme.id === "sakura") {
        await expect(dialog).toHaveCSS("background-color", theme.surface);
        await expect(dialog.getByRole("heading")).toHaveCSS("color", "rgb(15, 23, 42)");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await dialog.getByRole("button", { name: "Done", exact: true }).click();
      expect(await page.evaluate(() => localStorage.getItem("cuttiebooru-theme"))).toBe(theme.id);
      await page.reload();
      await expect(page.locator("body")).toHaveClass(new RegExp(`theme-${theme.id}`));
      await expect(page.locator("body > div").first()).toHaveCSS("background-color", theme.background);
      await page.goto("/comics");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body > div").first()).toHaveCSS("background-color", theme.background);
      await page.getByTitle("Site Appearance & Themes", { exact: true }).click();
      await expect(page.getByRole("button", { name: theme.name, exact: true })).toHaveAttribute("aria-pressed", "true");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    }
  });
}

test("appearance keyboard controls and storage failure are explicit", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTitle("Site Appearance & Themes", { exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Site Appearance", exact: true });
  await dialog.getByRole("button", { name: "Zen Matcha", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("body")).toHaveClass(/theme-matcha/);
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "cuttiebooru-theme") throw new DOMException("Blocked", "SecurityError");
      setItem.call(this, key, value);
    };
  });
  await dialog.getByRole("button", { name: "Sunset Ember", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("could not save");
  await expect(page.locator("body > div").first()).toHaveCSS("background-color", "rgb(21, 13, 27)");
});

test("messenger theme toggle updates the saved site preference", async ({ browser, baseURL }) => {
    const prisma = new PrismaClient();
    const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
    let userId = "";
    try {
      const registration = await context.request.post("/api/account", {
        data: { mode: "register", username: `theme_${randomUUID().slice(0, 8)}`, password: `Test-${randomUUID()}` },
      });
      expect(registration.ok()).toBe(true);
      userId = (await registration.json()).user.id;
      const page = await context.newPage();
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.locator("aside").getByRole("button", { name: "Messages", exact: true }).click();
      const accountLink = page.getByRole("link", { name: "Sign in or switch account", exact: true });
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(accountLink.locator("img")).toBeVisible();
        await expect(accountLink.locator("span")).toBeVisible();
        await expect(accountLink).not.toContainText("Switch Account");
        await expect(accountLink).toHaveAttribute("href", "/signin");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.getByTitle("Toggle Dark / Light Messenger Theme", { exact: true }).click();
      await expect(page.locator("body")).toHaveClass(/theme-sakura/);
      expect(await page.evaluate(() => localStorage.getItem("cuttiebooru-theme"))).toBe("sakura");
      await page.goto("/");
      await expect(page.locator("body > div").first()).toHaveCSS("background-color", "rgb(250, 247, 252)");
      await page.locator("aside").getByRole("button", { name: "Messages", exact: true }).click();
      await page.getByTitle("Toggle Dark / Light Messenger Theme", { exact: true }).click();
      await expect(page.locator("body")).toHaveClass(/theme-dark/);
      expect(await page.evaluate(() => localStorage.getItem("cuttiebooru-theme"))).toBe("dark");
    } finally {
      if (userId) await prisma.user.deleteMany({ where: { id: userId } });
      await context.close();
      await prisma.$disconnect();
    }
  });
