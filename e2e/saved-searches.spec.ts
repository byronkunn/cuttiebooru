import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

test("saved searches can alert on matching posts and be managed", async ({
  page,
}) => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
  const username = `saved_${suffix}`;
  const password = `Test-${randomUUID()}-pass`;
  const registration = await page.request.post(`${baseURL}/api/account`, {
    data: {
      mode: "register",
      username,
      displayName: "Saved Search E2E",
      password,
    },
  });
  expect(registration.status()).toBe(201);
  const { user } = await registration.json();

  const tag = `saved_alert_${suffix}`;
  const createSearch = await page.request.post(
    `${baseURL}/api/saved-searches`,
    {
      data: {
        name: `#${tag}`,
        query: "",
        includedTags: [tag],
        excludedTags: [],
        mediaType: "all",
        rating: "all",
        alertsEnabled: true,
      },
    }
  );
  const createSearchBody = await createSearch.text();
  expect(createSearch.status(), createSearchBody).toBe(201);
  const { savedSearch } = JSON.parse(createSearchBody);

  const createPost = await page.request.post(`${baseURL}/api/posts`, {
    data: {
      title: `Matching post ${suffix}`,
      description: "",
      mediaUrl: "/sfw/image/saved-search-e2e.png",
      thumbnailUrl: "/sfw/image/saved-search-e2e.png",
      mediaType: "image",
      aspectRatio: "portrait",
      category: "Cute Art",
      rating: "sfw",
      permissionConfirmed: true,
      creatorId: user.id,
      tags: [tag],
    },
  });
  expect(createPost.status()).toBe(200);
  const { post } = await createPost.json();

  const notificationResponse = await page.request.get(
    `${baseURL}/api/notifications`
  );
  expect(notificationResponse.ok()).toBeTruthy();
  const { notifications } = await notificationResponse.json();
  expect(
    notifications.some(
      (notification: { type: string; postId: string }) =>
        notification.type === "saved_search" &&
        notification.postId === post.id
    )
  ).toBeTruthy();

  const disableAlerts = await page.request.patch(
    `${baseURL}/api/saved-searches`,
    { data: { id: savedSearch.id, alertsEnabled: false } }
  );
  expect(disableAlerts.ok()).toBeTruthy();

  const deleteSearch = await page.request.delete(
    `${baseURL}/api/saved-searches?id=${encodeURIComponent(savedSearch.id)}`
  );
  expect(deleteSearch.ok()).toBeTruthy();
});
