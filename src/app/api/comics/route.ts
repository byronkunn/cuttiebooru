import { safeJson } from "@/lib/safe-json";
import { NextRequest } from "next/server";
import { getSessionUser, isModerator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewCreator, filterVisibleContent, visibleCreatorWhere } from "@/lib/content-visibility";

export const dynamic = "force-dynamic";
const creatorSelect = { id: true, username: true, displayName: true, avatarUrl: true };
const fail = (error: string, status = 400) => safeJson({ error }, { status });
const clean = (v: unknown, max = 200) => typeof v === "string" ? v.trim().slice(0, max) : "";
const localImage = (v: unknown): v is string => typeof v === "string" && /^(?:\/sfw\/image|\/api\/media\/image|\/api\/private-media)\/[^/]+\.(jpg|jpeg|png|webp|gif)$/i.test(v);

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const userId = (await getSessionUser(req))?.id || "";
    const id = params.get("id");
    const chapterInclude = {
      pages: { orderBy: { position: "asc" as const } },
      comments: {
        include: { author: { select: creatorSelect } },
        orderBy: { createdAt: "desc" as const },
      },
    };

    if (id) {
      const series = await prisma.comicSeries.findUnique({
        where: { id },
        include: {
          creator: { select: creatorSelect },
          chapters: {
            where: { published: true },
            include: chapterInclude,
            orderBy: { number: "asc" },
          },
          _count: { select: { follows: true } },
        },
      });
      if (!series) return fail("Series not found", 404);
      if (!await canViewCreator(series.creatorId, userId)) return fail("Series not found", 404);
      // Only the series owner can view unpublished chapters.
      const drafts =
        userId && series.creatorId === userId
          ? await prisma.comicChapter.findMany({
              where: { seriesId: id, published: false },
              include: chapterInclude,
              orderBy: { number: "asc" },
            })
          : [];
      const follow = userId
        ? await prisma.comicFollow.findUnique({
            where: { seriesId_userId: { seriesId: id, userId } },
          })
        : null;
      const progress = userId
        ? await prisma.readingProgress.findUnique({
            where: { seriesId_userId: { seriesId: id, userId } },
          })
        : null;
      return safeJson({
        series: {
          ...series,
          chapters: [...series.chapters, ...drafts].sort((a, b) => a.number - b.number),
        },
        following: !!follow,
        progress,
      });
    }

    const series = await prisma.comicSeries.findMany({
      where: { creator: { is: visibleCreatorWhere(userId) } },
      include: {
        creator: { select: creatorSelect },
        _count: { select: { chapters: { where: { published: true } }, follows: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    let continueReading: unknown[] = [];
    if (userId) {
      continueReading = await prisma.readingProgress.findMany({
        where: { userId },
        include: {
          series: {
            include: {
              creator: { select: creatorSelect },
              chapters: {
                where: { published: true },
                include: { pages: { orderBy: { position: "asc" } } },
                orderBy: { number: "asc" },
              },
            },
          },
          chapter: {
            include: { pages: { orderBy: { position: "asc" } } },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      });
    }

    return safeJson(await filterVisibleContent({ series, continueReading }, userId));
  } catch (error) {
    console.error("GET comics", error);
    return fail("Could not load comics", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const user = await getSessionUser(req);
    if (!user) return fail("Sign in required", 401);
    const userId = user.id;
    if (action === "create_series") {
      const title = clean(body.title), description = clean(body.description, 4000);
      if (!title || !localImage(body.coverUrl) || body.permissionConfirmed !== true) return fail("Title, uploaded cover, and permission confirmation are required");
      const direction = ["rtl", "ltr", "vertical"].includes(body.direction) ? body.direction : "rtl";
      const status = ["ongoing", "completed"].includes(body.status) ? body.status : "ongoing";
      const series = await prisma.comicSeries.create({ data: { title, description, coverUrl: body.coverUrl, genres: clean(body.genres, 500), tags: clean(body.tags, 500), direction, status, creatorId: userId } });
      return safeJson({ series }, { status: 201 });
    }
    if (action === "chapter_comment") {
      const chapterId = typeof body.chapterId === "string" ? body.chapterId : "";
      const content = clean(body.content, 2000);
      const reaction = clean(body.reaction, 32);
      if (!chapterId || !content) return fail("Comment content and chapter ID are required");
      const chapter = await prisma.comicChapter.findUnique({
        where: { id: chapterId },
        include: { series: true },
      });
      if (!chapter || (!chapter.published && chapter.series.creatorId !== userId)) {
        return fail("Chapter not found", 404);
      }
      if (!await canViewCreator(chapter.series.creatorId, userId)) return fail("Chapter not found", 404);
      const comment = await prisma.chapterComment.create({
        data: {
          chapterId: chapter.id,
          authorId: userId,
          content,
          reaction,
        },
        include: {
          author: { select: creatorSelect },
        },
      });
      return safeJson({ comment }, { status: 201 });
    }
    const series = typeof body.seriesId === "string" ? await prisma.comicSeries.findUnique({ where: { id: body.seriesId } }) : null;
    if (!series) return fail("Series not found", 404);
    const canManage = series.creatorId === userId || isModerator(user);
    if (!canManage && !await canViewCreator(series.creatorId, userId)) return fail("Series not found", 404);
    if (action === "follow") {
      const key = { seriesId: series.id, userId };
      const existing = await prisma.comicFollow.findUnique({ where: { seriesId_userId: key } });
      if (existing) await prisma.comicFollow.delete({ where: { seriesId_userId: key } });
      else await prisma.comicFollow.create({ data: key });
      return safeJson({ following: !existing });
    }
    if (action === "progress") {
      const chapter = await prisma.comicChapter.findFirst({ where: { id: body.chapterId, seriesId: series.id, published: true }, include: { _count: { select: { pages: true } } } });
      if (!chapter || !Number.isInteger(body.page) || body.page < 0 || body.page >= chapter._count.pages) return fail("Invalid reading position");
      const data = { chapterId: chapter.id, page: body.page };
      await prisma.readingProgress.upsert({ where: { seriesId_userId: { seriesId: series.id, userId } }, create: { seriesId: series.id, userId, ...data }, update: data });
      return safeJson({ saved: true });
    }
    if (!canManage) return fail("Only the creator or a moderator can edit this series", 403);
    if (action === "create_chapter") {
      const title = clean(body.title), number = Number(body.number), pages = body.pages;
      if (!title || !Number.isInteger(number) || number < 1 || !Array.isArray(pages) || pages.length < 1 || pages.length > 200 || !pages.every(localImage) || body.permissionConfirmed !== true) return fail("A title, chapter number, 1–200 uploaded image pages, and permission confirmation are required");
      for (const url of pages) {
        if (url.startsWith("/api/private-media/")) {
          const upload = await prisma.upload.findUnique({ where: { filename: url.split("/").pop()! } });
          if (!upload || upload.ownerId !== userId || upload.kind !== "comic") return fail("Invalid comic page", 403);
        } else if (!url.startsWith("/sfw/image/") && !url.startsWith("/api/media/image/")) {
          return fail("Comic pages must be uploaded image files");
        }
      }
      if (await prisma.comicChapter.findUnique({ where: { seriesId_number: { seriesId: series.id, number } } })) return fail("That chapter number already exists", 409);
      const publish = body.published === true;
      const chapter = await prisma.$transaction(async tx => {
        const created = await tx.comicChapter.create({ data: { seriesId: series.id, title, number, published: publish, publishedAt: publish ? new Date() : null, pages: { create: pages.map((url: string, position: number) => ({ url, position })) } } });
        if (publish) {
          const followers = await tx.comicFollow.findMany({ where: { seriesId: series.id, userId: { not: userId } }, select: { userId: true } });
          for (const follower of followers) await tx.notification.create({ data: { recipientId: follower.userId, actorId: userId, type: "comic_chapter", comicSeriesId: series.id, text: `${series.title}: ${title} is now available.` } });
          await tx.comicSeries.update({ where: { id: series.id }, data: { updatedAt: new Date() } });
        }
        return created;
      });
      return safeJson({ chapter }, { status: 201 });
    }
    if (action === "publish_chapter") {
      const chapter = await prisma.comicChapter.findFirst({ where: { id: body.chapterId, seriesId: series.id, published: false } });
      if (!chapter) return fail("Draft not found", 404);
      await prisma.$transaction(async tx => {
        const updated = await tx.comicChapter.updateMany({ where: { id: chapter.id, published: false }, data: { published: true, publishedAt: new Date() } });
        if (!updated.count) return;
        const followers = await tx.comicFollow.findMany({ where: { seriesId: series.id, userId: { not: userId } }, select: { userId: true } });
        for (const follower of followers) await tx.notification.create({ data: { recipientId: follower.userId, actorId: userId, type: "comic_chapter", comicSeriesId: series.id, text: `${series.title}: ${chapter.title} is now available.` } });
        await tx.comicSeries.update({ where: { id: series.id }, data: { updatedAt: new Date() } });
      });
      return safeJson({ published: true });
    }
    if (action === "delete_chapter") {
      const chapter = await prisma.comicChapter.findFirst({
        where: { id: body.chapterId, seriesId: series.id },
      });
      if (!chapter) return fail("Chapter not found", 404);
      await prisma.comicChapter.delete({ where: { id: chapter.id } });
      return safeJson({ deleted: true });
    }
    if (action === "delete_series") {
      await prisma.comicSeries.delete({ where: { id: series.id } });
      return safeJson({ deleted: true });
    }
    return fail("Unknown action");
  } catch (error) { console.error("POST comics", error); return fail("Could not save comic", 500); }
}
