import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, getSessionUser, hashPassword, revokeSession, unauthorized, verifyPassword } from "@/lib/auth";
import { safeJson } from "@/lib/safe-json";
import { isHostedMediaUrl } from "@/lib/content-visibility";
import { isProfileLinkAllowed, validateProfileLinks } from "@/lib/profile-links";

export async function GET(req: NextRequest) { return safeJson({ user: await getSessionUser(req) }); }
export async function DELETE(req: NextRequest) {
  const response = safeJson({ signedOut: true });
  await revokeSession(req, response);
  return response;
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Demo switching must never bypass password authentication.
    if (body.mode === "quick_switch") {
      return safeJson({ error: "Password sign-in is required" }, { status: 403 });
    }

    const mode = body.mode === "signin" ? "signin" : "register";
    const identifier = typeof body.username === "string" ? body.username.trim().toLowerCase().replace(/^@/, "") : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!identifier || !password || password.length > 256) return safeJson({ error: "Username and password are required" }, { status: 400 });
    if (mode === "signin") {
      const since = new Date(Date.now() - 15 * 60 * 1000);
      const attempts = await prisma.loginAttempt.count({ where: { identifier, createdAt: { gte: since } } });
      if (attempts >= 10) return safeJson({ error: "Too many sign-in attempts. Try again later." }, { status: 429 });
      const existing = await prisma.user.findFirst({ where: { OR: [{ username: identifier }, { email: identifier }] } });
      if (!existing || existing.isBanned || !(await verifyPassword(password, existing.passwordHash))) {
        await prisma.loginAttempt.create({ data: { identifier } });
        return safeJson({ error: "Invalid username or password" }, { status: 401 });
      }
      await prisma.loginAttempt.deleteMany({ where: { identifier } });
      const response = safeJson({ user: existing, signedIn: true });
      await revokeSession(req, response);
      await createSession(existing.id, response);
      return response;
    }
    if (!/^[a-z0-9_]{3,32}$/.test(identifier)) return safeJson({ error: "Username must be 3–32 letters, numbers, or underscores" }, { status: 400 });
    if (password.length < 12) return safeJson({ error: "Password must be at least 12 characters" }, { status: 400 });
    const email = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
    if (await prisma.user.findFirst({ where: { OR: [{ username: identifier }, ...(email ? [{ email }] : [])] } })) return safeJson({ error: "Username or email is already in use" }, { status: 409 });
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({ data: {
      username: identifier, passwordHash, email,
      displayName: typeof body.displayName === "string" ? body.displayName.trim().slice(0, 100) || identifier : identifier,
      bio: typeof body.bio === "string" ? body.bio.trim().slice(0, 2000) : "",
      niche: typeof body.niche === "string" ? body.niche.slice(0, 100) : "Cute Art",
      avatarUrl: "/default-avatar.svg",
      headerUrl: "",
      isCreator: true, role: "creator",
      collections: { create: { title: "My Saved Booru Vault", description: "Private collection", isPublic: false, badgeText: "Private" } },
    } });
    const response = safeJson({ user, created: true }, { status: 201 });
    await revokeSession(req, response);
    await createSession(user.id, response);
    return response;
  } catch (error) { console.error("Account operation failed", error); return safeJson({ error: "Account operation failed" }, { status: 500 }); }
}
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return unauthorized();
    const body = await req.json();
    const allowed = ["displayName", "bio", "avatarUrl", "headerUrl", "websiteUrl", "niche", "spotlightQuote"] as const;
    const data: Record<string, unknown> = {};
    for (const key of allowed) if (typeof body[key] === "string") data[key] = body[key].slice(0, 2000);
    if (body.bio !== undefined && (typeof body.bio !== "string" || body.bio.length > 2000)) return safeJson({ error: "About me must be text of at most 2000 characters." }, { status: 400 });
    if (body.websiteUrl !== undefined) {
      if (typeof body.websiteUrl !== "string" || body.websiteUrl.length > 2048 || (body.websiteUrl.trim() && !isProfileLinkAllowed(body.websiteUrl.trim()))) return safeJson({ error: "Website must be a valid HTTP(S) URL of at most 2048 characters." }, { status: 400 });
      data.websiteUrl = body.websiteUrl.trim();
    }
    for (const key of ["notifyFollows", "notifyFavorites", "privateProfile", "showCollections", "showFavorites"]) if (typeof body[key] === "boolean") data[key] = body[key];
    if (typeof body.allowDMs === "string" && ["everyone", "followers", "none"].includes(body.allowDMs)) data.allowDMs = body.allowDMs;
    if (body.socialLinks !== undefined) {
      let links: unknown = body.socialLinks;
      if (typeof links === "string") {
        try { links = JSON.parse(links); }
        catch { return safeJson({ error: "Invalid profile links format." }, { status: 400 }); }
      }
      const linkError = validateProfileLinks(links);
      if (linkError) return safeJson({ error: linkError }, { status: 400 });
      data.socialLinks = JSON.stringify(links);
    }
    if (body.privateProfile === true) {
      const [posts, albums, series] = await Promise.all([
        prisma.post.findMany({ where: { creatorId: user.id }, select: { mediaUrl: true, thumbnailUrl: true, galleryUrls: true } }),
        prisma.album.findMany({ where: { creatorId: user.id }, select: { coverUrl: true } }),
        prisma.comicSeries.findMany({ where: { creatorId: user.id }, select: { coverUrl: true } }),
      ]);
      const mediaUrls = [
        ...posts.flatMap((post) => [post.mediaUrl, post.thumbnailUrl, ...JSON.parse(post.galleryUrls) as string[]]),
        ...albums.map((album) => album.coverUrl),
        ...series.map((item) => item.coverUrl),
      ];
      if (!mediaUrls.every(isHostedMediaUrl)) {
        return safeJson({ error: "Upload externally hosted media to this site before enabling protection; external URLs cannot be made private." }, { status: 400 });
      }
    }
    const updated = await prisma.$transaction(async (tx) => {
      if (body.privateProfile === true && !user.privateProfile) {
        // Existing unreviewed follows must not become access grants.
        await tx.follow.updateMany({
          where: { followingId: user.id },
          data: { approved: false },
        });
      }
      return tx.user.update({ where: { id: user.id }, data });
    });
    return safeJson({ user: updated });
  } catch (error) { console.error("Account update failed", error); return safeJson({ error: "Account update failed" }, { status: 500 }); }
}
