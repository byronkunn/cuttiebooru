import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { visiblePostWhere } from "@/lib/content-visibility";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const period = req.nextUrl.searchParams.get("period") || "week";
    const rating = req.nextUrl.searchParams.get("rating") || "all";
    if (!["week", "month", "all"].includes(period) || !["all", "sfw", "questionable", "explicit"].includes(rating)) {
      return safeJson({ error: "Invalid discovery filters." }, { status: 400 });
    }
    const settings = await prisma.siteSetting.findUnique({ where: { id: "global" } });
    const since = period === "all" ? null : new Date(Date.now() - (period === "week" ? 7 : 30) * 86400000);
    const activity = since ? { createdAt: { gte: since } } : {};
    const where: Prisma.PostWhereInput = {
      AND: [
        visiblePostWhere(user?.id),
        { creator: { is: { isBanned: false } } },
        ...(settings?.allow18Plus === false ? [{ rating: "sfw" }] : []),
        ...(rating !== "all" ? [{ rating }] : []),
        ...(since ? [{ OR: [{ createdAt: { gte: since } }, { favorites: { some: activity } }] }] : []),
      ],
    };
    const candidates = await prisma.post.findMany({
      where,
      select: {
        id: true, creatorId: true, createdAt: true, views: true,
        tags: { select: { tag: true } },
        _count: { select: { favorites: { where: activity } } },
      },
      orderBy: [{ favorites: { _count: "desc" } }, { createdAt: "desc" }, { id: "asc" }],
      take: 500,
    });
    const ranked = candidates.map((post) => ({
      ...post,
      score: post._count.favorites * 150 + (!since || post.createdAt >= since ? post.views : 0),
    })).sort((a, b) => b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));
    const creators = new Map<string, { id: string; score: number; artworkCount: number }>();
    const tags = new Map<string, { tag: typeof candidates[number]["tags"][number]["tag"]; score: number; artworkCount: number }>();
    for (const post of ranked) {
      const creator = creators.get(post.creatorId) || { id: post.creatorId, score: 0, artworkCount: 0 };
      creator.score += post.score;
      creator.artworkCount++;
      creators.set(post.creatorId, creator);
      for (const { tag } of post.tags) {
        const trend = tags.get(tag.id) || { tag, score: 0, artworkCount: 0 };
        trend.score += post.score;
        trend.artworkCount++;
        tags.set(tag.id, trend);
      }
    }
    const topCreators = Array.from(creators.values()).sort((a, b) => b.score - a.score || b.artworkCount - a.artworkCount || a.id.localeCompare(b.id)).slice(0, 8);
    const [posts, users] = await Promise.all([
      prisma.post.findMany({
        where: { AND: [where, { id: { in: ranked.slice(0, 24).map((post) => post.id) } }] },
        include: {
          creator: true, uploader: true, album: true,
          tags: { include: { tag: true } },
          _count: { select: { favorites: true, collectionItems: true } },
        },
      }),
      prisma.user.findMany({ where: { id: { in: topCreators.map((creator) => creator.id) } } }),
    ]);
    const postsById = new Map(posts.map((post) => [post.id, post]));
    const usersById = new Map(users.map((creator) => [creator.id, creator]));
    return safeJson({
      posts: ranked.slice(0, 24).flatMap((post) => {
        const fullPost = postsById.get(post.id);
        return fullPost ? [fullPost] : [];
      }),
      creators: topCreators.flatMap((trend) => {
        const creator = usersById.get(trend.id);
        return creator ? [{ creator, artworkCount: trend.artworkCount }] : [];
      }),
      tags: Array.from(tags.values()).sort((a, b) => b.artworkCount - a.artworkCount || b.score - a.score || a.tag.name.localeCompare(b.tag.name))
        .slice(0, 12).map(({ tag, artworkCount }) => ({ tag, artworkCount })),
    });
  } catch (error) {
    console.error("Failed to load discovery:", error);
    return safeJson({ error: "Unable to load Explore." }, { status: 500 });
  }
}
