import { safeJson } from "@/lib/safe-json";
import { NextRequest } from "next/server";
import { getSessionUser, isModerator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filterVisibleContent, visibleCreatorWhere } from "@/lib/content-visibility";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    const activeUserId = sessionUser?.id || "__anonymous__";
    const moderator = isModerator(sessionUser);

    const [
      users,
      tags,
      albums,
      collections,
      favorites,
      follows,
      allFollows,
      messages,
      notifications,
      reports,
      tagSuggestions,
      searchLogs,
      totalPosts,
      siteSetting,
      tagFollows,
    ] = await Promise.all([
      prisma.user.findMany({
        include: {
          _count: {
            select: {
              createdPosts: true,
              followers: true,
              following: true,
              albums: true,
            },
          },
        },
        orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
      }),
      prisma.tag.findMany({
        include: {
          _count: { select: { posts: true } },
        },
        orderBy: [{ trending: "desc" }, { usageCount: "desc" }],
      }),
      prisma.album.findMany({
        where: { creator: { is: visibleCreatorWhere(sessionUser?.id) } },
        include: {
          creator: true,
          posts: {
            include: {
              tags: { include: { tag: true } },
              creator: true,
              _count: { select: { favorites: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { posts: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.collection.findMany({
        where: {
          owner: { is: visibleCreatorWhere(sessionUser?.id) },
          OR: [{ isPublic: true }, { ownerId: activeUserId }],
        },
        include: {
          owner: true,
          items: {
            include: {
              post: {
                include: {
                  creator: true,
                  tags: { include: { tag: true } },
                  _count: { select: { favorites: true } },
                },
              },
              album: {
                include: {
                  creator: true,
                  _count: { select: { posts: true } },
                },
              },
              creator: {
                include: {
                  _count: { select: { createdPosts: true, followers: true } },
                },
              },
            },
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: [{ isCurated: "desc" }, { createdAt: "desc" }],
      }),
      prisma.favorite.findMany({
        where: { userId: activeUserId },
      }),
      prisma.follow.findMany({
        where: { followerId: activeUserId, approved: true },
      }),
      prisma.follow.findMany({
        where: { approved: true },
        include: {
          follower: {
            include: {
              _count: { select: { followers: true, following: true, createdPosts: true } },
            },
          },
          following: {
            include: {
              _count: { select: { followers: true, following: true, createdPosts: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.directMessage.findMany({
        where: {
          OR: [{ senderId: activeUserId }, { receiverId: activeUserId }],
        },
        include: {
          sender: true,
          receiver: true,
          replyTo: {
            include: { sender: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.notification.findMany({
        where: { recipientId: activeUserId },
        include: {
          actor: true,
          post: {
            include: { creator: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      moderator ? prisma.report.findMany({
        include: {
          post: { include: { creator: true } },
          reportedUser: true,
          reporter: true,
        },
        orderBy: { createdAt: "desc" },
      }) : Promise.resolve([]),
      moderator ? prisma.tagSuggestion.findMany({
        include: {
          post: { include: { creator: true } },
          suggestedBy: true,
        },
        orderBy: { createdAt: "desc" },
      }) : Promise.resolve([]),
      moderator ? prisma.searchLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
      }) : Promise.resolve([]),
      prisma.post.count(),
      prisma.siteSetting.findUnique({ where: { id: "global" } }),
      activeUserId !== "__anonymous__"
        ? prisma.tagFollow.findMany({
            where: { userId: activeUserId },
            include: { tag: true },
          })
        : Promise.resolve([]),
    ]);

    const currentUser =
      users.find((u) => u.id === activeUserId) || null;

    const postAgg = await prisma.post.aggregate({
      _sum: { views: true },
    });
    const totalFavorites = await prisma.favorite.count();
    const totalFollows = await prisma.follow.count();

    return safeJson(await filterVisibleContent({
      currentUser,
      users,
      tags,
      albums,
      collections,
      userFavoritePostIds: favorites.map((f) => f.postId),
      userFollowingIds: follows.map((f) => f.followingId),
      userFollowedTagNames: tagFollows.map((tf) => tf.tag.name),
      allFollows,
      messages,
      notifications,
      siteSettings: siteSetting || null,
      announcementBanner: siteSetting?.announcementBanner || "",
      moderation: {
        reports,
        tagSuggestions,
        searchLogs,
        metrics: {
          totalPosts,
          totalViews: postAgg._sum.views || 0,
          totalFavorites,
          totalFollows,
          activeCreators: users.filter((u) => u.isCreator).length,
          zeroResultSearches: searchLogs.filter((s) => s.resultsCount === 0),
        },
      },
    }, sessionUser?.id));
  } catch (error) {
    console.error("Bootstrap API error:", error);
    return safeJson(
      { error: "Failed to load bootstrap data" },
      { status: 500 }
    );
  }
}
