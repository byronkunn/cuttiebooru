import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();
const neutralImage = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"><rect width="800" height="1200" fill="#475569"/></svg>'
);
const sizes = [
  [320, 568], [360, 800], [375, 667], [390, 844], [430, 932],
  [479, 800], [480, 800], [639, 800], [640, 800],
  [767, 900], [768, 1024], [1023, 768], [1024, 768],
  [1280, 800], [1440, 900], [1920, 1080], [2560, 1440],
  [667, 375], [932, 430],
] as const;

let userId: string;
let username: string;
let postId: string;
let seriesId: string;
let chapterId: string;
let partnerId: string;
let partnerUsername: string;
let storageState: Awaited<ReturnType<import("@playwright/test").APIRequestContext["storageState"]>>;

async function checkLayout(page: Page, label: string) {
  await page.evaluate(() => document.fonts.ready);
  const measurement = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => {
        const box = element.getBoundingClientRect();
        if (box.width === 0 || box.height === 0 || box.right <= 0) return false;
        let parent = element.parentElement;
        while (parent) {
          if (["auto", "scroll", "hidden", "clip"].includes(getComputedStyle(parent).overflowX)) return false;
          parent = parent.parentElement;
        }
        return box.right > width + 1 || box.left < -1;
      })
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName,
        text: element.textContent?.trim().slice(0, 70),
        className: element.className,
        right: Math.round(element.getBoundingClientRect().right),
      }));
    return { width, scrollWidth, offenders };
  });
  expect.soft(measurement.scrollWidth, `${label}: ${JSON.stringify(measurement)}`)
    .toBeLessThanOrEqual(measurement.width + 1);
  expect.soft(measurement.offenders, `${label}: off-screen elements`).toEqual([]);
}

async function checkMobileNavigation(page: Page, width: number) {
  const navigation = page.getByRole("navigation", { name: "Mobile navigation", includeHidden: true });
  if (width < 768) {
    await expect(navigation).toBeVisible();
  } else {
    await expect(navigation).toBeHidden();
  }
}

async function homeSection(page: Page, name: string, width: number) {
  if (width < 1024) {
    await page.getByTitle("Open Navigation Menu").click();
    await page.locator("aside").filter({ hasText: "Cuttiebooru Navigation" })
      .getByRole("button", { name, exact: true }).click();
  } else {
    const desktopName = name === "Tags Directory" ? "Tags & Search" : name === "Saved Collections" ? "Collections" : name;
    await page.locator("aside").getByRole("button", { name: desktopName, exact: true }).click();
  }
  await page.waitForLoadState("networkidle");
}

