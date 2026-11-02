import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

for (const width of [320, 1440]) {
  test(`profile follow lists on both views at ${width}px`, async ({ browser, baseURL }) => {
    const prisma = new PrismaClient();
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } });
    const ids: string[] = [];
    const suffix = randomUUID().slice(0, 8);
    try {
      const registration = await context.request.post("/api/account", {
        data: { mode: "register", username: `follow_${suffix}`, password: `Test-${randomUUID()}` },
      });
      expect(registration.ok()).toBe(true);
      const owner = (await registration.json()).user;
      ids.push(owner.id);
      await prisma.user.update({ where: { id: owner.id }, data: { spotlightQuote: "Hidden spotlight fixture", featured: true } });
      const peer = await prisma.user.create({ data: {
        username: `peer_${suffix}`, displayName: "Follow peer", avatarUrl: "/default-avatar.svg",
      } });
      ids.push(peer.id);
      const pending = await prisma.user.create({ data: {
        username: `pending_${suffix}`, displayName: "Pending peer", avatarUrl: "/default-avatar.svg",
      } });
      ids.push(pending.id);
      await prisma.follow.createMany({ data: [
        { followerId: owner.id, followingId: peer.id, approved: true },
        { followerId: peer.id, followingId: owner.id, approved: true },
        { followerId: pending.id, followingId: owner.id, approved: false },
      ] });
      const data = await (await context.request.get(`/api/users/${owner.username}`)).json();
      expect(data.followersCount).toBe(1);
      expect(data.followingCount).toBe(1);
      expect(data.allFollows).toHaveLength(2);
      const page = await context.newPage();
      for (const url of [`/user/${owner.username}`, `/`]) {
        await page.goto(url);
        await page.waitForLoadState("networkidle");
        if (url === "/") await page.getByText(owner.displayName, { exact: true }).last().click();
        await expect(page.getByText("Hidden spotlight fixture", { exact: false })).toHaveCount(0);
        await page.getByRole("button", { name: /^1 Followers$/, exact: true }).click();
        const dialog = page.getByRole("dialog", { name: `Followers and following for @${owner.username}`, exact: true });
        await expect(dialog.getByText(peer.displayName, { exact: true })).toBeVisible();
        await expect(dialog.getByText(pending.displayName, { exact: true })).toHaveCount(0);
        await dialog.getByRole("button", { name: "Following (1)", exact: true }).click();
        await expect(dialog.getByText(peer.displayName, { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await page.getByRole("button", { name: /^1 Following$/, exact: true }).click();
        await expect(dialog).toBeVisible();
        await dialog.getByRole("button", { name: "Close followers and following", exact: true }).click();
      }
      await prisma.user.update({ where: { id: pending.id }, data: { privateProfile: true } });
      await page.goto(`/user/${pending.username}`);
      await page.getByRole("button", { name: "0 Followers", exact: true }).click();
      await expect(page.getByRole("dialog").getByText("No followers yet", { exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await context.clearCookies();
      await page.goto(`/user/${owner.username}`);
      await page.getByRole("button", { name: "1 Followers", exact: true }).click();
      await expect(page.getByRole("dialog").getByText(peer.displayName, { exact: true })).toBeVisible();
    } finally {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await context.close();
      await prisma.$disconnect();
    }
  });
}
