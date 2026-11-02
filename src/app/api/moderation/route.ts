import { safeJson } from "@/lib/safe-json";
import { NextRequest } from "next/server";
import { getSessionUser, isModerator, unauthorized, forbidden } from "@/lib/auth";
import { TAG_CATEGORY_IDS } from "@/lib/tag-taxonomy";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await getSessionUser(req);
    if (!user) return unauthorized();
    const { action } = body;
    if (["resolve_report", "review_tag_suggestion", "merge_tags"].includes(action) && !isModerator(user)) return forbidden();

    if (action === "submit_report") {
      const {
        targetType = "post",
        postId,
        reportedUserId,
        reason = "attribution_missing",
        details = "",
        contactEmail = "",
      } = body;

      const report = await prisma.report.create({
        data: {
          targetType,
          postId: postId || null,
          reportedUserId: reportedUserId || null,
          reporterId: user.id,
          reason,
          details: details.trim(),
          contactEmail: contactEmail.trim(),
          status: "open",
        },
        include: {
          post: { include: { creator: true } },
          reportedUser: true,
          reporter: true,
        },
      });

      return safeJson({ report });
    }

    if (action === "resolve_report") {
      const { reportId, status = "resolved", removePost = false } = body;
      const report = await prisma.report.update({
        where: { id: reportId },
        data: { status },
      });

      if (removePost && report.postId) {
        await prisma.post.delete({ where: { id: report.postId } });
      }

      return safeJson({ report });
    }

    if (action === "suggest_tag") {
      const {
        postId,
        tagName,
        tagCategory = "general",
      } = body;

      if (!TAG_CATEGORY_IDS.has(tagCategory)) return safeJson({ error: "Invalid tag category" }, { status: 400 });
      if (!postId || !tagName) {
        return safeJson(
          { error: "Post ID and tag name are required" },
          { status: 400 }
        );
      }

      const cleanTag = tagName
        .trim()
        .toLowerCase()
        .replace(/^#/, "")
        .replace(/\s+/g, "_");

      const suggestion = await prisma.tagSuggestion.create({
        data: {
          postId,
          tagName: cleanTag,
          tagCategory,
          suggestedById: user.id,
          status: "pending",
        },
        include: {
          post: { include: { creator: true } },
          suggestedBy: true,
        },
      });

      return safeJson({ suggestion });
    }

    if (action === "review_tag_suggestion") {
      const { suggestionId, status } = body; // status: "approved" | "rejected"
      const suggestion = await prisma.tagSuggestion.update({
        where: { id: suggestionId },
        data: { status },
      });

      if (status === "approved") {
        const displayName = suggestion.tagName
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        const tag = await prisma.tag.upsert({
          where: { name: suggestion.tagName },
          update: { usageCount: { increment: 1 } },
          create: {
            name: suggestion.tagName,
            displayName,
            category: suggestion.tagCategory || "general",
            description: `Community-contributed tag for ${displayName}.`,
            usageCount: 1,
          },
        });

        await prisma.postTag.upsert({
          where: {
            postId_tagId: {
              postId: suggestion.postId,
              tagId: tag.id,
            },
          },
          update: {},
          create: {
            postId: suggestion.postId,
            tagId: tag.id,
          },
        });
      }

      return safeJson({ suggestion });
    }

    if (action === "merge_tags") {
      const { sourceTagId, targetTagId } = body;
      if (!sourceTagId || !targetTagId || sourceTagId === targetTagId) {
        return safeJson(
          { error: "Choose two distinct tags to merge" },
          { status: 400 }
        );
      }

      const sourceLinks = await prisma.postTag.findMany({
        where: { tagId: sourceTagId },
      });

      for (const link of sourceLinks) {
        await prisma.postTag.upsert({
          where: {
            postId_tagId: {
              postId: link.postId,
              tagId: targetTagId,
            },
          },
          update: {},
          create: {
            postId: link.postId,
            tagId: targetTagId,
          },
        });
      }

      await prisma.tag.delete({ where: { id: sourceTagId } });

      const updatedUsageCount = await prisma.postTag.count({
        where: { tagId: targetTagId },
      });
      await prisma.tag.update({
        where: { id: targetTagId },
        data: { usageCount: updatedUsageCount },
      });

      return safeJson({ merged: true });
    }

    return safeJson({ error: "Unknown moderation action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/moderation error:", error);
    return safeJson(
      { error: "Moderation action failed" },
      { status: 500 }
    );
  }
}

