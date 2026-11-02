"use client";

import React from "react";
import {
  X,
  FolderHeart,
  BadgeCheck,
  Share2,
  Bookmark,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { Album, Post, User } from "@/types/cuttiebooru";

interface AlbumViewerModalProps {
  album: Album | null;
  allPosts: Post[];
  lightTheme: boolean;
  onClose: () => void;
  onSelectPost: (post: Post) => void;
  onSelectCreator: (creator: User) => void;
  onSaveAlbumToCollection: (album: Album) => void;
  onShare: (title: string, url: string) => void;
}

export function AlbumViewerModal({
  album,
  allPosts,
  lightTheme,
  onClose,
  onSelectPost,
  onSelectCreator,
  onSaveAlbumToCollection,
  onShare,
}: AlbumViewerModalProps) {
  if (!album) return null;

  const albumPosts = allPosts.filter((p) => p.albumId === album.id);
  const displayPosts =
    albumPosts.length > 0 ? albumPosts : album.posts || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div
        className={`relative w-full max-w-5xl rounded-3xl overflow-hidden border shadow-2xl my-auto max-h-[92vh] flex flex-col ${
          lightTheme
            ? "bg-white border-purple-200 text-zinc-900"
            : "bg-[#151722] border-white/10 text-zinc-100"
        }`}
      >
        {/* Cover Banner Header */}
        <div className="relative h-52 sm:h-64 w-full shrink-0 overflow-hidden">
          <img
            src={album.coverUrl}
            alt={album.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#151722] via-black/50 to-black/30" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 text-white hover:bg-pink-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 inset-x-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-500 text-white flex items-center gap-1">
                  <FolderHeart className="w-3.5 h-3.5" />
                  Album • {displayPosts.length} works
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15 text-white backdrop-blur-md">
                  {album.category}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {album.title}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl">
                {album.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onSaveAlbumToCollection(album)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg transition-all"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Save Album
              </button>
              <button
                type="button"
                onClick={() =>
                  onShare(
                    album.title,
                    `${window.location.origin}/?album=${album.id}`
                  )
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Creator Link Bar */}
        <div className="px-6 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
          <div
            onClick={() => {
              onClose();
              onSelectCreator(album.creator);
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              src={album.creator.avatarUrl}
              alt={album.creator.displayName}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-pink-500/40"
            />
            <div>
              <span className="text-xs text-zinc-400 block">Curated by</span>
              <span className="text-sm font-semibold group-hover:text-pink-400 transition-colors flex items-center gap-1">
                {album.creator.displayName}
                {album.creator.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-pink-400" />
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectCreator(album.creator);
            }}
            className="text-xs font-semibold text-pink-400 hover:text-pink-300 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            View Creator Profile
          </button>
        </div>

        {/* Grid of Album Contents */}
        <div className="p-6 overflow-y-auto flex-1">
          {displayPosts.length === 0 ? (
            <p className="text-center text-sm text-zinc-400 py-12">
              No media items in this album yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {displayPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => {
                    onClose();
                    onSelectPost(post);
                  }}
                  className="group relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 cursor-pointer bg-zinc-900"
                >
                  {post.mediaType === "video" ||
                  post.mediaUrl?.toLowerCase().endsWith(".mp4") ? (
                    <video
                      src={post.mediaUrl}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <img
                      src={post.thumbnailUrl || post.mediaUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  {post.filesCount > 1 && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-black/70 text-white flex items-center gap-1">
                      <Layers className="w-3 h-3 text-pink-300" />
                      {post.filesCount}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-3">
                    <h4 className="text-xs sm:text-sm font-semibold text-white line-clamp-1 group-hover:text-pink-300">
                      {post.title}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