test.beforeAll(async ({ playwright, baseURL }) => {
  await prisma.comicSeries.deleteMany({ where: { title: "Responsive Comic Series" } });
  const client = await playwright.request.newContext({ baseURL });
  username = `responsive_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const registration = await client.post("/api/account", {
    data: { mode: "register", username, password: `Test-${randomUUID()}`, displayName: "Responsive layout test creator" },
  });
  expect(registration.ok()).toBeTruthy();
  userId = (await registration.json()).user.id;
  await prisma.user.update({ where: { id: userId }, data: { role: "admin", isModerator: true } });
  partnerUsername = `${username}_peer`;
  const partner = await prisma.user.create({
    data: {
      username: partnerUsername, displayName: "Responsive message recipient",
      avatarUrl: "/sfw/avatar/responsive-fixture.png",
    },
  });
  partnerId = partner.id;
  await prisma.directMessage.create({
    data: { senderId: partnerId, receiverId: userId, text: "long-message-".repeat(30) },
  });
  const post = await prisma.post.create({
    data: {
      title: `Responsive ${"long-title-".repeat(10)}`,
      description: "Responsive fixture description. ".repeat(8),
      mediaUrl: "/sfw/image/responsive-fixture.png",
      thumbnailUrl: "/sfw/image/responsive-fixture.png",
      creatorId: userId, uploaderId: userId, rating: "sfw",
      tags: { create: Array.from({ length: 24 }, (_, index) => ({
        tag: { create: { name: `${username}_tag_${index}`, displayName: `Search fixture ${index}` } },
      })) },
    },
  });
  postId = post.id;
  const series = await prisma.comicSeries.create({
    data: {
      title: "Responsive Comic Series",
      description: "Test comic synopsis. ".repeat(10),
      coverUrl: "/sfw/image/responsive-fixture.png",
      creatorId: userId,
      chapters: { create: {
        title: "Responsive chapter", number: 1, published: true,
        pages: { create: { position: 0, url: "/sfw/image/responsive-fixture.png" } },
      } },
    }, include: { chapters: true },
  });
  seriesId = series.id;
  chapterId = series.chapters[0].id;
  storageState = await client.storageState();
  await client.dispose();
});

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [userId, partnerId].filter(Boolean) } } });
  if (username) await prisma.tag.deleteMany({ where: { name: { startsWith: `${username}_tag_` } } });
  await prisma.$disconnect();
});

for (const [width, height] of sizes) {
  test(`views fit ${width}x${height}`, async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({
      baseURL, storageState, viewport: { width, height },
    });
    const page = await context.newPage();
    // Use a neutral local fixture for every image while measuring real page layouts.
    await page.route("**/*", async (route) => {
      if (route.request().resourceType() === "image") {
        await route.fulfill({ contentType: "image/svg+xml", body: neutralImage });
      } else {
        await route.continue();
      }
    });
    try {
      await page.goto("/");
      await expect(page.getByTitle("Account Menu").first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Save this search" })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await checkLayout(page, "home");
      await checkMobileNavigation(page, width);
      if ([320, 768, 1440].includes(width)) {
        await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`) });
      }
      await page.getByTitle("Site Appearance & Themes").click();
      await expect(page.getByRole("heading", { name: /Site Appearance/ })).toBeVisible();
      await checkLayout(page, "appearance modal");
      await page.goto("/");
      await expect(page.getByRole("button", { name: "Save this search" })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await page.getByTitle("Account Menu").first().click();
      await checkLayout(page, "account menu");
      const tags = ["responsive", "long-tag-".repeat(9), "layout"];
      await page.goto(`/?tags=${encodeURIComponent(tags.join(","))}`);
      await expect(page.getByRole("button", { name: "Save this search" })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await checkLayout(page, "multi-tag search");
      await page.getByTitle(`Remove #${tags[1]}`).scrollIntoViewIfNeeded();
      await expect(page.getByTitle(`Remove #${tags[1]}`)).toBeInViewport({ ratio: 1 });
      await page.getByTitle("Clear tags and search").click();
      for (const section of ["Explore", "Creators", "Tags Directory", "Saved Collections", "Notifications", "Upload Work"]) {
        await homeSection(page, section, width);
        await checkLayout(page, section);
        if ([320, 375, 430, 667, 768, 1440].includes(width) && section === "Tags Directory") {
          const input = page.getByPlaceholder("Filter tags by name...");
          await input.fill(`${username}_tag_0`);
          await expect(page.getByText(`#${username}_tag_0`, { exact: true })).toBeVisible();
          await input.fill(`missing_${username}`);
          await expect(page.getByRole("button", { name: "Include", exact: true })).toHaveCount(0);
          await input.fill("");
        }
        if ([320, 375, 430, 667, 768, 1440].includes(width) && section === "Upload Work") {
          const input = page.getByPlaceholder(/Type to search or add booru tags|Add another tag/);
          for (let index = 0; index < 24; index++) {
            await input.fill(`mobile_upload_${index}`);
            await input.press("Enter");
          }
          await expect(page.getByText("Booru Tags (24 added)", { exact: true })).toBeVisible();
          await input.fill("mobile_upload_0");
          await input.press("Enter");
          await expect(page.getByText("Booru Tags (24 added)", { exact: true })).toBeVisible();
          await input.fill("long_mobile_search_".repeat(8));
          await checkLayout(page, "upload long typed tag");
          await input.press("Enter");
          await checkLayout(page, "upload 25 tags including long chip");
          await page.getByLabel("Delete #mobile_upload_0 chip").click();
          await expect(page.getByText("Booru Tags (24 added)", { exact: true })).toBeVisible();
          await page.getByRole("button", { name: "Clear all tags", exact: true }).click();
          await expect(page.getByText("Booru Tags (0 added)", { exact: true })).toBeVisible();
        }
      }
      for (const route of [
        `/user/${username}`, `/post/${postId}`, "/settings", "/comics",
        `/comics?series=${seriesId}`, `/comics?series=${seriesId}&chapter=${chapterId}`, "/messages",
      ]) {
        await page.goto(route);
        await expect(page.locator("main, header").first()).toBeVisible();
        await page.waitForLoadState("networkidle");
        await checkLayout(page, route);
        await checkMobileNavigation(page, width);
        if ([320, 375, 430, 667, 768, 1440].includes(width) && ["/settings", "/comics", `/post/${postId}`, `/user/${username}`].includes(route)) {
          const input = page.getByRole("textbox", { name: "Search posts", exact: true });
          await input.fill("#layout #mobile -#exclude keywords");
          await expect(input).toBeInViewport();
          expect.soft((await input.boundingBox())?.width, `${route} usable search input`).toBeGreaterThanOrEqual(100);
          await checkLayout(page, `${route} populated global search`);
          await input.press("Enter");
          await expect(page.getByTitle("Remove #layout")).toBeVisible();
          await expect(page.getByTitle("Remove #mobile")).toBeVisible();
          await expect(page.getByTitle("Remove excluded #exclude")).toBeVisible();
          await expect(page.getByRole("textbox", { name: "Search posts", exact: true })).toHaveValue("keywords");
          await page.goto(route);
          await page.waitForLoadState("networkidle");
        }
        if ([320, 375, 430, 667, 768, 1440].includes(width) && route === `/post/${postId}`) {
          await page.getByRole("button", { name: "View All (24)" }).click();
          const input = page.getByPlaceholder("Search 24 tags on this media...");
          await input.fill(`#${username}_tag_0`);
          await expect(page.getByTitle(`Explore all posts tagged #${username}_tag_0`)).toBeVisible();
          await input.fill(`missing_${username}`);
          await expect(page.getByTitle(`Explore all posts tagged #${username}_tag_0`)).toHaveCount(0);
          await input.fill("");
          await checkLayout(page, "post tag modal search");
          await page.goto(route);
          await page.waitForLoadState("networkidle");
        }
        if (route === "/settings") {
          for (const tab of ["Privacy and safety", "Notifications", "Creator & Links"]) {
            const button = page.getByRole("button", { name: tab, exact: true });
            await button.click();
            await checkLayout(page, `settings ${tab}`);
          }
        }
        if (route === "/comics") {
          if ([320, 375, 430, 667, 768, 1440].includes(width)) {
            const input = page.getByPlaceholder("Search series by title, creator, or tags...");
            await input.fill("RESPONSIVE COMIC");
            await expect(page.getByRole("heading", { name: "Responsive Comic Series", exact: true, level: 3 })).toBeVisible();
            await input.fill(`missing_${username}`);
            await expect(page.getByRole("heading", { name: "Responsive Comic Series", exact: true, level: 3 })).toHaveCount(0);
            await expect(page.getByText("No series match your search filters.", { exact: true })).toBeVisible();
            await input.fill("");
            await checkLayout(page, "comic browse search");
          }
          await page.getByRole("button", { name: "Creator Studio" }).click();
          await checkLayout(page, "comic studio");
          await page.getByRole("button", { name: "Create New Series" }).click();
          await expect(page.getByPlaceholder("e.g. Succubus After Dark")).toBeVisible();
          await checkLayout(page, "create series modal");
          const submit = page.locator("form").filter({ has: page.getByPlaceholder("e.g. Succubus After Dark") })
            .getByRole("button", { name: "Create Series", exact: true });
          await submit.scrollIntoViewIfNeeded();
          await expect(submit).toBeInViewport();
        }
        if (route === "/messages") {
          if ([320, 375, 430, 667, 768, 1440].includes(width)) {
            const input = page.getByPlaceholder("Search creators or messages...");
            await input.fill("long-message-");
            await expect(page.getByText(`@${partnerUsername}`, { exact: false }).first()).toBeVisible();
            await input.fill(`missing_${username}`);
            await expect(page.getByText(`@${partnerUsername}`, { exact: false })).toHaveCount(0);
          }
          await page.getByPlaceholder("Search creators or messages...").fill(partnerUsername);
          await page.getByText(`@${partnerUsername}`, { exact: false }).first().click();
          const composer = page.getByPlaceholder(`Write a message to @${partnerUsername}...`);
          await expect(composer).toBeVisible();
          await checkLayout(page, "active conversation");
          await expect.soft(composer).toBeInViewport({ ratio: 1 });
          await composer.click({ trial: true });
          if ([320, 375, 430, 667, 768, 1440].includes(width)) {
            await page.getByTitle("Search messages in this chat").click();
            const input = page.getByPlaceholder("Find text in this 1-on-1 conversation...");
            const message = page.locator("p.break-words").filter({ hasText: "long-message-".repeat(30) });
            await input.fill("long-message-");
            await expect(message).toBeVisible();
            await input.fill(`missing_${username}`);
            await expect(message).toHaveCount(0);
            await checkLayout(page, "in-chat search and clear control");
            await page.getByRole("button", { name: "Clear", exact: true }).click();
            await expect(message).toBeVisible();
          }
          const send = page.locator("form").filter({ has: composer }).locator('button[type="submit"]');
          await expect.soft(send).toBeInViewport({ ratio: 1 });
          if ([320, 768, 1440].includes(width)) {
            await page.screenshot({ path: testInfo.outputPath(`messages-${width}.png`) });
          }
        }
        if (route.includes("&chapter=")) {
          await expect(page.getByTitle("Share chapter")).toBeVisible();
          for (const mode of [
            "Right-to-Left (Manga style)", "Left-to-Right (Western Comic style)",
            "Dual-page spread (Tankōbon physical manga style)", "Vertical continuous scroll (Webcomic style)",
          ]) {
            await page.getByTitle(mode, { exact: true }).click();
            await checkLayout(page, `reader ${mode}`);
          }
        }
      }
      await page.goto("/admin");
      await expect(page.getByRole("heading", { name: /Analytics|Overview/ })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await checkLayout(page, "admin");
      for (const section of [
        "Announcements",
        "Posts & Media", "Users & Creators", "Booru Tags & Taxonomy",
        "Tag Suggestions", "Reports & Moderation", "Collections & Curation",
        "Search Traffic & Logs", "Site & 18+ Settings",
      ]) {
        if (width < 1024) await page.getByRole("button", { name: "Open admin navigation" }).click();
        await page.locator("aside").getByRole("button", { name: section }).click();
        await page.waitForLoadState("networkidle");
        await checkLayout(page, `admin ${section}`);
        if ([320, 375, 430, 667, 768, 1440].includes(width)) {
          const searches: Record<string, [string, string, string, string]> = {
            "Posts & Media": ["Search title or category...", "long-title-", "posts", postId],
            "Users & Creators": ["Search @username or name...", `@${username}`, "users", userId],
            "Booru Tags & Taxonomy": ["Search #tag...", `#${username}_tag_0`, "tags", `${username}_tag_0`],
          };
          const search = searches[section];
          if (search) {
            const input = page.getByPlaceholder(search[0]);
            const response = page.waitForResponse((response) => {
              const url = new URL(response.url());
              return url.pathname === "/api/admin" && url.searchParams.get("section") === search[2] && url.searchParams.get("search") === search[1];
            });
            await input.fill(search[1]);
            const data = await (await response).json();
            expect.soft(data.items.some((item: { id: string; name?: string }) => item.id === search[3] || item.name === search[3]), `admin ${section} matching search`).toBe(true);
            await page.waitForLoadState("networkidle");
            await checkLayout(page, `admin ${section} populated search`);
          }
        }
      }
      await context.clearCookies();
      await page.goto("/signin");
      await expect(page.getByRole("button", { name: "Sign In with Password" })).toBeVisible();
      await checkLayout(page, "signin");
      await page.getByRole("button", { name: "Need a new account? Register here" }).click();
      await checkLayout(page, "registration");
    } finally {
      await context.close();
    }
  });
}
