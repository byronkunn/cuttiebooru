import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { visibleCreatorWhere } from "@/lib/content-visibility";

export const dynamic = "force-dynamic";
const types: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".mp4": "video/mp4", ".webm": "video/webm" };
export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
  const filename = params.filename;
  if (!/^upload_[a-f0-9-]+\.(jpg|png|gif|webp|mp4|webm)$/i.test(filename)) return new NextResponse(null, { status: 404 });
  const upload = await prisma.upload.findUnique({ where: { filename } });
  if (!upload) return new NextResponse(null, { status: 404 });
  const user = await getSessionUser(req);
  const url = `/api/private-media/${filename}`;
  const owner = user?.id === upload.ownerId;
  let allowed = owner;
  if (!allowed && upload.kind === "comic") allowed = !!(await prisma.comicPage.findFirst({ where: { url, chapter: { published: true, series: { creator: { is: visibleCreatorWhere(user?.id) } } } }, select: { id: true } }));
  if (!allowed && upload.kind === "private" && user) allowed = !!(await prisma.directMessage.findFirst({ where: { mediaUrl: url, OR: [{ senderId: user.id }, { receiverId: user.id }] }, select: { id: true } }));
  if (!allowed) return new NextResponse(null, { status: 404 });
  try {
    const file = path.join(process.cwd(), "private-media", filename);
    const info = await stat(file);
    if (!info.isFile() || !info.size) return new NextResponse(null, { status: 404 });
    let start = 0, end = info.size - 1; const range = req.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      if (!match[1]) start = Math.max(0, info.size - Number(match[2]));
      else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    }
    const headers: Record<string, string> = { "Content-Type": types[path.extname(filename).toLowerCase()], "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" };
    if (range) headers["Content-Range"] = `bytes ${start}-${end}/${info.size}`;
    return new NextResponse(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, { status: range ? 206 : 200, headers });
  } catch { return new NextResponse(null, { status: 404 }); }
}
