import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

for (const width of [320, 1440]) {
  test(`report previews stay in admin at ${width}px`, async ({ browser, baseURL }) => {
    const prisma = new PrismaClient();
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } });
    let userId = "";
    let reportId = "";
    let postId = "";
    try {
      const registration = await context.request.post("/api/account", {
        data: { mode: "register", username: `review_${randomUUID().slice(0, 8)}`, password: `Test-${randomUUID()}` },
      });
      expect(registration.ok()).toBeTruthy();
      userId = (await registration.json()).user.id;
      await prisma.user.update({ where: { id: userId }, data: { role: "admin" } });
      const post = await prisma.post.create({ data: {
        title: `Reported fixture ${randomUUID().slice(0, 8)}`, description: "Details needed for moderation",
        mediaUrl: "/sfw/image/review_fixture.png", thumbnailUrl: "/sfw/image/review_fixture.png",
        galleryUrls: JSON.stringify(["/sfw/image/review_fixture.png", "/sfw/video/review_fixture.webm"]),
        mediaType: "image", creatorId: userId, uploaderId: userId, attribution: "Credited artist",
        sourceUrl: "https://example.com/art", rating: "sfw", permissionConfirmed: true,
      } });
      postId = post.id;
      reportId = (await prisma.report.create({ data: {
        postId, reporterId: userId, reason: "attribution_missing", details: "Please review this credit",
      } })).id;
      const page = await context.newPage();
      await page.route("**/sfw/image/review_fixture.png", (route) => route.fulfill({
        contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64"),
      }));
      await page.goto("/admin");
      if (width < 1024) await page.getByRole("button", { name: "Open admin navigation" }).click();
      await page.locator("aside").getByRole("button", { name: /Reports & Moderation/ }).click();
      const row = page.locator("div.py-4").filter({ hasText: post.title });
      await row.getByText("View reported post", { exact: true }).click();
      await expect(row.getByRole("img", { name: post.title })).toBeVisible();
      await expect(row.getByText("Artist credit: Credited artist")).toBeVisible();
      await expect(row.getByText(post.description)).toBeVisible();
      await expect(row.getByRole("link", { name: "Original source (opens new tab)" })).toHaveAttribute("target", "_blank");
      await expect(page).toHaveURL(/\/admin$/);
      await row.getByRole("button", { name: "Next file" }).click();
      await expect(row.locator("video")).toBeVisible();
      await expect(row.getByText("File 2 of 2")).toBeVisible();
      await row.getByRole("button", { name: "Previous file" }).click();
      await expect(row.getByRole("img", { name: post.title })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
      await row.getByRole("button", { name: "Dismiss", exact: true }).click();
      await expect(row.getByText("dismissed", { exact: true })).toBeVisible();
      expect((await prisma.report.findUniqueOrThrow({ where: { id: reportId } })).status).toBe("dismissed");
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.getByRole("heading", { name: /Moderation & Reports Queue/ })).toBeVisible();
      await row.getByRole("button", { name: "Resolve", exact: true }).click();
      await expect(row.getByText("resolved", { exact: true })).toBeVisible();
      expect((await prisma.report.findUniqueOrThrow({ where: { id: reportId } })).status).toBe("resolved");
      await row.getByRole("button", { name: "Delete Post & Resolve", exact: true }).click();
      await expect(page.getByText("This post is no longer available.", { exact: true })).toBeVisible();
      expect(await prisma.post.findUnique({ where: { id: postId } })).toBeNull();
      await expect(page).toHaveURL(/\/admin$/);
    } finally {
      if (reportId) await prisma.report.deleteMany({ where: { id: reportId } });
      if (postId) await prisma.post.deleteMany({ where: { id: postId } });
      if (userId) await prisma.user.deleteMany({ where: { id: userId } });
      await context.close();
      await prisma.$disconnect();
    }
  });
}
