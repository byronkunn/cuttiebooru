import { NextRequest, NextResponse } from "next/server";

// Next.js dev normalizes loopback hosts in req.nextUrl (e.g. 127.0.0.1 -> localhost),
// so a same-origin request can look "cross-origin". Compare hosts with all loopback
// addresses treated as equivalent, while still rejecting genuine cross-site origins.
function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "::1" || h === "[::1]") return true;
  return /^127(\.\d{1,3}){3}$/.test(h);
}

function normalizedPort(url: URL): string {
  return url.port || (url.protocol === "https:" ? "443" : "80");
}

function isSameSiteOrigin(originHeader: string, requestOrigin: string): boolean {
  try {
    const origin = new URL(originHeader);
    const target = new URL(requestOrigin);
    if (origin.protocol !== target.protocol || normalizedPort(origin) !== normalizedPort(target)) {
      return false;
    }
    if (isLoopbackHost(origin.hostname) && isLoopbackHost(target.hostname)) {
      return true;
    }
    return origin.hostname === target.hostname;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/sfw/")) {
    const target = req.nextUrl.clone();
    target.pathname = req.nextUrl.pathname.replace(/^\/sfw\//, "/api/media/");
    const response = withSecurityHeaders(NextResponse.rewrite(target));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  if (req.nextUrl.pathname === "/_next/image") {
    return withSecurityHeaders(new NextResponse(null, { status: 404 }));
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const site = req.headers.get("sec-fetch-site");
    if (site === "cross-site" || (origin && !isSameSiteOrigin(origin, req.nextUrl.origin))) {
      return withSecurityHeaders(NextResponse.json({ error: "Cross-origin requests are not allowed" }, { status: 403 }));
    }
  }
  return withSecurityHeaders(NextResponse.next());
}
function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  return response;
}
export const config = { matcher: ["/api/:path*", "/sfw/:path*", "/_next/image"] };
