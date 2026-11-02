import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { getSessionUser } from "@/lib/auth";
import { canViewMediaUrls } from "@/lib/content-visibility";

export const dynamic = "force-dynamic";
const types: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime" };
export async function GET(req: NextRequest, { params }: { params: { folder: string; filename: string } }) {
  const { folder, filename } = params;
  const ext = path.extname(filename).toLowerCase();
  if (!["image", "video", "avatar", "banner-image"].includes(folder) || !/^[a-z0-9_-]+\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(filename) || !types[ext]) return new NextResponse(null, { status: 404 });
  const user = await getSessionUser(req);
  if (!await canViewMediaUrls([
    `/sfw/${folder}/${filename}`,
    `/api/media/${folder}/${filename}`,
  ], user?.id)) return new NextResponse(null, { status: 404 });
  const file = path.join(process.cwd(), "sfw", folder, filename);
  try {
    const info = await stat(file);
    if (!info.isFile()) return new NextResponse(null, { status: 404 });
    const range = req.headers.get("range");
    let start = 0, end = info.size - 1;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      if (!match[1]) { const length = Number(match[2]); start = Math.max(0, info.size - length); }
      else { start = Number(match[1]); if (match[2]) end = Math.min(Number(match[2]), end); }
      if (start > end || start >= info.size || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    }
    const headers: Record<string, string> = { "Content-Type": types[ext], "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" };
    if (range) headers["Content-Range"] = `bytes ${start}-${end}/${info.size}`;
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new NextResponse(stream, { status: range ? 206 : 200, headers });
  } catch { return new NextResponse(null, { status: 404 }); }
}
