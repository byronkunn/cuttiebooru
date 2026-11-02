import { safeJson } from "@/lib/safe-json";
import { NextRequest } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const validRatings = new Set(["all", "sfw", "questionable", "explicit"]);
const validMediaTypes = new Set(["all", "image", "video"]);

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return unauthorized();

    const savedSearches = await prisma.savedSearch.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return safeJson({ savedSearches });
  } catch (error) {
    console.error("GET /api/saved-searches error:", error);
    return safeJson({ error: "Failed to load saved searches" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const includedTags: unknown[] = Array.isArray(body.includedTags)
      ? body.includedTags
      : [];
    const excludedTags: unknown[] = Array.isArray(body.excludedTags)
      ? body.excludedTags
      : [];
    const mediaType =
      typeof body.mediaType === "string" ? body.mediaType : "all";
    const rating = typeof body.rating === "string" ? body.rating : "all";

    if (!name || name.length > 60) {
      return safeJson({ error: "Name must be between 1 and 60 characters" }, { status: 400 });
    }
    if (query.length > 200 || includedTags.length > 20 || excludedTags.length > 20) {
      return safeJson({ error: "Search criteria exceed the allowed limits" }, { status: 400 });
    }
    if (
      !includedTags.every((tag: unknown) => typeof tag === "string" && tag.length <= 100) ||
      !excludedTags.every((tag: unknown) => typeof tag === "string" && tag.length <= 100)
    ) {
      return safeJson({ error: "Tags must be strings of 100 characters or fewer" }, { status: 400 });
    }
    if (!validRatings.has(rating) || !validMediaTypes.has(mediaType)) {
      return safeJson({ error: "Invalid media type or rating" }, { status: 400 });
    }

    const count = await prisma.savedSearch.count({ where: { ownerId: user.id } });
    if (count >= 20) {
      return safeJson({ error: "You can save up to 20 searches" }, { status: 400 });
    }

    const savedSearch = await prisma.savedSearch.create({
      data: {
        ownerId: user.id,
        name,
        query,
        includedTags: JSON.stringify(includedTags),
        excludedTags: JSON.stringify(excludedTags),
        mediaType,
        rating,
        alertsEnabled: body.alertsEnabled === true,
      },
    });
    return safeJson({ savedSearch }, { status: 201 });
  } catch (error) {
    console.error("POST /api/saved-searches error:", error);
    return safeJson({ error: "Failed to save search" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return unauthorized();

    const body = await req.json();
    if (typeof body.id !== "string" || typeof body.alertsEnabled !== "boolean") {
      return safeJson({ error: "A search ID and alert setting are required" }, { status: 400 });
    }

    const result = await prisma.savedSearch.updateMany({
      where: { id: body.id, ownerId: user.id },
      data: { alertsEnabled: body.alertsEnabled },
    });
    if (result.count === 0) {
      return safeJson({ error: "Saved search not found" }, { status: 404 });
    }
    return safeJson({ updated: true });
  } catch (error) {
    console.error("PATCH /api/saved-searches error:", error);
    return safeJson({ error: "Failed to update saved search" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return unauthorized();

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return safeJson({ error: "A search ID is required" }, { status: 400 });

    const result = await prisma.savedSearch.deleteMany({
      where: { id, ownerId: user.id },
    });
    if (result.count === 0) {
      return safeJson({ error: "Saved search not found" }, { status: 404 });
    }
    return safeJson({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/saved-searches error:", error);
    return safeJson({ error: "Failed to delete saved search" }, { status: 500 });
  }
}
