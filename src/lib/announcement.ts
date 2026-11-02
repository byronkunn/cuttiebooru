export interface Announcement {
  title: string;
  message: string;
  linkUrl: string;
  linkLabel: string;
}

export function isAnnouncementLinkAllowed(value: string): boolean {
  if (!value) return true;
  if (/[\u0000-\u0020\u007f]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function parseAnnouncement(value: string): Announcement {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { title: "", message: value, linkUrl: "", linkLabel: "" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { title: "", message: value, linkUrl: "", linkLabel: "" };
  }
  const data = parsed as Record<string, unknown>;
  const text = (key: string) => typeof data[key] === "string" ? data[key] : "";
  const linkUrl = text("linkUrl");
  return {
    title: text("title"), message: text("message"),
    linkUrl: isAnnouncementLinkAllowed(linkUrl) ? linkUrl : "",
    linkLabel: text("linkLabel"),
  };
}

export function validateAnnouncementBanner(value: unknown): string | null {
  if (typeof value !== "string") return "Announcement must be text.";
  if (value.length > 12000) return "Announcement is too long.";
  if (!value.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return value.length <= 5000 ? null : "Announcement message must be at most 5000 characters.";
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return "Invalid announcement format.";
  }
  const data = parsed as Record<string, unknown>;
  for (const [key, max] of [["title", 120], ["message", 5000], ["linkUrl", 2048], ["linkLabel", 80]] as const) {
    if (data[key] !== undefined && (typeof data[key] !== "string" || data[key].length > max)) {
      return `Announcement ${key} must be text of at most ${max} characters.`;
    }
  }
  if (!String(data.title || "").trim() && !String(data.message || "").trim()) {
    return "Please provide an announcement title or message.";
  }
  if (!isAnnouncementLinkAllowed(String(data.linkUrl || ""))) {
    return "Announcement links must use a site path or an HTTP(S) URL.";
  }
  return null;
}
