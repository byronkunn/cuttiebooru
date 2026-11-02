import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const password = "playwright-test-password-2026";
const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const alice = { username: `pw_sender_${stamp}`, displayName: "PW Sender" };
const bob = { username: `pw_receiver_${stamp}`, displayName: "PW Receiver" };

async function register(context: BrowserContext, account: typeof alice) {
  const response = await context.request.post("/api/account", {
    data: {
      mode: "register",
      username: account.username,
      displayName: account.displayName,
      password,
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  const body = await response.json();
  expect(body.user.username).toBe(account.username);
  return body.user.id as string;
}

async function openChat(page: Page, username: string) {
  await page.goto("/messages");
  await expect(page.getByPlaceholder("Search creators or messages...")).toBeVisible();
  const search = page.getByPlaceholder("Search creators or messages...");
  await search.fill(username);
  const partner = page.getByText(`@${username}`, { exact: false }).first();
  await expect(partner).toBeVisible();
  await partner.click();
  await expect(page.getByPlaceholder(`Write a message to @${username}...`)).toBeVisible();
}

test.describe("direct messaging", () => {
  test("starts a chat, sends content, and lets the recipient read it after refresh", async ({ browser, baseURL }) => {
    test.skip(!baseURL, "Configure Playwright use.baseURL for the running Next.js site.");

    const senderContext = await browser.newContext({ baseURL });
    const receiverContext = await browser.newContext({ baseURL });
    try {
      const senderId = await register(senderContext, alice);
      const receiverId = await register(receiverContext, bob);
      expect(senderId).not.toBe(receiverId);

      const senderPage = await senderContext.newPage();
      const receiverPage = await receiverContext.newPage();
      const content = `Playwright message ${stamp}`;

      // Search the member list to begin a new conversation with the other account.
      await openChat(senderPage, bob.username);
      const composer = senderPage.getByPlaceholder(`Write a message to @${bob.username}...`);
      await composer.fill(content);
      const sendResponse = senderPage.waitForResponse((response) => response.url().endsWith("/api/messages") && response.request().method() === "POST");
      await senderPage.locator("form").filter({ has: composer }).locator('button[type="submit"]').click();
      expect((await sendResponse).ok()).toBeTruthy();
      await expect(senderPage.locator('[id^="chat-msg-"]').getByText(content, { exact: true })).toBeVisible();

      // The messages endpoint persists the content, and the recipient's authenticated
      // session must be able to load and display the same message.
      const received = await receiverContext.request.get("/api/messages");
      expect(received.ok()).toBeTruthy();
      const receivedBody = await received.json();
      expect(receivedBody.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            senderId,
            receiverId,
            text: content,
          }),
        ]),
      );

      await openChat(receiverPage, alice.username);
      await expect(receiverPage.locator('[id^="chat-msg-"]').getByText(content, { exact: true })).toBeVisible();
      await receiverPage.reload();
      await openChat(receiverPage, alice.username);
      await expect(receiverPage.locator('[id^="chat-msg-"]').getByText(content, { exact: true })).toBeVisible();
    } finally {
      await senderContext.close();
      await receiverContext.close();
    }
  });
});
