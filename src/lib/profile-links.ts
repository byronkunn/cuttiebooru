export function isProfileLinkAllowed(value: string): boolean {
  if (!value || /[\u0000-\u0020\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function parseProfileLinks(value: string): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value || "{}");
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed).filter(([, url]) => typeof url === "string" && isProfileLinkAllowed(url)));
}

export function validateProfileLinks(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Profile links must be labeled website links.";
  const entries = Object.entries(value);
  if (entries.length > 10) return "You can add up to 10 profile links.";
  for (const [label, url] of entries) {
    if (!label.trim() || label.length > 80) return "Each link needs a label of at most 80 characters.";
    if (typeof url !== "string" || url.length > 2048 || !isProfileLinkAllowed(url)) return "Profile links must be valid HTTP(S) URLs of at most 2048 characters.";
  }
  if (JSON.stringify(value).length > 4000) return "Your profile links are too long.";
  return null;
}
