"use client";

import { useEffect, useState } from "react";

interface FollowRequest {
  id: string;
  follower: { username: string; displayName: string };
}

export function FollowRequests() {
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/follow-requests", { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load follow requests");
        setRequests(data.requests);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          console.error("Could not load follow requests:", err);
          setError("Could not load follow requests");
        }
      });
    return () => controller.abort();
  }, []);

  async function respond(id: string, action: "approve" | "reject") {
    setBusy(id);
    setError("");
    try {
      const res = await fetch("/api/follow-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update follow request");
      setRequests((previous) => previous.filter((request) => request.id !== id));
    } catch (err) {
      console.error("Could not update follow request:", err);
      setError(err instanceof Error ? err.message : "Could not update follow request");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 p-4 space-y-3">
      <h3 className="font-bold text-sm text-white">Follow requests</h3>
      <p className="text-xs text-zinc-400">
        Only you can approve access to your protected creations.
      </p>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      {!error && requests.length === 0 && (
        <p className="text-xs text-zinc-500">No pending follow requests.</p>
      )}
      {requests.map((request) => (
        <div key={request.id} className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-zinc-200">
            {request.follower.displayName} (@{request.follower.username})
          </span>
          <div className="flex gap-2">
            <button type="button" disabled={busy !== null} onClick={() => respond(request.id, "approve")}
              className="px-3 py-1.5 rounded-xl bg-pink-600 text-white text-xs disabled:opacity-50">
              Approve
            </button>
            <button type="button" disabled={busy !== null} onClick={() => respond(request.id, "reject")}
              className="px-3 py-1.5 rounded-xl bg-white/10 text-zinc-300 text-xs disabled:opacity-50">
              Reject
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
