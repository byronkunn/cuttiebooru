import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { safeJson } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return unauthorized();
    const requests = await prisma.follow.findMany({
      where: { followingId: user.id, approved: false },
      include: {
        follower: { select: { id: true, username: true, displayName: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return safeJson({ requests });
  } catch (error) {
    console.error("GET /api/follow-requests error:", error);
    return safeJson({ error: "Could not load follow requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return unauthorized();
    const body = await req.json();
    if (typeof body.id !== "string" || !["approve", "reject"].includes(body.action)) {
      return safeJson({ error: "A request ID and approve/reject action are required" }, { status: 400 });
    }
    const where = { id: body.id, followingId: user.id, approved: false };
    const result = body.action === "approve"
      ? await prisma.follow.updateMany({ where, data: { approved: true } })
      : await prisma.follow.deleteMany({ where });
    if (!result.count) return safeJson({ error: "Follow request not found" }, { status: 404 });
    return safeJson({ success: true });
  } catch (error) {
    console.error("POST /api/follow-requests error:", error);
    return safeJson({ error: "Could not update follow request" }, { status: 500 });
  }
}
