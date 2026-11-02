import { safeJson } from "@/lib/safe-json";
import { NextRequest } from "next/server";
import { getSessionUser, unauthorized, forbidden } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filterVisibleContent } from "@/lib/content-visibility";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return unauthorized();
    const userId = user.id;

    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      include: {
        actor: true,
        post: {
          include: { creator: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return safeJson(await filterVisibleContent({ notifications }, userId));
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return safeJson(
      { error: "Failed to load notifications" },
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
    if (["mark_one_read", "delete"].includes(action)) {
      const notification = await prisma.notification.findUnique({ where: { id: body.notificationId } });
      if (!notification || notification.recipientId !== userId) return forbidden();
    }

    if (action === "mark_all_read") {
      await prisma.notification.updateMany({
        where: { recipientId: userId, isRead: false },
        data: { isRead: true },
      });
      return safeJson({ markedAllRead: true });
    }

    if (action === "mark_one_read") {
      const { notificationId } = body;
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
      return safeJson({ markedRead: true, notificationId });
    }

    if (action === "delete") {
      const { notificationId } = body;
      await prisma.notification.delete({
        where: { id: notificationId },
      });
      return safeJson({ deleted: true, notificationId });
    }

    return safeJson({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/notifications error:", error);
    return safeJson(
      { error: "Notification action failed" },
      { status: 500 }
    );
  }
}
