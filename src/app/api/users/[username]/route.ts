import { safeJson } from "@/lib/safe-json";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { filterVisibleContent } from "@/lib/content-visibility";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const rawUsername = params.username.trim().toLowerCase().replace(/^@/, "");
    const sessionUser = await getSessionUser(req);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: rawUsername } },
          { id: { equals: params.username } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        headerUrl: true,
        websiteUrl: true,
        niche: true,
        role: true,
        isVerified: true,
        isModerator: true,
        featured: true,
        spotlightQuote: true,
        socialLinks: true,
        privateProfile: true,
        showCollections: true,
        showFavorites: true,
        allowDMs: true,
        createdAt: true,
      },
    });

    if (!user) {
      return safeJson({ error: "User not found" }, { status: 404 });
    }

    const [followersCount, followingCount, follow] = await Promise.all([
      prisma.follow.count({
        where: { followingId: user.id, approved: true },
      }),
      prisma.follow.count({
        where: { followerId: user.id, approved: true },
      }),
      sessionUser
        ? prisma.follow
            .findUnique({
              where: {
                followerId_followingId: {
                  followerId: sessionUser.id,
                  followingId: user.id,
                },
              },
            })
        : Promise.resolve(null),
    ]);

    const isOwnProfile = sessionUser?.id === user.id;
    const isFollowing = !!follow?.approved;
    const isProtected = user.privateProfile && !isOwnProfile && !isFollowing;
    const [allFollows, userFollowing] = await Promise.all([
      prisma.follow.findMany({
        where: { approved: true, OR: [{ followerId: user.id }, { followingId: user.id }] },
        include: { follower: true, following: true },
        orderBy: { createdAt: "desc" },
      }),
      sessionUser ? prisma.follow.findMany({
        where: { followerId: sessionUser.id, approved: true },
        select: { followingId: true },
      }) : Promise.resolve([]),
    ]);

    let posts: unknown[] = [];
    let albums: unknown[] = [];
    let collections: unknown[] = [];
    let favorites: unknown[] = [];

    if (!isProtected) {
      [posts, albums, collections, favorites] = await Promise.all([
        prisma.post.findMany({
          where: { creatorId: user.id },
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isVerified: true,
              },
            },
            tags: { include: { tag: true } },
            _count: { select: { favorites: true, collectionItems: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.album.findMany({
          where: { creatorId: user.id },
          include: {
            _count: { select: { posts: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        (user.showCollections || isOwnProfile)
          ? prisma.collection.findMany({
              where: {
                ownerId: user.id,
                ...(isOwnProfile ? {} : { isPublic: true }),
              },
              include: {
                items: {
                  include: { post: true },
                  take: 4,
                },
                _count: { select: { items: true } },
              },
              orderBy: { createdAt: "desc" },
            })
          : Promise.resolve([]),
        (user.showFavorites || isOwnProfile)
          ? prisma.favorite.findMany({
              where: { userId: user.id },
              include: {
                post: {
                  include: {
                    creator: true,
                    tags: { include: { tag: true } },
                    _count: { select: { favorites: true } },
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            }).then((favs) => favs.map((f) => f.post))
          : Promise.resolve([]),
      ]);
    }

    return safeJson(await filterVisibleContent({
      user,
      posts,
      albums,
      collections,
      favorites,
      followersCount,
      followingCount,
      allFollows,
      userFollowingIds: userFollowing.map((relation) => relation.followingId),
      isFollowing,
      isRequested: !!follow && !follow.approved,
      isProtected,
    }, sessionUser?.id));
  } catch (error) {
    console.error("GET /api/users/[username] error:", error);
    return safeJson({ error: "Failed to load user profile" }, { status: 500 });
  }
}
