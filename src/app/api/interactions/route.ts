import { safeJson } from "@/lib/safe-json";
import { NextRequest } from "next/server";
import { getSessionUser, unauthorized, forbidden } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visiblePostWhere, canViewCreator } from "@/lib/content-visibility";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await getSessionUser(req);
    if (!user) return unauthorized();
    const userId = user.id;
    const { action } = body;
    if (["favorite", "add_to_collection"].includes(action) && body.postId) {
      const post = await prisma.post.findFirst({
        where: { AND: [{ id: body.postId }, visiblePostWhere(userId)] },
        select: { id: true },
      });
      if (!post) return safeJson({ error: "Post not found" }, { status: 404 });
    }
    if (action === "add_to_collection" && body.albumId) {
      const album = await prisma.album.findUnique({ where: { id: body.albumId } });
      if (!album || !await canViewCreator(album.creatorId, userId)) {
        return safeJson({ error: "Album not found" }, { status: 404 });
      }
    }
    if (["toggle_collection_privacy", "add_to_collection"].includes(action)) {
      const collection = await prisma.collection.findUnique({ where: { id: body.collectionId } });
      if (!collection || collection.ownerId !== userId) return forbidden();
    }
    if (["remove_from_collection", "reorder_collection_item"].includes(action)) {
      const item = await prisma.collectionItem.findUnique({ where: { id: body.itemId }, include: { collection: true } });
      if (!item || item.collection.ownerId !== userId) return forbidden();
    }

    if (action === "favorite") {
      const { postId } = body;
      const existing = await prisma.favorite.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existing) {
        await prisma.favorite.delete({ where: { id: existing.id } });
        return safeJson({ favorited: false, postId });
      } else {
        await prisma.favorite.create({ data: { userId, postId } });
        const post = await prisma.post.findUnique({ where: { id: postId } });
        if (post && post.creatorId !== userId) {
          await prisma.notification.create({
            data: {
              recipientId: post.creatorId,
              actorId: userId,
              type: "like",
              postId: post.id,
              text: `favorited your post "${post.title}"`,
            },
          });
        }
        return safeJson({ favorited: true, postId });
      }
    }

    if (action === "follow") {
      const { targetUserId } = body;
      if (typeof targetUserId !== "string") {
        return safeJson({ error: "Target user is required" }, { status: 400 });
      }
      if (userId === targetUserId) {
        return safeJson(
          { error: "Cannot follow yourself" },
          { status: 400 }
        );
      }

      const existing = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
      });

      if (existing) {
        await prisma.follow.delete({ where: { id: existing.id } });
        return safeJson({ following: false, targetUserId });
      } else {
        const target = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { privateProfile: true },
        });
        if (!target) return safeJson({ error: "User not found" }, { status: 404 });
        const approved = !target.privateProfile;
        await prisma.follow.create({
          data: { followerId: userId, followingId: targetUserId, approved },
        });
        await prisma.notification.create({
          data: {
            recipientId: targetUserId,
            actorId: userId,
            type: approved ? "follow" : "follow_request",
            text: approved ? "followed you" : "requested to follow you. Review it in Privacy settings.",
          },
        });
        return safeJson({ following: approved, requested: !approved, targetUserId });
      }
    }

    if (action === "follow_tag") {
      const rawName = typeof body.tagName === "string" ? body.tagName : "";
      const tagName = rawName.trim().toLowerCase().replace(/^#/, "");
      if (!tagName) {
        return safeJson({ error: "Tag name is required" }, { status: 400 });
      }

      let tag = await prisma.tag.findUnique({ where: { name: tagName } });
      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            name: tagName,
            displayName: tagName
              .split("_")
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" "),
            category: "general",
          },
        });
      }

      const existing = await prisma.tagFollow.findUnique({
        where: {
          userId_tagId: {
            userId,
            tagId: tag.id,
          },
        },
      });

      if (existing) {
        await prisma.tagFollow.delete({ where: { id: existing.id } });
        return safeJson({ following: false, tagName: tag.name, tagId: tag.id });
      } else {
        await prisma.tagFollow.create({
          data: {
            userId,
            tagId: tag.id,
          },
        });
        return safeJson({ following: true, tagName: tag.name, tagId: tag.id });
      }
    }

    if (action === "create_collection") {
      const {
        title,
        description = "",
        isPublic = false,
        coverUrl = "/sfw/image/148a0f0eae39998a954d56c2290dc65e.png",
      } = body;

      if (!title || !title.trim()) {
        return safeJson(
          { error: "Collection title is required" },
          { status: 400 }
        );
      }

      const collection = await prisma.collection.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          coverUrl,
          isPublic: Boolean(isPublic),
          isCurated: false,
          badgeText: isPublic ? "Community" : "Private",
          ownerId: userId,
        },
        include: {
          owner: true,
          items: {
            include: {
              post: { include: { creator: true, tags: { include: { tag: true } } } },
              album: { include: { creator: true } },
              creator: true,
            },
          },
        },
      });

      return safeJson({ collection });
    }

    if (action === "toggle_collection_privacy") {
      const { collectionId } = body;
      const current = await prisma.collection.findUnique({
        where: { id: collectionId },
      });
      if (!current) {
        return safeJson(
          { error: "Collection not found" },
          { status: 404 }
        );
      }
      const nextPublic = !current.isPublic;
      const updated = await prisma.collection.update({
        where: { id: collectionId },
        data: {
          isPublic: nextPublic,
          badgeText: current.isCurated
            ? current.badgeText
            : nextPublic
            ? "Public"
            : "Private",
        },
      });
      return safeJson({ collection: updated });
    }

    if (action === "add_to_collection") {
      const { collectionId, postId, albumId, creatorId } = body;
      const existingCount = await prisma.collectionItem.count({
        where: { collectionId },
      });

      const duplicate = await prisma.collectionItem.findFirst({
        where: {
          collectionId,
          ...(postId ? { postId } : {}),
          ...(albumId ? { albumId } : {}),
          ...(creatorId ? { creatorId } : {}),
        },
      });

      if (duplicate) {
        return safeJson({ item: duplicate, alreadyExists: true });
      }

      const item = await prisma.collectionItem.create({
        data: {
          collectionId,
          postId: postId || null,
          albumId: albumId || null,
          creatorId: creatorId || null,
          orderIndex: existingCount + 1,
        },
      });

      if (postId) {
        const post = await prisma.post.findUnique({ where: { id: postId } });
        const col = await prisma.collection.findUnique({
          where: { id: collectionId },
        });
        if (post && col && post.creatorId !== userId) {
          await prisma.notification.create({
            data: {
              recipientId: post.creatorId,
              actorId: userId,
              type: "collection_save",
              postId: post.id,
              text: `saved "${post.title}" to collection "${col.title}"`,
            },
          });
        }
      }

      return safeJson({ item, alreadyExists: false });
    }

    if (action === "remove_from_collection") {
      const { itemId } = body;
      await prisma.collectionItem.delete({
        where: { id: itemId },
      });
      return safeJson({ removed: true, itemId });
    }

    if (action === "reorder_collection_item") {
      const { itemId, direction } = body;
      const item = await prisma.collectionItem.findUnique({
        where: { id: itemId },
      });
      if (!item) {
        return safeJson({ error: "Item not found" }, { status: 404 });
      }

      const allItems = await prisma.collectionItem.findMany({
        where: { collectionId: item.collectionId },
        orderBy: { orderIndex: "asc" },
      });

      const idx = allItems.findIndex((i) => i.id === itemId);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;

      if (swapIdx >= 0 && swapIdx < allItems.length) {
        const other = allItems[swapIdx];
        await prisma.$transaction([
          prisma.collectionItem.update({
            where: { id: item.id },
            data: { orderIndex: swapIdx + 1 },
          }),
          prisma.collectionItem.update({
            where: { id: other.id },
            data: { orderIndex: idx + 1 },
          }),
        ]);
      }

      return safeJson({ reordered: true });
    }

    return safeJson({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/interactions error:", error);
    return safeJson(
      { error: "Interaction failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || null;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "check_favorite") {
      const postId = searchParams.get("postId");
      if (!userId || !postId) return safeJson({ favorited: false });
      const fav = await prisma.favorite.findUnique({
        where: { userId_postId: { userId, postId } },
      });
      return safeJson({ favorited: Boolean(fav) });
    }

    if (action === "check_follow") {
      const creatorId = searchParams.get("creatorId");
      if (!userId || !creatorId) return safeJson({ following: false });
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: userId, followingId: creatorId },
        },
      });
      return safeJson({ following: Boolean(follow?.approved) });
    }

    if (action === "check_tag_follow") {
      const tagName = (searchParams.get("tagName") || "").trim().toLowerCase().replace(/^#/, "");
      if (!userId || !tagName) return safeJson({ following: false });
      const tag = await prisma.tag.findUnique({ where: { name: tagName } });
      if (!tag) return safeJson({ following: false });
      const tf = await prisma.tagFollow.findUnique({
        where: { userId_tagId: { userId, tagId: tag.id } },
      });
      return safeJson({ following: Boolean(tf) });
    }

    if (action === "followed_tags") {
      if (!userId) return safeJson({ followedTags: [] });
      const tagFollows = await prisma.tagFollow.findMany({
        where: { userId },
        include: { tag: true },
        orderBy: { createdAt: "desc" },
      });
      return safeJson({ followedTags: tagFollows.map((tf) => tf.tag.name) });
    }

    return safeJson({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/interactions error:", error);
    return safeJson({ error: "Failed to load interaction state" }, { status: 500 });
  }
}
