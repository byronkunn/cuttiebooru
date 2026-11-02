import { safeJson } from "@/lib/safe-json";
import { isProfileLinkAllowed } from "@/lib/profile-links";
import { NextRequest } from "next/server";
import { getSessionUser, unauthorized, forbidden } from "@/lib/auth";
import { STARTER_TAGS } from "@/lib/tag-taxonomy";
import { prisma } from "@/lib/prisma";
import { savedSearchMatchesPost } from "@/lib/saved-search";
import { visiblePostWhere, canViewCreator, isHostedMediaUrl } from "@/lib/content-visibility";
import type { Prisma } from "@prisma/client";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

const starterCategories = new Map(STARTER_TAGS.map(tag => [tag.name, tag.category]));

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const includeTagsParam = searchParams.get("tags") || "";
    const excludeTagsParam = searchParams.get("excludeTags") || "";
    const category = searchParams.get("category") || "all";
    const mediaType = searchParams.get("mediaType") || "all";
    const rating = searchParams.get("rating") || "all"; // all | sfw | questionable | explicit
    const creatorId = searchParams.get("creatorId") || "";
    const albumId = searchParams.get("albumId") || "";
    const tab = searchParams.get("tab") || "latest"; // latest | popular | following | random
    const sessionUser = await getSessionUser(req);
    const userId = sessionUser?.id || "__anonymous__";
    const logSearch = searchParams.get("logSearch") === "true";
    const siteSettings = await prisma.siteSetting.findUnique({ where: { id: "global" } });

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || "12", 10))
    );

    const rawTokens = q
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const queryExcluded: string[] = [];
    const queryIncluded: string[] = [];

    for (const token of rawTokens) {
      if (token.startsWith("-") && token.length > 1) {
        queryExcluded.push(token.slice(1).toLowerCase().replace(/^#/, ""));
      } else {
        queryIncluded.push(token.toLowerCase().replace(/^#/, ""));
      }
    }

    const explicitIncludedTags = includeTagsParam
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const explicitExcludedTags = [
      ...excludeTagsParam
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      ...queryExcluded,
    ];

    let followedIds: string[] = [];
    if (tab === "following") {
      const follows = await prisma.follow.findMany({
        where: { followerId: userId, approved: true },
      });
      followedIds = follows.map((f) => f.followingId);
    }

    const filters: Prisma.PostWhereInput[] = [visiblePostWhere(sessionUser?.id)];
    if (siteSettings?.allow18Plus === false) filters.push({ rating: "sfw" });
    if (category !== "all") filters.push({ category });
    if (mediaType !== "all") filters.push({ mediaType });
    if (rating !== "all") filters.push({ rating });
    if (tab === "following") {
      filters.push({ creatorId: { in: followedIds } });
    } else if (creatorId) {
      filters.push({ creatorId });
    }
    if (albumId) filters.push({ albumId });

    for (const tagName of explicitIncludedTags) {
      filters.push({ tags: { some: { tag: { name: tagName } } } });
    }

    for (const token of explicitExcludedTags) {
      filters.push({
        NOT: {
          OR: [
            {
              tags: {
                some: {
                  tag: {
                    OR: [
                      { name: { contains: token } },
                      { displayName: { contains: token } },
                    ],
                  },
                },
              },
            },
            { title: { contains: token } },
            { rating: token },
          ],
        },
      });
    }

    for (const token of queryIncluded) {
      filters.push({
        OR: [
          {
            tags: {
              some: {
                tag: {
                  OR: [
                    { name: { contains: token } },
                    { displayName: { contains: token } },
                  ],
                },
              },
            },
          },
          { title: { contains: token } },
          { description: { contains: token } },
          {
            creator: {
              is: {
                OR: [
                  { username: { contains: token } },
                  { displayName: { contains: token } },
                ],
              },
            },
          },
          { category: { contains: token } },
          { rating: { contains: token } },
        ],
      });
    }

    const where: Prisma.PostWhereInput = { AND: filters };
    const total = await prisma.post.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * limit;
    const include = {
      creator: {
        include: {
          _count: { select: { followers: true, createdPosts: true } },
        },
      },
      uploader: true,
      album: true,
      tags: { include: { tag: true } },
      tagSuggestions: {
        include: { suggestedBy: true },
        orderBy: { createdAt: "desc" as const },
      },
      _count: { select: { favorites: true, collectionItems: true } },
    };

    let paginatedPosts;
    if (tab === "popular" || tab === "random") {
      const seed = (searchParams.get("seed") || "default").slice(0, 100);
      let rankedIds: string[];
      if (tab === "popular") {
        const candidates = await prisma.post.findMany({
          where,
          select: {
            id: true,
            views: true,
            _count: { select: { favorites: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        rankedIds = candidates
          .sort(
            (a, b) =>
              b.views +
              b._count.favorites * 150 -
              (a.views + a._count.favorites * 150)
          )
          .map((post) => post.id);
      } else {
        const candidates = await prisma.post.findMany({
          where,
          select: { id: true },
          orderBy: { createdAt: "desc" },
        });
        rankedIds = candidates
          .map((post) => ({
            id: post.id,
            rank: createHash("sha256")
              .update(`${seed}:${post.id}`)
              .digest("hex"),
          }))
          .sort((a, b) => a.rank.localeCompare(b.rank))
          .map((post) => post.id);
      }

      const pageIds = rankedIds.slice(startIndex, startIndex + limit);
      const postsById = await prisma.post.findMany({
        where: { AND: [{ id: { in: pageIds } }, where] },
        include,
      });
      const postsByIdMap = new Map(postsById.map((post) => [post.id, post]));
      paginatedPosts = pageIds.flatMap((id) => {
        const post = postsByIdMap.get(id);
        return post ? [post] : [];
      });
    } else {
      paginatedPosts = await prisma.post.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip: startIndex,
        take: limit,
      });
    }

    if (logSearch && (q || explicitIncludedTags.length > 0)) {
      const logQuery = [
        q,
        ...explicitIncludedTags.map((t) => `#${t}`),
        ...explicitExcludedTags.map((t) => `-${t}`),
      ]
        .filter(Boolean)
        .join(" ");
      await prisma.searchLog.create({
        data: {
          query: logQuery,
          resultsCount: total,
        },
      });
    }

    return safeJson({
      posts: paginatedPosts,
      total,
      page: safePage,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("GET /api/posts error:", error);
    return safeJson(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return unauthorized();
    const siteSettings = await prisma.siteSetting.findUnique({ where: { id: "global" } });
    if (siteSettings?.maintenanceMode && user.role !== "admin") return safeJson({ error: "The site is in maintenance mode" }, { status: 503 });
    if (siteSettings?.openUploads === false && user.role !== "admin" && user.role !== "moderator") return safeJson({ error: "Uploads are currently closed" }, { status: 403 });
    const body = await req.json();
    const {
      title,
      description,
      mediaUrl,
      thumbnailUrl,
      galleryUrls = [],
      mediaType = "image",
      videoDuration = "",
      aspectRatio = "portrait",
      category = "Cute Art",
      rating,
      sourceUrl = "",
      attribution = "",
      permissionConfirmed = false,
      creatorId,
      albumId,
      newAlbumTitle,
      newAlbumDescription,
      tags = [],
    } = body;

    if (creatorId !== user.id) return forbidden();
    if (typeof sourceUrl !== "string" || sourceUrl.length > 2048 || (sourceUrl.trim() && !isProfileLinkAllowed(sourceUrl.trim()))) {
      return safeJson({ error: "Source URL must be a valid HTTP(S) URL of at most 2048 characters." }, { status: 400 });
    }
    if (typeof attribution !== "string" || attribution.length > 200) {
      return safeJson({ error: "Artist credit must be text of at most 200 characters." }, { status: 400 });
    }
    if (albumId) { const album = await prisma.album.findUnique({ where: { id: albumId } }); if (!album || album.creatorId !== user.id) return forbidden(); }
    if (!title || !mediaUrl || !creatorId) {
      return safeJson(
        { error: "Title, media file, and creator are required." },
        { status: 400 }
      );
    }

    if (!["sfw", "questionable", "explicit"].includes(rating)) {
      return safeJson({ error: "Choose a valid content rating." }, { status: 400 });
    }

    if (permissionConfirmed !== true) {
      return safeJson(
        { error: "You must confirm permission to share this content." },
        { status: 400 }
      );
    }
    if (user.privateProfile) {
      const urls: unknown[] = [mediaUrl, thumbnailUrl || mediaUrl, ...(Array.isArray(galleryUrls) ? galleryUrls : [])];
      if (!urls.every((url) => typeof url === "string" && isHostedMediaUrl(url))) {
        return safeJson({ error: "Protected posts require media uploaded to this site" }, { status: 400 });
      }
    }

    let targetAlbumId = albumId || null;
    if (newAlbumTitle && newAlbumTitle.trim()) {
      const createdAlbum = await prisma.album.create({
        data: {
          title: newAlbumTitle.trim(),
          description: (newAlbumDescription || "").trim(),
          coverUrl: thumbnailUrl || mediaUrl,
          category,
          creatorId,
        },
      });
      targetAlbumId = createdAlbum.id;
    }

    const cleanGallery = Array.isArray(galleryUrls)
      ? galleryUrls.filter(Boolean)
      : [];
    const allFiles = cleanGallery.length > 0 ? cleanGallery : [mediaUrl];

    const createdPost = await prisma.post.create({
      data: {
        title: title.trim(),
        description: (description || "").trim(),
        mediaUrl: mediaUrl.trim(),
        thumbnailUrl: (thumbnailUrl || mediaUrl).trim(),
        galleryUrls: JSON.stringify(allFiles),
        filesCount: allFiles.length,
        mediaType,
        videoDuration: mediaType === "video" ? videoDuration || "0:15" : "",
        aspectRatio,
        category,
        rating: ["sfw", "questionable", "explicit"].includes(rating)
          ? rating
          : "sfw",
        sourceUrl: sourceUrl.trim(),
        attribution: attribution.trim(),
        permissionConfirmed: Boolean(permissionConfirmed),
        views: 1,
        featured: false,
        creatorId,
        uploaderId: user.id,
        albumId: targetAlbumId,
      },
    });

    const normalizedTags: string[] = Array.isArray(tags)
      ? tags
          .map((t: string) =>
            t
              .trim()
              .toLowerCase()
              .replace(/^#/, "")
              .replace(/\s+/g, "_")
          )
          .filter(Boolean)
      : [];

    for (const tagName of Array.from(new Set(normalizedTags))) {
      const displayName = tagName
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const defaultCategory = starterCategories.get(tagName) || "general";

      const tagRecord = await prisma.tag.upsert({
        where: { name: tagName },
        update: { usageCount: { increment: 1 } },
        create: {
          name: tagName,
          displayName,
          category: defaultCategory,
          description: `Booru tag for ${displayName}`,
          usageCount: 1,
        },
      });

      await prisma.postTag.create({
        data: {
          postId: createdPost.id,
          tagId: tagRecord.id,
        },
      });
    }

    const fullPost = await prisma.post.findUnique({
      where: { id: createdPost.id },
      include: {
        creator: {
          include: {
            _count: { select: { followers: true, createdPosts: true } },
          },
        },
        uploader: true,
        album: true,
        tags: { include: { tag: true } },
        tagSuggestions: { include: { suggestedBy: true } },
        _count: { select: { favorites: true, collectionItems: true } },
      },
    });

    if (fullPost) {
      const alertSearches = await prisma.savedSearch.findMany({
        where: { alertsEnabled: true },
      });
      const matchedByOwner = new Map<string, string[]>();
      for (const search of alertSearches) {
        if (
          savedSearchMatchesPost(search, fullPost, siteSettings?.allow18Plus !== false) &&
          await canViewCreator(fullPost.creatorId, search.ownerId)
        ) {
          const names = matchedByOwner.get(search.ownerId) || [];
          names.push(search.name);
          matchedByOwner.set(search.ownerId, names);
        }
      }

      if (matchedByOwner.size > 0) {
        await prisma.notification.createMany({
          data: Array.from(matchedByOwner, ([recipientId, names]) => ({
            recipientId,
            actorId: fullPost.creatorId,
            type: "saved_search",
            postId: fullPost.id,
            text:
              names.length === 1
                ? `New post matches your saved search "${names[0]}"`
                : `New post matches ${names.length} of your saved searches, including "${names[0]}"`,
          })),
        });
      }
    }

    return safeJson({ post: fullPost });
  } catch (error) {
    console.error("POST /api/posts error:", error);
    return safeJson(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
