import { safeJson } from "@/lib/safe-json";
import { NextRequest } from "next/server";
import { getSessionUser, unauthorized, forbidden } from "@/lib/auth";
import { TAG_CATEGORY_IDS } from "@/lib/tag-taxonomy";
import { prisma } from "@/lib/prisma";
import { validateAnnouncementBanner } from "@/lib/announcement";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return unauthorized();
    if (user.role !== "admin") return forbidden();
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") || "overview";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(
      1,
      Math.min(50, parseInt(searchParams.get("limit") || "10", 10))
    );
    const rawSearch = (searchParams.get("search") || "").trim().toLowerCase();
    const search = section === "users" ? rawSearch.replace(/^@/, "")
      : section === "tags" ? rawSearch.replace(/^#/, "") : rawSearch;
    const filter = searchParams.get("filter") || "all";

    const skip = (page - 1) * limit;

    // Always include summary KPIs + site settings
    const [
      totalPosts,
      sfwPostsCount,
      questionablePostsCount,
      explicitPostsCount,
      videoPostsCount,
      totalUsers,
      verifiedUsersCount,
      bannedUsersCount,
      totalTags,
      nsfwTagsCount,
      openReportsCount,
      pendingSuggestionsCount,
      totalFavorites,
      totalFollows,
      totalMessages,
      totalCollections,
      zeroSearchesCount,
      siteSettings,
      allPostsForViews,
    ] = await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { rating: "sfw" } }),
      prisma.post.count({ where: { rating: "questionable" } }),
      prisma.post.count({ where: { rating: "explicit" } }),
      prisma.post.count({ where: { mediaType: "video" } }),
      prisma.user.count(),
      prisma.user.count({ where: { isVerified: true } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.tag.count(),
      prisma.tag.count({ where: { category: "content" } }),
      prisma.report.count({ where: { status: "open" } }),
      prisma.tagSuggestion.count({ where: { status: "pending" } }),
      prisma.favorite.count(),
      prisma.follow.count(),
      prisma.directMessage.count(),
      prisma.collection.count(),
      prisma.searchLog.count({ where: { resultsCount: 0 } }),
      prisma.siteSetting.findUnique({ where: { id: "global" } }),
      prisma.post.findMany({
        select: { views: true, category: true, rating: true },
      }),
    ]);

    const totalViews = allPostsForViews.reduce((acc, p) => acc + p.views, 0);

    // Category breakdown for analytics charts
    const categoryStats: Record<string, { posts: number; views: number }> = {};
    for (const p of allPostsForViews) {
      if (!categoryStats[p.category]) {
        categoryStats[p.category] = { posts: 0, views: 0 };
      }
      categoryStats[p.category].posts += 1;
      categoryStats[p.category].views += p.views;
    }

    const kpis = {
      totalPosts,
      sfwPostsCount,
      questionablePostsCount,
      explicitPostsCount,
      videoPostsCount,
      totalViews,
      totalUsers,
      verifiedUsersCount,
      bannedUsersCount,
      totalTags,
      nsfwTagsCount,
      openReportsCount,
      pendingSuggestionsCount,
      totalFavorites,
      totalFollows,
      totalMessages,
      totalCollections,
      zeroSearchesCount,
      categoryStats,
    };

    if (section === "overview") {
      const [topTags, topCreators, recentReports, recentZeroSearches] =
        await Promise.all([
          prisma.tag.findMany({
            include: { _count: { select: { posts: true } } },
            orderBy: { usageCount: "desc" },
            take: 10,
          }),
          prisma.user.findMany({
            include: {
              _count: {
                select: {
                  createdPosts: true,
                  followers: true,
                  favorites: true,
                },
              },
            },
            orderBy: { featured: "desc" },
            take: 6,
          }),
          prisma.report.findMany({
            include: {
              post: { include: { creator: true } },
              reportedUser: true,
              reporter: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
          prisma.searchLog.findMany({
            where: { resultsCount: 0 },
            orderBy: { createdAt: "desc" },
            take: 6,
          }),
        ]);

      return safeJson({
        kpis,
        siteSettings,
        topTags,
        topCreators,
        recentReports,
        recentZeroSearches,
      });
    }

    if (section === "posts") {
      const whereClause: Record<string, unknown> = {};
      if (filter === "sfw" || filter === "questionable" || filter === "explicit") {
        whereClause.rating = filter;
      } else if (filter === "video") {
        whereClause.mediaType = "video";
      } else if (filter === "featured") {
        whereClause.featured = true;
      }
      if (search) {
        whereClause.OR = [
          { title: { contains: search } },
          { description: { contains: search } },
          { category: { contains: search } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.post.findMany({
          where: whereClause,
          include: {
            creator: true,
            tags: { include: { tag: true } },
            _count: { select: { favorites: true, reports: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.post.count({ where: whereClause }),
      ]);

      return safeJson({
        kpis,
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    }

    if (section === "users") {
      const whereClause: Record<string, unknown> = {};
      if (filter === "verified") whereClause.isVerified = true;
      else if (filter === "moderator") whereClause.isModerator = true;
      else if (filter === "banned") whereClause.isBanned = true;

      if (search) {
        whereClause.OR = [
          { username: { contains: search } },
          { displayName: { contains: search } },
          { email: { contains: search } },
          { niche: { contains: search } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          include: {
            _count: {
              select: {
                createdPosts: true,
                followers: true,
                following: true,
                reportsReceived: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
          skip,
          take: limit,
        }),
        prisma.user.count({ where: whereClause }),
      ]);

      return safeJson({
        kpis,
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    }

    if (section === "tags") {
      const whereClause: Record<string, unknown> = {};
      if (filter !== "all") {
        whereClause.category = filter;
      }
      if (search) {
        whereClause.OR = [
          { name: { contains: search } },
          { displayName: { contains: search } },
          { description: { contains: search } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.tag.findMany({
          where: whereClause,
          include: { _count: { select: { posts: true } } },
          orderBy: [{ usageCount: "desc" }, { name: "asc" }],
          skip,
          take: limit,
        }),
        prisma.tag.count({ where: whereClause }),
      ]);

      return safeJson({
        kpis,
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    }

    if (section === "suggestions") {
      const whereClause: Record<string, unknown> = {};
      if (filter !== "all") {
        whereClause.status = filter;
      }

      const [items, total] = await Promise.all([
        prisma.tagSuggestion.findMany({
          where: whereClause,
          include: {
            post: { include: { creator: true } },
            suggestedBy: true,
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.tagSuggestion.count({ where: whereClause }),
      ]);

      return safeJson({
        kpis,
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    }

    if (section === "reports") {
      const whereClause: Record<string, unknown> = {};
      if (filter !== "all") {
        whereClause.status = filter;
      }

      const [items, total] = await Promise.all([
        prisma.report.findMany({
          where: whereClause,
          include: {
            post: { include: { creator: true, tags: { include: { tag: true } } } },
            reportedUser: true,
            reporter: true,
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.report.count({ where: whereClause }),
      ]);

      return safeJson({
        kpis,
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    }

    if (section === "logs") {
      const whereClause: Record<string, unknown> = {};
      if (filter === "zero") {
        whereClause.resultsCount = 0;
      }
      if (search) {
        whereClause.query = { contains: search };
      }

      const [items, total] = await Promise.all([
        prisma.searchLog.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.searchLog.count({ where: whereClause }),
      ]);

      return safeJson({
        kpis,
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    }

    if (section === "collections") {
      const [items, total] = await Promise.all([
        prisma.collection.findMany({
          include: {
            owner: true,
            _count: { select: { items: true } },
          },
          orderBy: [{ isCurated: "desc" }, { createdAt: "desc" }],
          skip,
          take: limit,
        }),
        prisma.collection.count(),
      ]);

      return safeJson({
        kpis,
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    }

    return safeJson({ kpis, siteSettings });
  } catch (error) {
    console.error("GET /api/admin error:", error);
    return safeJson(
      { error: "Failed to load admin data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return unauthorized();
    if (user.role !== "admin") return forbidden();
    const body = await req.json();
    const { action } = body;

    if (action === "update_post") {
      const { postId, rating, featured, title, category } = body;
      const updated = await prisma.post.update({
        where: { id: postId },
        data: {
          ...(rating !== undefined ? { rating } : {}),
          ...(featured !== undefined ? { featured: Boolean(featured) } : {}),
          ...(title !== undefined ? { title } : {}),
          ...(category !== undefined ? { category } : {}),
        },
      });
      return safeJson({ post: updated });
    }

    if (action === "delete_post") {
      const { postId } = body;
      await prisma.post.delete({ where: { id: postId } });
      return safeJson({ deleted: true });
    }

    if (action === "update_user") {
      const { userId, role, isVerified, isModerator, isBanned, featured } = body;
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(role !== undefined
            ? {
                role,
                isModerator: role === "admin" || role === "moderator",
              }
            : {}),
          ...(isVerified !== undefined
            ? { isVerified: Boolean(isVerified) }
            : {}),
          ...(isModerator !== undefined
            ? { isModerator: Boolean(isModerator) }
            : {}),
          ...(isBanned !== undefined ? { isBanned: Boolean(isBanned) } : {}),
          ...(featured !== undefined ? { featured: Boolean(featured) } : {}),
        },
      });
      return safeJson({ user: updated });
    }

    if (action === "delete_user") {
      const { userId } = body;
      await prisma.user.delete({ where: { id: userId } });
      return safeJson({ deleted: true });
    }

    if (action === "create_tag") {
      const { name, category = "general", description = "", trending = false } = body;
      if (!TAG_CATEGORY_IDS.has(category)) return safeJson({ error: "Invalid tag category" }, { status: 400 });
      const clean = (name || "")
        .trim()
        .toLowerCase()
        .replace(/^#/, "")
        .replace(/\s+/g, "_");
      if (!clean) {
        return safeJson({ error: "Tag name required" }, { status: 400 });
      }
      const displayName = clean
        .split("_")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const tag = await prisma.tag.upsert({
        where: { name: clean },
        update: { category, description, trending: Boolean(trending) },
        create: {
          name: clean,
          displayName,
          category,
          description: description || `Booru tag #${clean}`,
          trending: Boolean(trending),
          usageCount: 0,
        },
      });
      return safeJson({ tag });
    }

    if (action === "update_tag") {
      const { tagId, category, description, trending } = body;
      if (category !== undefined && !TAG_CATEGORY_IDS.has(category)) return safeJson({ error: "Invalid tag category" }, { status: 400 });
      const tag = await prisma.tag.update({
        where: { id: tagId },
        data: {
          ...(category !== undefined ? { category } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(trending !== undefined ? { trending: Boolean(trending) } : {}),
        },
      });
      return safeJson({ tag });
    }

    if (action === "delete_tag") {
      const { tagId } = body;
      await prisma.tag.delete({ where: { id: tagId } });
      return safeJson({ deleted: true });
    }

    if (action === "merge_tags") {
      const { sourceTagName, targetTagName } = body;
      const cleanSource = (sourceTagName || "")
        .trim()
        .toLowerCase()
        .replace(/^#/, "")
        .replace(/\s+/g, "_");
      const cleanTarget = (targetTagName || "")
        .trim()
        .toLowerCase()
        .replace(/^#/, "")
        .replace(/\s+/g, "_");

      const sourceTag = await prisma.tag.findUnique({
        where: { name: cleanSource },
      });
      if (!sourceTag) {
        return safeJson(
          { error: `Source tag #${cleanSource} not found` },
          { status: 404 }
        );
      }

      const displayName = cleanTarget
        .split("_")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const targetTag = await prisma.tag.upsert({
        where: { name: cleanTarget },
        update: {},
        create: {
          name: cleanTarget,
          displayName,
          category: sourceTag.category,
          description: sourceTag.description,
          usageCount: sourceTag.usageCount,
        },
      });

      const postTags = await prisma.postTag.findMany({
        where: { tagId: sourceTag.id },
      });
      for (const pt of postTags) {
        const exists = await prisma.postTag.findUnique({
          where: {
            postId_tagId: { postId: pt.postId, tagId: targetTag.id },
          },
        });
        if (!exists) {
          await prisma.postTag.create({
            data: { postId: pt.postId, tagId: targetTag.id },
          });
        }
      }

      await prisma.tag.delete({ where: { id: sourceTag.id } });
      return safeJson({ merged: true });
    }

    if (action === "review_suggestion") {
      const { suggestionId, decision } = body;
      const suggestion = await prisma.tagSuggestion.findUnique({
        where: { id: suggestionId },
      });
      if (!suggestion) {
        return safeJson({ error: "Not found" }, { status: 404 });
      }
      if (decision === "approved") {
        const displayName = suggestion.tagName
          .split("_")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        const tag = await prisma.tag.upsert({
          where: { name: suggestion.tagName },
          update: { usageCount: { increment: 1 } },
          create: {
            name: suggestion.tagName,
            displayName,
            category: suggestion.tagCategory || "general",
            usageCount: 1,
          },
        });
        const exists = await prisma.postTag.findUnique({
          where: {
            postId_tagId: { postId: suggestion.postId, tagId: tag.id },
          },
        });
        if (!exists) {
          await prisma.postTag.create({
            data: { postId: suggestion.postId, tagId: tag.id },
          });
        }
      }
      await prisma.tagSuggestion.update({
        where: { id: suggestionId },
        data: { status: decision },
      });
      return safeJson({ updated: true });
    }

    if (action === "resolve_report") {
      const { reportId, status, removePost } = body;
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      });
      if (report && removePost && report.postId) {
        await prisma.post.delete({ where: { id: report.postId } }).catch(() => null);
      }
      await prisma.report.update({
        where: { id: reportId },
        data: { status: status || "resolved" },
      });
      return safeJson({ updated: true });
    }

    if (action === "update_collection") {
      const { collectionId, isCurated, isPublic, badgeText } = body;
      const col = await prisma.collection.update({
        where: { id: collectionId },
        data: {
          ...(isCurated !== undefined ? { isCurated: Boolean(isCurated) } : {}),
          ...(isPublic !== undefined ? { isPublic: Boolean(isPublic) } : {}),
          ...(badgeText !== undefined ? { badgeText } : {}),
        },
      });
      return safeJson({ collection: col });
    }

    if (action === "delete_collection") {
      const { collectionId } = body;
      await prisma.collection.delete({ where: { id: collectionId } });
      return safeJson({ deleted: true });
    }

    if (action === "clear_zero_searches") {
      await prisma.searchLog.deleteMany({ where: { resultsCount: 0 } });
      return safeJson({ cleared: true });
    }

    if (action === "update_settings") {
      const {
        siteName,
        allow18Plus,
        requireAgeGate,
        blurExplicitByDefault,
        openUploads,
        announcementBanner,
        maintenanceMode,
      } = body;

      if (announcementBanner !== undefined) {
        const error = validateAnnouncementBanner(announcementBanner);
        if (error) return safeJson({ error }, { status: 400 });
      }

      const settings = await prisma.siteSetting.upsert({
        where: { id: "global" },
        update: {
          ...(siteName !== undefined ? { siteName } : {}),
          ...(allow18Plus !== undefined
            ? { allow18Plus: Boolean(allow18Plus) }
            : {}),
          ...(requireAgeGate !== undefined
            ? { requireAgeGate: Boolean(requireAgeGate) }
            : {}),
          ...(blurExplicitByDefault !== undefined
            ? { blurExplicitByDefault: Boolean(blurExplicitByDefault) }
            : {}),
          ...(openUploads !== undefined
            ? { openUploads: Boolean(openUploads) }
            : {}),
          ...(announcementBanner !== undefined ? { announcementBanner } : {}),
          ...(maintenanceMode !== undefined
            ? { maintenanceMode: Boolean(maintenanceMode) }
            : {}),
        },
        create: {
          id: "global",
          siteName: siteName || "Cuttiebooru",
          allow18Plus: allow18Plus ?? true,
          requireAgeGate: requireAgeGate ?? false,
          blurExplicitByDefault: blurExplicitByDefault ?? false,
          openUploads: openUploads ?? true,
          announcementBanner: announcementBanner || "",
          maintenanceMode: maintenanceMode ?? false,
        },
      });
      return safeJson({ siteSettings: settings });
    }

    return safeJson({ error: "Invalid admin action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/admin error:", error);
    return safeJson(
      { error: "Failed to execute admin action" },
      { status: 500 }
    );
  }
}
