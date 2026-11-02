"use client";

import { useState } from "react";
import { parseAnnouncement, validateAnnouncementBanner } from "@/lib/announcement";

export function AnnouncementEditor({ banner, onSaved }: {
  banner: string;
  onSaved: (value: string) => void;
}) {
  const [form, setForm] = useState(() => parseAnnouncement(banner));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  function edit(key: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setStatus("");
    setError("");
  }

  async function save(value: string) {
    const validation = validateAnnouncementBanner(value);
    if (validation) { setError(validation); return; }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_settings", announcementBanner: value }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Unable to save announcement."); return; }
      const saved = data.siteSettings.announcementBanner as string;
      onSaved(saved);
      if (!saved) setForm(parseAnnouncement(""));
      setStatus(saved ? "Announcement published. Visitors will see it on the home feed." : "Announcement removed.");
    } catch (error) {
      console.error("Saving announcement failed:", error);
      setError("Unable to save announcement. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-white";
  return (
    <form className="p-4 sm:p-6 rounded-3xl bg-[#151826] border border-white/10 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        save(JSON.stringify({
          ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])),
          updatedAt: new Date().toISOString(),
        }));
      }}>
      <fieldset disabled={busy} className="space-y-4">
        <label className="block text-xs font-bold space-y-1">
          <span>Announcement title</span>
          <input className={field} maxLength={120} value={form.title}
            onChange={(event) => edit("title", event.target.value)} />
        </label>
        <label className="block text-xs font-bold space-y-1">
          <span>Announcement message</span>
          <textarea className={field} rows={5} maxLength={5000} value={form.message}
            onChange={(event) => edit("message", event.target.value)} />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs font-bold space-y-1">
            <span>Action link (optional)</span>
            <input className={field} maxLength={2048} placeholder="/comics or https://example.com"
              value={form.linkUrl} onChange={(event) => edit("linkUrl", event.target.value)} />
          </label>
          <label className="block text-xs font-bold space-y-1">
            <span>Button label (optional)</span>
            <input className={field} maxLength={80} value={form.linkLabel}
              onChange={(event) => edit("linkLabel", event.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="px-4 py-2 rounded-xl bg-pink-600 font-bold text-sm">
            {busy ? "Saving..." : "Publish Announcement"}
          </button>
          <button type="button" disabled={!banner} onClick={() => save("")}
            className="px-4 py-2 rounded-xl bg-white/5 text-sm disabled:opacity-40">
            Remove Announcement
          </button>
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {status && <p role="status" className="text-sm text-emerald-300">{status}</p>}
    </form>
  );
}
