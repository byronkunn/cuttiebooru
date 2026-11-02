import { safeJson } from "@/lib/safe-json";
import { NextRequest } from "next/server";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized } from "@/lib/auth";
import path from "path";
import { randomUUID } from "crypto";
import { hiddenMediaUrls } from "@/lib/content-visibility";

export const dynamic = "force-dynamic";

function listSfwSubfolder(folder: string): string[] {
  const dir = path.join(process.cwd(), "sfw", folder);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(
      (f) =>
        !f.startsWith(".") &&
        /\.(png|jpe?g|webp|gif|mp4|webm|mov)$/i.test(f)
    )
    .sort()
    .map((f) => f.startsWith("upload_") && /^upload_[a-f0-9-]+\./i.test(f) ? `/api/media/${folder}/${f}` : `/sfw/${folder}/${f}`);
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const hidden = await hiddenMediaUrls(user?.id);
    const ownedUploads = user ? await prisma.upload.findMany({ where: { ownerId: user.id }, select: { filename: true } }) : [];
    const owned = new Set(ownedUploads.map((upload) => upload.filename));
    const visible = (folder: string) => listSfwSubfolder(folder).filter((url) => {
      const filename = url.split("/").pop() || "";
      return !hidden.has(url.replace(/^\/sfw\//, "/api/media/")) &&
        (!/^upload_[a-f0-9-]+\./i.test(filename) || owned.has(filename));
    });
    return safeJson({
      avatars: visible("avatar"),
      banners: visible("banner-image"),
      images: visible("image"),
      videos: visible("video"),
    });
  } catch (error) {
    console.error("GET /api/upload error:", error);
    return safeJson(
      { error: "Failed to list sfw directory" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return unauthorized();
    const settings = await prisma.siteSetting.findUnique({ where: { id: "global" } });
    if (settings?.maintenanceMode && user.role !== "admin") return safeJson({ error: "The site is in maintenance mode" }, { status: 503 });
    if (settings?.openUploads === false && user.role !== "admin" && user.role !== "moderator") return safeJson({ error: "Uploads are currently closed" }, { status: 403 });
    const maxBytes = 25 * 1024 * 1024;
    const contentLength = Number(req.headers.get("content-length"));
    if (!Number.isSafeInteger(contentLength) || contentLength <= 0) return safeJson({ error: "Content-Length is required" }, { status: 411 });
    if (contentLength > maxBytes + 1024 * 1024) {
      return safeJson({ error: "File exceeds the 25 MB limit" }, { status: 413 });
    }
    const formData = await req.formData();
    const file = formData.get("file");
    const folderParam = (formData.get("folder") as string) || "auto";
    if (!['auto', 'avatar', 'banner-image', 'image', 'video', 'private', 'comic'].includes(folderParam)) return safeJson({ error: "Invalid upload destination" }, { status: 400 });

    if (!(file instanceof File)) {
      return safeJson({ error: "No file uploaded" }, { status: 400 });
    }
    if (!file.size || file.size > maxBytes) {
      return safeJson({ error: "File must be between 1 byte and 25 MB" }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isGif = ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"));
    const isWebp = buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    const isMp4 = buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
    const isWebm = buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    const ext = isJpeg ? ".jpg" : isPng ? ".png" : isGif ? ".gif" : isWebp ? ".webp" : isMp4 ? ".mp4" : isWebm ? ".webm" : "";
    if (!ext) return safeJson({ error: "Unsupported or invalid file type" }, { status: 415 });
    const isVideo = isMp4 || isWebm;
    if (isVideo && (folderParam === "avatar" || folderParam === "banner-image")) {
      return safeJson({ error: "Profile images must be images" }, { status: 400 });
    }

    let subfolder = "image";
    if (folderParam === "avatar") subfolder = "avatar";
    else if (folderParam === "banner-image") subfolder = "banner-image";
    else if (folderParam === "video" || isVideo) subfolder = "video";
    else subfolder = "image";

    const filename = `upload_${randomUUID()}${ext}`;
    const privateKind = folderParam === "private" || folderParam === "comic";
    const targetDir = privateKind ? path.join(process.cwd(), "private-media") : path.join(process.cwd(), "sfw", subfolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fullPath = path.join(targetDir, filename);
    fs.writeFileSync(fullPath, buffer);

    await prisma.upload.create({ data: { filename, ownerId: user.id, kind: privateKind ? folderParam : "post" } });
    return safeJson({
      url: privateKind ? `/api/private-media/${filename}` : `/api/media/${subfolder}/${filename}`,
      mediaType: isVideo ? "video" : "image",
      filename,
    });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return safeJson(
      { error: "Failed to save uploaded file" },
      { status: 500 }
    );
  }
}
