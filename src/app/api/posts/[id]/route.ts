import { safeJson } from "@/lib/safe-json";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { visiblePostWhere } from "@/lib/content-visibility";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    const visible = visiblePostWhere(user?.id);
    const accessible = await prisma.post.findFirst({
      where: { AND: [{ id: params.id }, visible] },
      select: { id: true },
    });
    if (!accessible) return safeJson({ error: "Post not found" }, { status: 404 });
    const post = await prisma.post.update({
      where: { id: params.id, AND: [visible] },
      data: { views: { increment: 1 } },
      include: {
        creator: {
          include: {
            _count: { select: { followers: true, createdPosts: true } },
          },
        },
        uploader: true,
        album: {
          include: {
            posts: {
              where: visible,
              select: { id: true, title: true, thumbnailUrl: true },
            },
          },
        },
        tags: { include: { tag: true } },
        tagSuggestions: {
          include: { suggestedBy: true },
          orderBy: { createdAt: "desc" },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isVerified: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { favorites: true, collectionItems: true, comments: true } },
      },
    });

    const tagIds = post.tags.map((pt) => pt.tagId);
    const relatedPosts = await prisma.post.findMany({
      where: {
        AND: [visible],
        id: { not: post.id },
        OR: [
          { creatorId: post.creatorId },
          { tags: { some: { tagId: { in: tagIds } } } },
          { category: post.category },
        ],
      },
      include: {
        creator: true,
        tags: { include: { tag: true } },
        _count: { select: { favorites: true } },
      },
      take: 6,
    });

    return safeJson({
      post,
      relatedPosts,
    });
  } catch (error) {
    console.error("GET /api/posts/[id] error:", error);
    return safeJson({ error: "Post not found" }, { status: 404 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return safeJson({ error: "Sign in required" }, { status: 401 });
    const post = await prisma.post.findFirst({
      where: { AND: [{ id: params.id }, visiblePostWhere(user.id)] },
      select: { id: true },
    });
    if (!post) return safeJson({ error: "Post not found" }, { status: 404 });
    const body = await req.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return safeJson({ error: "Comment content cannot be empty" }, { status: 400 });
    if (content.length > 2000) return safeJson({ error: "Comment too long (max 2000 chars)" }, { status: 400 });

    const comment = await prisma.comment.create({
      data: {
        postId: params.id,
        authorId: user.id,
        content,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            role: true,
          },
        },
      },
    });

    return safeJson({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posts/[id] comment error:", error);
    return safeJson({ error: "Failed to post comment" }, { status: 500 });
  }
}
