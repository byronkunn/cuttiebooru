import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";

test("protected creations require owner approval across API and media paths", async ({
  playwright,
  browser,
  baseURL,
}) => {
  const owner = await playwright.request.newContext({ baseURL });
  const visitor = await playwright.request.newContext({ baseURL });
  const anonymous = await playwright.request.newContext({ baseURL });
  const ids: string[] = [];
  let uploadedFilename: string | undefined;
  const prisma = new PrismaClient();
  let ownerBrowser: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  try {
    for (const client of [owner, visitor]) {
      const res = await client.post("/api/account", {
        data: {
          username: `privacy_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
          password: `Test-${randomUUID()}`,
          displayName: "Privacy regression test",
        },
      });
      expect(res.status()).toBe(201);
      ids.push((await res.json()).user.id);
    }
    const upload = await owner.post("/api/upload", {
      multipart: {
        folder: "image",
        file: {
          name: "pixel.png",
          mimeType: "image/png",
          buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
        },
      },
    });
    expect(upload.ok(), await upload.text()).toBeTruthy();
    const { url, filename } = await upload.json();
    uploadedFilename = filename;
    const title = `Private_${randomUUID()}`;
    const createPost = await owner.post("/api/posts", {
      data: {
        title, mediaUrl: url, thumbnailUrl: url, newAlbumTitle: title,
        rating: "sfw", permissionConfirmed: true, creatorId: ids[0],
      },
    });
    expect(createPost.ok()).toBeTruthy();
    const { post } = await createPost.json();
    const follow = await visitor.post("/api/interactions", {
      data: { action: "follow", targetUserId: ids[0] },
    });
    expect((await follow.json()).following).toBe(true);
    const collection = await visitor.post("/api/interactions", {
      data: { action: "create_collection", title: "Regression collection" },
    });
    const collectionId = (await collection.json()).collection.id;
    expect((await visitor.post("/api/interactions", {
      data: { action: "add_to_collection", collectionId, postId: post.id },
    })).ok()).toBeTruthy();
    expect((await owner.patch("/api/account", {
      data: { privateProfile: true },
    })).ok()).toBeTruthy();

    for (const client of [visitor, anonymous]) {
      const feed = await client.get(`/api/posts?creatorId=${ids[0]}`);
      expect((await feed.json()).total).toBe(0);
      expect((await client.get(`/api/posts/${post.id}`)).status()).toBe(404);
      expect((await client.get(url)).status()).toBe(404);
      expect((await client.get(url.replace("/api/media/", "/sfw/"))).status()).toBe(404);
      const bootstrap = await client.get("/api/bootstrap");
      expect(await bootstrap.text()).not.toContain(title);
      const library = await client.get("/api/upload");
      expect(await library.text()).not.toContain(url);
    }
    expect((await anonymous.post("/api/account", {
      data: { mode: "quick_switch", username: "byron" },
    })).status()).toBe(403);
    expect((await owner.get(`/api/posts/${post.id}`)).ok()).toBeTruthy();

    const requests = (await (await owner.get("/api/follow-requests")).json()).requests;
    const followRequest = requests.find((item: { followerId: string }) => item.followerId === ids[1]);
    expect(followRequest).toBeTruthy();
    expect((await visitor.post("/api/follow-requests", {
      data: { action: "approve", id: followRequest.id },
    })).status()).toBe(404);
    expect((await visitor.get(`/api/posts/${post.id}`)).status()).toBe(404);
    expect((await owner.post("/api/follow-requests", {
      data: { action: "approve", id: followRequest.id },
    })).ok()).toBeTruthy();
    expect((await visitor.get(`/api/posts/${post.id}`)).ok()).toBeTruthy();
    const media = await visitor.get(url);
    expect(media.ok()).toBeTruthy();
    expect(media.headers()["cache-control"]).toBe("private, no-store");
    await visitor.post("/api/interactions", { data: { action: "follow", targetUserId: ids[0] } });
    expect((await visitor.get(url)).status()).toBe(404);
    expect((await visitor.get(`/api/posts/${post.id}`)).status()).toBe(404);
    const newRequest = await visitor.post("/api/interactions", {
      data: { action: "follow", targetUserId: ids[0] },
    });
    expect((await newRequest.json()).requested).toBe(true);
    expect((await visitor.get(`/api/posts/${post.id}`)).status()).toBe(404);
    ownerBrowser = await browser.newContext({ storageState: await owner.storageState(), baseURL });
    const page = await ownerBrowser.newPage();
    await page.goto("/settings");
    await page.getByRole("button", { name: "Privacy and safety" }).click();
    await expect(page.getByRole("heading", { name: "Follow requests" })).toBeVisible();
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page.getByText("No pending follow requests.")).toBeVisible();
    expect((await visitor.get(`/api/posts/${post.id}`)).ok()).toBeTruthy();
  } finally {
    await ownerBrowser?.close();
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
    if (uploadedFilename && /^upload_[a-f0-9-]+\.png$/.test(uploadedFilename)) {
      await unlink(path.join(process.cwd(), "sfw", "image", uploadedFilename));
    }
    await Promise.all([owner.dispose(), visitor.dispose(), anonymous.dispose()]);
  }
});
