import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

test("admins publish, edit and remove announcements; visitors cannot change them", async ({ browser, baseURL }) => {
  const prisma = new PrismaClient();
  const admin = await browser.newContext({ baseURL, viewport: { width: 375, height: 667 } });
  const visitor = await browser.newContext({ baseURL });
  let userId = "";
  const original = await prisma.siteSetting.findUnique({ where: { id: "global" } });
  const banner = original?.announcementBanner || "";
  try {
    const registration = await admin.request.post("/api/account", {
      data: { mode: "register", username: `notice_${randomUUID().slice(0, 8)}`, password: `Test-${randomUUID()}` },
    });
    expect(registration.ok()).toBeTruthy();
    userId = (await registration.json()).user.id;
    const denied = await admin.request.post("/api/admin", {
      data: { action: "update_settings", announcementBanner: "Unauthorized" },
    });
    expect(denied.status()).toBe(403);
    const anonymous = await visitor.request.post("/api/admin", {
      data: { action: "update_settings", announcementBanner: "Unauthorized" },
    });
    expect(anonymous.status()).toBe(401);
    await prisma.user.update({ where: { id: userId }, data: { role: "admin" } });
    const invalid = await admin.request.post("/api/admin", {
      data: { action: "update_settings", announcementBanner: JSON.stringify({
        title: "Unsafe link", message: "Notice", linkUrl: "javascript:alert(1)",
      }) },
    });
    expect(invalid.status()).toBe(400);
    const oversized = await admin.request.post("/api/admin", {
      data: { action: "update_settings", announcementBanner: JSON.stringify({ message: "a".repeat(5001) }) },
    });
    expect(oversized.status()).toBe(400);
    const page = await admin.newPage();
    await page.goto("/admin");
    await page.getByRole("button", { name: "Open admin navigation" }).click();
    await page.locator("aside").getByRole("button", { name: "Announcements", exact: true }).click();
    const title = `Site update ${randomUUID().slice(0, 8)}`;
    await page.getByLabel("Announcement title").fill(title);
    await page.getByLabel("Announcement message").fill("New features are available.\nThanks for visiting!");
    await page.getByLabel("Action link (optional)").fill("/comics");
    await page.getByLabel("Button label (optional)").fill("Read comics");
    await page.getByRole("button", { name: "Publish Announcement" }).click();
    await expect(page.getByRole("status")).toContainText("Announcement published");
    const publicPage = await visitor.newPage();
    await publicPage.goto("/");
    await expect(publicPage.getByText(title, { exact: true })).toBeVisible();
    await expect(publicPage.getByRole("link", { name: "Read comics", exact: true })).toHaveAttribute("href", "/comics");
    await publicPage.getByRole("button", { name: "Dismiss Announcement", exact: true }).click();
    await expect(publicPage.getByText(title, { exact: true })).toHaveCount(0);
    await publicPage.reload();
    await publicPage.waitForLoadState("networkidle");
    await expect(publicPage.getByText(title, { exact: true })).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Dismiss Announcement", exact: true }).click();
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Open admin navigation" }).click();
    await page.locator("aside").getByRole("button", { name: "Announcements", exact: true }).click();
    await expect(page.getByLabel("Announcement title")).toHaveValue(title);
    await page.getByLabel("Announcement title").fill(`${title} revised`);
    await expect(page.getByLabel("Announcement title")).toHaveValue(`${title} revised`);
    await page.getByRole("button", { name: "Publish Announcement" }).click();
    await expect(page.getByRole("status")).toContainText("Announcement published");
    await publicPage.reload();
    await expect(publicPage.getByText(`${title} revised`, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Remove Announcement" }).click();
    await expect(page.getByRole("status")).toContainText("Announcement removed");
    await publicPage.reload();
    await expect(publicPage.getByText("Community Notice", { exact: true })).toBeVisible();
  } finally {
    await prisma.siteSetting.updateMany({ where: { id: "global" }, data: { announcementBanner: banner } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await admin.close();
    await visitor.close();
    await prisma.$disconnect();
  }
});

for (const width of [320, 1440]) {
  test(`announcement dismissal persists in browser at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 800 });
    let banner = "Legacy announcement fixture";
    await context.route("**/api/bootstrap?*", async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      await route.fulfill({ json: { ...data, announcementBanner: banner } });
    });
    await context.route("**/api/posts?*", (route) =>
      route.fulfill({ json: { posts: [], total: 0, totalPages: 1 } }));
    await page.goto("/");
    await expect(page.getByText(banner, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Dismiss Announcement", exact: true }).click();
    await expect(page.getByText(banner, { exact: true })).toHaveCount(0);
    const anotherPage = await context.newPage();
    await anotherPage.goto("/");
    await anotherPage.waitForLoadState("networkidle");
    await expect(anotherPage.getByText(banner, { exact: true })).toHaveCount(0);
    banner = "";
    await page.reload();
    await expect(page.getByText("Community Notice", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Dismiss Announcement", exact: true }).click();
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Community Notice", { exact: true })).toHaveCount(0);
    banner = JSON.stringify({ title: "New notice", message: "New update", updatedAt: "version-1" });
    await page.reload();
    await expect(page.getByText("New notice", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Dismiss Announcement", exact: true }).click();
    banner = JSON.stringify({ title: "New notice", message: "New update", updatedAt: "version-2" });
    await page.reload();
    await expect(page.getByText("New notice", { exact: true })).toBeVisible();
  });
}
