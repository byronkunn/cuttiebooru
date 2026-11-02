import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";

test("private attachments stay accessible to message participants after forwarding", async ({ playwright, baseURL }) => {
  const clients = await Promise.all(Array.from({ length: 4 }, () => playwright.request.newContext({ baseURL })));
  const prisma = new PrismaClient();
  const ids: string[] = [];
  const filenames: { folder: string; name: string }[] = [];
  try {
    for (const client of clients) {
      const response = await client.post("/api/account", { data: {
        username: `attach_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
        password: `Test-${randomUUID()}`, displayName: "Attachment test",
      } });
      expect(response.status(), await response.text()).toBe(201);
      ids.push((await response.json()).user.id);
    }
    const [owner, recipient, forwardedRecipient, outsider] = clients;
    expect((await owner.patch("/api/account", { data: { privateProfile: true } })).ok()).toBeTruthy();
    const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
    const upload = async (folder: string) => {
      const response = await owner.post("/api/upload", { multipart: { folder, file: { name: "pixel.png", mimeType: "image/png", buffer: pixel } } });
      expect(response.ok(), await response.text()).toBeTruthy();
      const result = await response.json();
      filenames.push({ folder: folder === "private" ? "private-media" : "sfw/image", name: result.filename });
      return result.url as string;
    };
    const unposted = await upload("image");
    expect(await (await outsider.get("/api/upload")).text()).not.toContain(unposted);
    expect(await (await owner.get("/api/upload")).text()).toContain(unposted);
    const url = await upload("private");
    expect((await recipient.get(url)).status()).toBe(404);
    const sent = await owner.post("/api/messages", { data: { action: "send", receiverId: ids[1], mediaUrl: url, mediaType: "image" } });
    expect(sent.status(), await sent.text()).toBe(201);
    const message = (await sent.json()).message;
    expect((await recipient.get(url)).status()).toBe(200);
    const forwarded = await recipient.post("/api/messages", { data: { action: "forward", messageId: message.id, targetReceiverId: ids[2] } });
    expect(forwarded.ok(), await forwarded.text()).toBeTruthy();
    for (const client of [owner, recipient, forwardedRecipient]) expect((await client.get(url)).status()).toBe(200);
    expect((await outsider.get(url)).status()).toBe(404);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
    for (const file of filenames) await unlink(path.join(process.cwd(), file.folder, file.name)).catch(() => {});
    await Promise.all(clients.map((client) => client.dispose()));
  }
});
