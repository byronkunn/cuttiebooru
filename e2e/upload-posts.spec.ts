import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

function sfwImage() {
  const dir = path.resolve(process.cwd(), "sfw/image");
  const candidate = fs.readdirSync(dir).find((name) => /\.(png|jpe?g|webp|gif)$/i.test(name));
  if (!candidate) throw new Error("Expected at least one SFW image in sfw/image");
  return path.join(dir, candidate);
}

test("register, upload SFW image, tag post, and see it in feed", async ({ page }) => {
  const username = `e2e_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const password = `Test-${randomUUID()}-pass`;
  const response = await page.request.post(`${baseURL}/api/account`, {
    data: { mode: "register", username, displayName: "Upload E2E", password },
  });
  expect(response.status()).toBe(201);
  const user = await response.json();
  expect(user.user.username).toBe(username);

  await page.goto(`${baseURL}/`);
  await page.getByRole("button", { name: "Upload Work" }).click();
  await expect(page.getByRole("heading", { name: /upload images & videos/i })).toBeVisible();

  const title = `E2E post ${randomUUID().slice(0, 8)}`;
  await page.getByPlaceholder("Enter post title...").fill(title);
  await page.getByRole("button", { name: /SFW \(Safe\)/i }).click();
  await page.locator('input[type="file"]').first().setInputFiles(sfwImage());
  await expect(page.locator('input[placeholder="/sfw/image/... or upload file on the left"]')).toHaveValue(/\/api\/media\/image\/upload_/);

  const tag = `e2e_${randomUUID().slice(0, 6)}`;
  const tagInput = page.getByPlaceholder(/Type to search or add booru tags/i);
  await tagInput.fill(tag);
  await page.getByRole("button", { name: `Add #${tag}` }).click();
  await page.getByRole("checkbox", { name: /confirm.*permission|permission.*confirm/i }).check();
  await page.getByRole("button", { name: "Publish Post to Booru Feed" }).click();

  await expect(page.getByText("Published to Cuttiebooru!")).toBeVisible();
  const post = await page.request.get(`${baseURL}/api/posts?q=${encodeURIComponent(title)}`);
  expect(post.ok()).toBeTruthy();
  const results = await post.json();
  const created = results.posts.find((item: { title: string }) => item.title === title);
  expect(created, "published post should be returned by search").toBeTruthy();
  expect(created.tags.map((item: { tag: { name: string } }) => item.tag.name)).toContain(tag);
  expect(created.mediaUrl).toMatch(/^\/api\/media\/image\/upload_/);
});

test("browse and select image content from the SFW folder", async ({ page }) => {
  const response = await page.request.post(`${baseURL}/api/account`, {
    data: { mode: "register", username: `e2e_${randomUUID().replaceAll("-", "").slice(0, 12)}`, displayName: "SFW library E2E", password: `Test-${randomUUID()}-pass` },
  });
  expect(response.status()).toBe(201);
  await page.goto(`${baseURL}/`);
  await page.getByRole("button", { name: "Upload Work" }).click();
  await page.getByRole("button", { name: /Browse \.\/sfw Folder Media/i }).click();
  const picker = page.locator(".grid button").filter({ has: page.locator("img") });
  await expect(picker.first()).toBeVisible();
  const selectedSrc = await picker.first().locator("img").getAttribute("src");
  await picker.first().click();
  await expect(page.locator('input[placeholder="/sfw/image/... or upload file on the left"]')).toHaveValue(selectedSrc || "");
  expect(selectedSrc).toMatch(/^\/sfw\/image\//);
});
