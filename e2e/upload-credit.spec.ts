import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

for (const width of [320, 1440]) {
  test(`upload preserves source and artist credit at ${width}px`, async ({ page, request }) => {
    const prisma = new PrismaClient();
    let userId = "";
    const tag = `credit_${randomUUID().slice(0, 8)}`;
    try {
      const registration = await request.post("/api/account", { data: {
        mode: "register", username: tag, password: `Test-${randomUUID()}`,
      } });
      expect(registration.ok()).toBe(true);
      userId = (await registration.json()).user.id;
      await page.context().addCookies((await request.storageState()).cookies);
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      if (width < 1024) {
        await page.getByTitle("Open Navigation Menu").click();
        await page.locator("aside").filter({ hasText: "Cuttiebooru Navigation" }).getByRole("button", { name: "Upload Work", exact: true }).click();
      } else await page.locator("aside").getByRole("button", { name: "Upload Work", exact: true }).click();
      await expect(page.getByText("Category Niche", { exact: true })).toHaveCount(0);
      await page.getByPlaceholder("Enter post title...").fill("Credited artwork fixture");
      await page.getByPlaceholder("/sfw/image/... or upload file on the left").fill("/sfw/image/credit-fixture.png");
      await page.getByRole("button", { name: "SFW (Safe)", exact: true }).click();
      await page.getByPlaceholder(/Type to search or add booru tags/).fill(tag);
      await page.getByPlaceholder(/Type to search or add booru tags/).press("Enter");
      await page.getByLabel("Artist name / credit", { exact: true }).fill("Original Artist");
      await page.getByLabel("Original source URL", { exact: true }).fill("https://example.com/original");
      await page.getByRole("checkbox").check();
      const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/posts" && response.request().method() === "POST");
      await page.getByRole("button", { name: "Publish Post to Booru Feed", exact: true }).click();
      const response = await responsePromise;
      expect(response.ok()).toBe(true);
      const post = (await response.json()).post;
      expect(post.attribution).toBe("Original Artist");
      expect(post.sourceUrl).toBe("https://example.com/original");
      expect(post.uploaderId).toBe(userId);
      await page.goto(`/post/${post.id}`);
      await expect(page.getByText("Original Artist", { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Original Source", exact: true })).toHaveAttribute("href", "https://example.com/original");
      await prisma.post.update({ where: { id: post.id }, data: { attribution: "" } });
      await page.reload();
      await expect(page.getByRole("link", { name: "Original Source", exact: true })).toBeVisible();
      const invalid = await request.post("/api/posts", { data: {
        creatorId: userId, title: "Invalid source", mediaUrl: "/sfw/image/credit-fixture.png",
        rating: "sfw", permissionConfirmed: true, sourceUrl: "javascript:alert(1)",
      } });
      expect(invalid.status()).toBe(400);
    } finally {
      if (userId) await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.tag.deleteMany({ where: { name: tag } });
      await prisma.$disconnect();
    }
  });
}
