import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();
const prefix = `explore_${randomUUID().slice(0, 8)}`;
const ids: string[] = [];
let publicId: string;
let privateId: string;
let artworkId: string;
let oldId: string;
let privatePostId: string;
let bannedPostId: string;
let explicitId: string;
let title: string;
const tagName = `${prefix}_trending`;
let storageState: Awaited<ReturnType<import("@playwright/test").APIRequestContext["storageState"]>>;

test.beforeAll(async ({ playwright, baseURL }) => {
  const client = await playwright.request.newContext({ baseURL });
  const registration = await client.post("/api/account", {
    data: { mode: "register", username: `${prefix}_viewer`, password: `Test-${randomUUID()}` },
  });
  expect(registration.ok()).toBe(true);
  ids.push((await registration.json()).user.id);
  storageState = await client.storageState();
  for (const name of ["public", "private", "banned"]) {
    const creator = await prisma.user.create({
      data: {
        username: `${prefix}_${name}`, displayName: `${prefix} ${name}`,
        isCreator: true, privateProfile: name === "private", isBanned: name === "banned",
        avatarUrl: "/sfw/avatar/explore-fixture.png",
      },
    });
    ids.push(creator.id);
  }
  publicId = ids[1];
  privateId = ids[2];
  title = `${prefix} trending artwork`;
  const createPost = (creatorId: string, postTitle: string, rating = "sfw", createdAt = new Date()) =>
    prisma.post.create({ data: {
      creatorId, uploaderId: creatorId, title: postTitle, rating, createdAt,
      views: 1000000000,
      mediaUrl: "/sfw/image/explore-fixture.png", thumbnailUrl: "/sfw/image/explore-fixture.png",
    } });
  artworkId = (await createPost(publicId, title)).id;
  oldId = (await createPost(publicId, `${prefix} old artwork`, "sfw", new Date("2020-01-01"))).id;
  privatePostId = (await createPost(privateId, `${prefix} protected artwork`)).id;
  bannedPostId = (await createPost(ids[3], `${prefix} banned artwork`)).id;
  explicitId = (await createPost(publicId, `${prefix} explicit artwork`, "explicit")).id;
  await prisma.postTag.create({
    data: { post: { connect: { id: artworkId } }, tag: { create: { name: tagName, displayName: "Explore fixture", category: "general" } } },
  });
  await client.dispose();
});

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.tag.deleteMany({ where: { name: tagName } });
  await prisma.$disconnect();
});

test("discovery ranks activity and respects time, ratings and approved profile access", async ({ request, playwright, baseURL }) => {
  const response = await request.get("/api/explore?period=week&rating=sfw");
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  const data = await response.json();
  const postIds = data.posts.map((post: { id: string }) => post.id);
  expect(postIds).toContain(artworkId);
  for (const id of [oldId, privatePostId, bannedPostId, explicitId]) expect(postIds).not.toContain(id);
  expect(data.creators.some((item: { creator: { id: string } }) => item.creator.id === publicId)).toBe(true);
  expect(data.creators.some((item: { creator: { id: string } }) => item.creator.id === privateId)).toBe(false);
  expect(data.tags.some((item: { tag: { name: string } }) => item.tag.name === tagName)).toBe(true);
  expect(JSON.stringify(data)).not.toContain("passwordHash");
  expect(JSON.stringify(data)).not.toContain('"email"');
  const allTime = await (await request.get("/api/explore?period=all&rating=sfw")).json();
  expect(allTime.posts.some((post: { id: string }) => post.id === oldId)).toBe(true);
  const client = await playwright.request.newContext({ baseURL, storageState });
  try {
    await prisma.follow.create({ data: { followerId: ids[0], followingId: privateId, approved: false } });
    const pending = await (await client.get("/api/explore?rating=sfw")).json();
    expect(pending.posts.some((post: { id: string }) => post.id === privatePostId)).toBe(false);
    await prisma.follow.update({ where: { followerId_followingId: { followerId: ids[0], followingId: privateId } }, data: { approved: true } });
    const approved = await (await client.get("/api/explore?rating=sfw")).json();
    expect(approved.posts.some((post: { id: string }) => post.id === privatePostId)).toBe(true);
  } finally { await client.dispose(); }
  expect((await request.get("/api/explore?period=invalid")).status()).toBe(400);
});

for (const width of [320, 375, 768, 1440]) {
  test(`Explore tabs, filters and tag navigation work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.route("**/*", async (route) => {
      if (route.request().resourceType() === "image") {
        await route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"><rect width="800" height="1200" fill="#475569"/></svg>' });
      } else await route.continue();
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    if (width < 1024) {
      await page.getByTitle("Open Navigation Menu").click();
      await page.locator("aside").filter({ hasText: "Cuttiebooru Navigation" }).getByRole("button", { name: "Explore", exact: true }).click();
    } else {
      await page.locator("aside").getByRole("button", { name: "Explore", exact: true }).click();
    }

    const discovery = page.getByRole("region", { name: "Explore discovery", exact: true });
    await discovery.getByLabel("Explore rating").selectOption("sfw");
    await expect(discovery.getByRole("img", { name: title, exact: true })).toBeVisible();
    await discovery.getByRole("tab", { name: "Creators", exact: true }).click();
    await expect(discovery.getByRole("region", { name: "Trending artwork", exact: true })).toHaveCount(0);
    await expect(discovery.getByText(`@${prefix}_public`, { exact: true })).toBeVisible();
    await discovery.getByRole("tab", { name: "Artwork", exact: true }).click();
    await discovery.getByLabel("Trending time range").selectOption("all");
    await expect(discovery.getByRole("img", { name: `${prefix} old artwork`, exact: true })).toBeVisible();
    await discovery.getByLabel("Trending time range").selectOption("week");
    await expect(discovery.getByRole("img", { name: `${prefix} old artwork`, exact: true })).toHaveCount(0);
    await discovery.getByRole("tab", { name: "Tags", exact: true }).click();
    await expect(discovery.getByText(`#${tagName}`, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await discovery.getByRole("button", { name: new RegExp(tagName) }).click();
    await expect(page.getByTitle(`Remove #${tagName}`)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Explore", exact: true })).toHaveCount(0);
  });
}

test("Explore surfaces errors, retries empty results and submits header searches", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  let fails = true;
  await page.route("**/api/explore?*", (route) => route.fulfill({
    status: fails ? 500 : 200,
    json: fails ? { error: "Discovery test error" } : { posts: [], creators: [], tags: [] },
  }));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTitle("Open Navigation Menu").click();
  await page.locator("aside").filter({ hasText: "Cuttiebooru Navigation" }).getByRole("button", { name: "Explore", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Discovery test error" })).toBeVisible();
  fails = false;
  await page.getByRole("button", { name: "Retry Explore", exact: true }).click();
  await expect(page.getByText("No artwork activity in this period. Try a wider time range.", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Search posts", exact: true }).fill("#explore_test");
  await page.locator("header").getByRole("button", { name: "Go", exact: true }).click();
  await expect(page.getByTitle("Remove #explore_test")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explore", exact: true })).toHaveCount(0);
});
