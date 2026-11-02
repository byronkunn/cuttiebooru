"use client";

import { useState } from "react";
import type { Post } from "@/types/cuttiebooru";
import { isProfileLinkAllowed } from "@/lib/profile-links";

export function ReportedPostPreview({ post }: { post: Post }) {
  const [index, setIndex] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  let files = [post.mediaUrl];
  try {
    const gallery: unknown = JSON.parse(post.galleryUrls || "[]");
    if (Array.isArray(gallery) && gallery.length > 0 && gallery.every((url): url is string => typeof url === "string" && !!url)) {
      files = gallery;
    }
  } catch (error) {
    console.error("Unable to parse reported post gallery", post.id, error);
  }
  const mediaUrl = files[index] || post.mediaUrl;
  const isVideo = /\.(mp4|webm|mov)(?:[?#]|$)/i.test(mediaUrl) || (files.length === 1 && post.mediaType === "video");

  return (
    <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <summary className="cursor-pointer text-sm font-bold text-pink-300">View reported post</summary>
      <div className="mt-3 space-y-3 text-xs text-zinc-300">
        <h2 className="text-base font-bold text-white break-words">{post.title}</h2>
        {isVideo ? (
          <video key={mediaUrl} src={mediaUrl} controls playsInline preload="metadata" onError={() => setMediaError(true)} className="w-full max-h-[60dvh] rounded-lg bg-black" />
        ) : (
          // Moderation previews support arbitrary uploaded media without an image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img key={mediaUrl} src={mediaUrl} alt={post.title} onError={() => setMediaError(true)} className="w-full max-h-[60dvh] object-contain rounded-lg bg-black" />
        )}
        {mediaError && <p role="alert" className="text-amber-300">Unable to load this media. It may be missing or restricted to approved viewers.</p>}
        {files.length > 1 && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={index === 0} onClick={() => { setIndex(index - 1); setMediaError(false); }} className="rounded-lg bg-white/10 px-3 py-2 disabled:opacity-40">Previous file</button>
            <span>File {index + 1} of {files.length}</span>
            <button type="button" disabled={index === files.length - 1} onClick={() => { setIndex(index + 1); setMediaError(false); }} className="rounded-lg bg-white/10 px-3 py-2 disabled:opacity-40">Next file</button>
          </div>
        )}
        <p>Uploaded by @{post.creator.username} · Rating: {post.rating || "Not set"}</p>
        {post.description && <p className="whitespace-pre-wrap break-words">{post.description}</p>}
        {post.attribution && <p className="break-words">Artist credit: {post.attribution}</p>}
        {isProfileLinkAllowed(post.sourceUrl) && <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-pink-300 underline">Original source (opens new tab)</a>}
        <p className="break-words">Tags: {post.tags.map(({ tag }) => `#${tag.name}`).join(" ") || "None"}</p>
        <p>Permission to share confirmed by uploader: {post.permissionConfirmed ? "Yes" : "No"}</p>
      </div>
    </details>
  );
}
