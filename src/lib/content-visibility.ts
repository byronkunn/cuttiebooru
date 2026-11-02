import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function isHostedMediaUrl(url: string) {
  return /^(?:\/sfw\/(?:image|video|avatar|banner-image)|\/api\/media\/(?:image|video|avatar|banner-image)|\/api\/private-media)\/[a-z0-9_-]+\.(?:jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(url);
}

export function visibleCreatorWhere(userId?: string): Prisma.UserWhereInput {
  return {
    OR: [
      { privateProfile: false },
      ...(userId
        ? [
            { id: userId },
            { followers: { some: { followerId: userId, approved: true } } },
          ]
        : []),
    ],
  };
}

export function visiblePostWhere(userId?: string): Prisma.PostWhereInput {
  return { creator: { is: visibleCreatorWhere(userId) } };
}

export async function canViewCreator(creatorId: string, userId?: string) {
  return !!(await prisma.user.findFirst({
    where: { AND: [{ id: creatorId }, visibleCreatorWhere(userId)] },
    select: { id: true },
  }));
}

// Nested collections, notifications and album references must obey the same policy.
export async function filterVisibleContent(body: unknown, userId?: string) {
  const hiddenCreators = await prisma.user.findMany({
    where: { NOT: visibleCreatorWhere(userId) },
    select: { id: true },
  });
  const hidden = new Set(hiddenCreators.map((user) => user.id));
  const hiddenSeries = await prisma.comicSeries.findMany({
    where: { creatorId: { in: Array.from(hidden) } },
    select: { id: true },
  });
  const hiddenSeriesIds = new Set(hiddenSeries.map((series) => series.id));
  function filter(value: unknown): unknown {
    if (value instanceof Date) return value;
    if (Array.isArray(value)) {
      return value.map(filter).filter((item) => item !== null);
    }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record.creatorId === "string" && hidden.has(record.creatorId)) {
        return null;
      }
      if (typeof record.comicSeriesId === "string" && hiddenSeriesIds.has(record.comicSeriesId)) {
        return null;
      }
      if (record.type === "saved_search" && typeof record.actorId === "string" && hidden.has(record.actorId)) {
        return null;
      }
      if ("items" in record && typeof record.ownerId === "string" && hidden.has(record.ownerId)) {
        return null;
      }
      const entries = Object.entries(record).map(([key, item]) => [key, filter(item)] as const);
      if (entries.some(([key, item]) =>
        ["post", "album", "series"].includes(key) && record[key] != null && item === null
      )) return null;
      return Object.fromEntries(entries);
    }
    return value;
  }
  return filter(body);
}

export async function canViewMediaUrls(urls: string[], userId?: string) {
  const hiddenCreator = { is: { NOT: visibleCreatorWhere(userId) } };
  const upload = await prisma.upload.findFirst({
    where: {
      filename: { in: urls.map((url) => url.split("/").pop() || "") },
      owner: hiddenCreator,
    },
    select: { id: true },
  });
  if (upload) return false;
  const privateMessage = await prisma.directMessage.findFirst({
    where: {
      mediaUrl: { in: urls },
      ...(userId
        ? { NOT: { OR: [{ senderId: userId }, { receiverId: userId }] } }
        : {}),
    },
    select: { id: true },
  });
  if (privateMessage) return false;
  const draft = await prisma.comicPage.findFirst({
    where: {
      url: { in: urls },
      chapter: {
        published: false,
        ...(userId ? { series: { creatorId: { not: userId } } } : {}),
      },
    },
    select: { id: true },
  });
  if (draft) return false;
  const post = await prisma.post.findFirst({
    where: {
      creator: hiddenCreator,
      OR: [
        { mediaUrl: { in: urls } },
        { thumbnailUrl: { in: urls } },
        ...urls.map((url) => ({ galleryUrls: { contains: JSON.stringify(url) } })),
      ],
    },
    select: { id: true },
  });
  if (post) return false;
  const [album, series, page] = await Promise.all([
    prisma.album.findFirst({
      where: { creator: hiddenCreator, coverUrl: { in: urls } },
      select: { id: true },
    }),
    prisma.comicSeries.findFirst({
      where: { creator: hiddenCreator, coverUrl: { in: urls } },
      select: { id: true },
    }),
    prisma.comicPage.findFirst({
      where: { url: { in: urls }, chapter: { series: { creator: hiddenCreator } } },
      select: { id: true },
    }),
  ]);
  return !album && !series && !page;
}

export async function hiddenMediaUrls(userId?: string) {
  const hiddenCreator = { is: { NOT: visibleCreatorWhere(userId) } };
  const [posts, albums, series, pages, uploads, messages, drafts] = await Promise.all([
    prisma.post.findMany({
      where: { creator: hiddenCreator },
      select: { mediaUrl: true, thumbnailUrl: true, galleryUrls: true },
    }),
    prisma.album.findMany({ where: { creator: hiddenCreator }, select: { coverUrl: true } }),
    prisma.comicSeries.findMany({ where: { creator: hiddenCreator }, select: { coverUrl: true } }),
    prisma.comicPage.findMany({
      where: { chapter: { series: { creator: hiddenCreator } } },
      select: { url: true },
    }),
    prisma.upload.findMany({ where: { owner: hiddenCreator }, select: { filename: true } }),
    prisma.directMessage.findMany({
      where: userId ? { NOT: { OR: [{ senderId: userId }, { receiverId: userId }] } } : {},
      select: { mediaUrl: true },
    }),
    prisma.comicPage.findMany({
      where: { chapter: { published: false, ...(userId ? { series: { creatorId: { not: userId } } } : {}) } },
      select: { url: true },
    }),
  ]);
  const rawUrls: string[] = [
    ...posts.flatMap((post) => {
      let gallery: string[] = [];
      if (post.galleryUrls) {
        try {
          const parsed = JSON.parse(post.galleryUrls);
          if (Array.isArray(parsed)) gallery = parsed.filter((u): u is string => typeof u === "string");
        } catch {
          // ignore malformed JSON
        }
      }
      return [post.mediaUrl, post.thumbnailUrl, ...gallery];
    }),
    ...albums.map((album) => album.coverUrl),
    ...series.map((item) => item.coverUrl),
    ...pages.map((page) => page.url),
    ...messages.map((message) => message.mediaUrl),
    ...drafts.map((page) => page.url),
  ];

  const urls = new Set(
    rawUrls
      .filter((url): url is string => typeof url === "string" && url.trim().length > 0)
      .map((url) => url.replace(/^\/sfw\//, "/api/media/"))
  );
  for (const upload of uploads) {
    for (const folder of ["image", "video", "avatar", "banner-image"]) {
      urls.add(`/api/media/${folder}/${upload.filename}`);
    }
  }
  return urls;
}
