import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

for (const width of [320, 1440]) {
  test(`users edit About me and custom links without presets at ${width}px`, async ({ page, request }) => {
    const prisma = new PrismaClient();
    let userId = "";
    const username = `profile_${randomUUID().slice(0, 8)}`;
    try {
      const registration = await request.post("/api/account", {
        data: { mode: "register", username, password: `Test-${randomUUID()}` },
      });
      expect(registration.ok()).toBe(true);
      userId = (await registration.json()).user.id;
      await page.context().addCookies((await request.storageState()).cookies);
      await prisma.user.update({ where: { id: userId }, data: { socialLinks: JSON.stringify({ twitter: "https://example.com/legacy" }) } });
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/settings");
      await expect(page.getByLabel("About me", { exact: true })).toBeVisible();
      await expect(page.getByText(/Quick .* Presets/)).toHaveCount(0);
      const bio = "My introduction.\n" + "I create original artwork. ".repeat(30);
      await page.getByLabel("About me", { exact: true }).fill(bio);
      await page.getByLabel("Website or Portfolio", { exact: true }).fill("https://example.com/portfolio");
      await page.getByRole("button", { name: "Creator & Links", exact: true }).click();
      await expect(page.getByLabel("Link 1 label", { exact: true })).toHaveValue("twitter");
      await expect(page.getByLabel("Link 1 URL", { exact: true })).toHaveValue("https://example.com/legacy");
      await page.getByRole("button", { name: "Add website link", exact: true }).click();
      await page.getByLabel("Link 2 label", { exact: true }).fill("My shop");
      await page.getByLabel("Link 2 URL", { exact: true }).fill("https://example.com/shop");
      await page.getByRole("button", { name: "Save Changes", exact: true }).click();
      await expect(page.getByText("Your settings have been saved successfully.", { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("About me", { exact: true })).toHaveValue(bio);
      await page.getByRole("button", { name: "Creator & Links", exact: true }).click();
      await expect(page.getByLabel("Link 2 label", { exact: true })).toHaveValue("My shop");
      await expect(page.getByLabel("Link 2 URL", { exact: true })).toHaveValue("https://example.com/shop");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.goto(`/user/${username}`);
      await page.getByRole("button", { name: "About & Links", exact: true }).click();
      await expect(page.getByRole("heading", { name: "About me", exact: true })).toBeVisible();
      await expect(page.getByText(bio, { exact: true }).last()).toBeVisible();
      await expect(page.getByRole("link", { name: "My shop", exact: true })).toHaveAttribute("href", "https://example.com/shop");
      const invalid = await request.patch("/api/account", { data: { socialLinks: { unsafe: "javascript:alert(1)" } } });
      expect(invalid.status()).toBe(400);
      expect((await request.patch("/api/account", { data: { bio: "a".repeat(2001) } })).status()).toBe(400);
      expect((await request.patch("/api/account", { data: { websiteUrl: "data:text/html,test" } })).status()).toBe(400);
      await page.goto("/settings");
      await page.getByRole("button", { name: "Creator & Links", exact: true }).click();
      await page.getByRole("button", { name: "Remove link 2", exact: true }).click();
      await page.getByRole("button", { name: "Save Changes", exact: true }).click();
      await expect(page.getByText("Your settings have been saved successfully.", { exact: true })).toBeVisible();
      await page.reload();
      await page.getByRole("button", { name: "Creator & Links", exact: true }).click();
      await expect(page.getByLabel("Link 2 label", { exact: true })).toHaveCount(0);
    } finally {
      if (userId) await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.$disconnect();
    }
  });
}
