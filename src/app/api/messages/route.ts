import { safeJson } from "@/lib/safe-json";
import { NextRequest } from "next/server";
import { getSessionUser, unauthorized, forbidden } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return unauthorized();
    const userId = user.id;

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: true,
        receiver: true,
        replyTo: {
          include: {
            sender: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return safeJson({ messages });
  } catch (error) {
    console.error("GET /api/messages error:", error);
    return safeJson(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await getSessionUser(req);
    if (!user) return unauthorized();
    const userId = user.id;
    const { action } = body;
    if (["edit", "delete", "pin", "react", "forward"].includes(action)) {
      const message = await prisma.directMessage.findUnique({ where: { id: body.messageId } });
      if (!message || (message.senderId !== userId && message.receiverId !== userId)) return forbidden();
      if (["edit", "delete"].includes(action) && message.senderId !== userId) return forbidden();
    }
    if (action === "send" && body.mediaUrl?.startsWith("/api/private-media/")) {
      const filename = body.mediaUrl.split("/").pop();
      const upload = await prisma.upload.findUnique({ where: { filename } });
      if (!upload || upload.ownerId !== userId || upload.kind !== "private") return forbidden();
    }
    if (action === "send" && body.replyToId) {
      const reply = await prisma.directMessage.findUnique({ where: { id: body.replyToId } });
      if (!reply || ![reply.senderId, reply.receiverId].includes(userId) || ![reply.senderId, reply.receiverId].includes(body.receiverId)) return forbidden();
    }

    if (action === "send") {
      if (Number(body.selfDestructSec || 0) !== 0) return safeJson({ error: "Expiring messages are not available" }, { status: 400 });
      const {
        receiverId,
        text = "",
        mediaUrl = "",
        mediaType = "",
        mediaDuration = "",
        replyToId = null,
        forwardedFromId = null,
        selfDestructSec = 0,
      } = body;

      if (typeof receiverId !== "string" || receiverId === userId) return safeJson({ error: "Choose a valid recipient" }, { status: 400 });
      if (typeof text !== "string" || text.length > 4000) return safeJson({ error: "Message text is too long" }, { status: 400 });
      const recipient = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true, isBanned: true, allowDMs: true } });
      if (!recipient || recipient.isBanned) return safeJson({ error: "Recipient not found" }, { status: 404 });
      if (recipient.allowDMs === "none") return forbidden();
      if (recipient.allowDMs === "followers" && !(await prisma.follow.findFirst({ where: { followerId: receiverId, followingId: userId, approved: true } }))) return forbidden();
      if (mediaUrl && typeof mediaUrl !== "string") return safeJson({ error: "Invalid attachment" }, { status: 400 });
      if (
        mediaUrl &&
        !mediaUrl.startsWith("/api/private-media/") &&
        !mediaUrl.startsWith("/sfw/") &&
        !mediaUrl.startsWith("/api/media/")
      ) {
        return safeJson({ error: "Message attachments must use private uploads or gallery media" }, { status: 400 });
      }

      if (!receiverId || (!text.trim() && !mediaUrl && mediaType !== "voice")) {
        return safeJson(
          { error: "Message content and recipient are required" },
          { status: 400 }
        );
      }

      const created = await prisma.directMessage.create({
        data: {
          senderId: userId,
          receiverId,
          text: text.trim(),
          mediaUrl,
          mediaType,
          mediaDuration,
          replyToId: replyToId || null,
          forwardedFromId: forwardedFromId || null,
          selfDestructSec: Number(selfDestructSec) || 0,
          isRead: false,
        },
        include: {
          sender: true,
          receiver: true,
          replyTo: { include: { sender: true } },
        },
      });

      return safeJson({ message: created }, { status: 201 });
    }

    if (action === "edit") {
      const { messageId, text } = body;
      if (typeof text !== "string" || text.length > 4000) return safeJson({ error: "Message text is too long" }, { status: 400 });
      const updated = await prisma.directMessage.update({
        where: { id: messageId },
        data: {
          text: (text || "").trim(),
          isEdited: true,
        },
        include: {
          sender: true,
          receiver: true,
          replyTo: { include: { sender: true } },
        },
      });
      return safeJson({ message: updated });
    }

    if (action === "delete") {
      const { messageId } = body;
      await prisma.directMessage.delete({
        where: { id: messageId },
      });
      return safeJson({ deleted: true, messageId });
    }

    if (action === "pin") {
      const { messageId } = body;
      const existing = await prisma.directMessage.findUnique({
        where: { id: messageId },
      });
      if (!existing) {
        return safeJson(
          { error: "Message not found" },
          { status: 404 }
        );
      }
      const updated = await prisma.directMessage.update({
        where: { id: messageId },
        data: { isPinned: !existing.isPinned },
        include: {
          sender: true,
          receiver: true,
          replyTo: { include: { sender: true } },
        },
      });
      return safeJson({ message: updated });
    }

    if (action === "react") {
      const { messageId, emoji } = body;
      if (typeof emoji !== "string" || emoji.length > 16) return safeJson({ error: "Invalid reaction" }, { status: 400 });
      const existing = await prisma.directMessage.findUnique({
        where: { id: messageId },
      });
      if (!existing) {
        return safeJson(
          { error: "Message not found" },
          { status: 404 }
        );
      }

      let reactionsMap: Record<string, string[]> = {};
      try {
        reactionsMap = JSON.parse(existing.reactions || "{}");
      } catch {
        reactionsMap = {};
      }

      const currentUsers = reactionsMap[emoji] || [];
      if (currentUsers.includes(userId)) {
        reactionsMap[emoji] = currentUsers.filter((id) => id !== userId);
        if (reactionsMap[emoji].length === 0) {
          delete reactionsMap[emoji];
        }
      } else {
        reactionsMap[emoji] = [...currentUsers, userId];
      }

      const updated = await prisma.directMessage.update({
        where: { id: messageId },
        data: { reactions: JSON.stringify(reactionsMap) },
        include: {
          sender: true,
          receiver: true,
          replyTo: { include: { sender: true } },
        },
      });

      return safeJson({ message: updated });
    }

    if (action === "mark_read") {
      const { partnerId } = body;
      if (typeof partnerId !== "string") return safeJson({ error: "Invalid conversation" }, { status: 400 });
      await prisma.directMessage.updateMany({
        where: {
          senderId: partnerId,
          receiverId: userId,
          isRead: false,
        },
        data: { isRead: true },
      });
      return safeJson({ markedRead: true });
    }

    if (action === "forward") {
      const { messageId, targetReceiverId } = body;
      if (typeof targetReceiverId !== "string" || targetReceiverId === userId) return safeJson({ error: "Choose a valid recipient" }, { status: 400 });
      const target = await prisma.user.findUnique({ where: { id: targetReceiverId }, select: { id: true, isBanned: true, allowDMs: true } });
      if (!target || target.isBanned || target.allowDMs === "none") return forbidden();
      if (target.allowDMs === "followers" && !(await prisma.follow.findFirst({ where: { followerId: targetReceiverId, followingId: userId, approved: true } }))) return forbidden();
      const source = await prisma.directMessage.findUnique({
        where: { id: messageId },
        include: { sender: true },
      });
      if (!source) {
        return safeJson(
          { error: "Source message not found" },
          { status: 404 }
        );
      }

      const forwarded = await prisma.directMessage.create({
        data: {
          senderId: userId,
          receiverId: targetReceiverId,
          text: source.text,
          mediaUrl: source.mediaUrl,
          mediaType: source.mediaType,
          mediaDuration: source.mediaDuration,
          forwardedFromId: source.sender.username,
          isRead: false,
        },
        include: {
          sender: true,
          receiver: true,
          replyTo: { include: { sender: true } },
        },
      });

      return safeJson({ message: forwarded });
    }

    return safeJson({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/messages error:", error);
    return safeJson(
      { error: "Message operation failed" },
      { status: 500 }
    );
  }
}
