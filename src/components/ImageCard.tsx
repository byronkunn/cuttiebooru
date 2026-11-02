"use client";

import React, { useRef } from "react";
import {
  Heart,
  Bookmark,
  Video as VideoIcon,
  Image as ImageIcon,
} from "lucide-react";
import { Post, User } from "@/types/cuttiebooru";

interface ImageCardProps {
  post: Post;
  isFavorited: boolean;
  lightTheme: boolean;
  blurExplicit?: boolean;
  onSelectPost: (post: Post) => void;
  onSelectCreator: (creator: User) => void;
  onSelectTag?: (tagName: string) => void;
  onToggleFavorite: (postId: string, e: React.MouseEvent) => void;
  onOpenSaveModal: (post: Post, e: React.MouseEvent) => void;
}

export function ImageCard({
  post,
  isFavorited,
  lightTheme,
  blurExplicit = false,
  onSelectPost,
  onSelectCreator,
  onToggleFavorite,
  onOpenSaveModal,
}: ImageCardProps) {
  const favCount = post._count?.favorites ?? 0;
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo =
    post.mediaType === "video" || /\.(mp4|webm|mov)$/i.test(post.mediaUrl);
  const rating = post.rating || "sfw";
  const shouldBlur = blurExplicit && rating === "explicit";

  return (
    <div
      onClick={() => onSelectPost(post)}
      className={`group relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer ${
        lightTheme
          ? "bg-white border-purple-200/80 hover:border-pink-400 shadow-sm hover:shadow-xl hover:shadow-pink-500/10"
          : "bg-[#181a24] border-white/[0.07] hover:border-pink-500/50 shadow-lg hover:shadow-2xl hover:shadow-pink-500/10"
      }`}
    >
      {/* Media Container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-900">
        {isVideo ? (
          <video
            ref={videoRef}
            src={post.mediaUrl}
            poster={
              post.thumbnailUrl && !post.thumbnailUrl.endsWith(".mp4")
                ? post.thumbnailUrl
                : undefined
            }
            muted
            loop
            playsInline
            preload="metadata"
            className={`h-full w-full object-cover object-center transition-all duration-500 group-hover:scale-105 ${
              shouldBlur ? "blur-xl group-hover:blur-none" : ""
            }`}
          />
        ) : (
          <img
            src={post.thumbnailUrl || post.mediaUrl}
            alt={post.title}
            loading="lazy"
            className={`h-full w-full object-cover object-center transition-all duration-500 group-hover:scale-105 ${
              shouldBlur ? "blur-xl group-hover:blur-none" : ""
            }`}
          />
        )}

        {/* Subtle gradient overlay for bottom text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent opacity-65 group-hover:opacity-80 transition-opacity pointer-events-none" />

        {/* Top Left: Media Type Indicator (Video vs Image) */}
        <div className="absolute top-3 left-3 flex items-center z-10 pointer-events-none">
          {isVideo ? (
            <span
              title="Video"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md bg-black/60 text-white border border-white/20 shadow-sm"
            >
              <VideoIcon className="w-3 h-3 text-pink-400" />
              <span>Video</span>
            </span>
          ) : (
            <span
              title="Image"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md bg-black/60 text-white border border-white/20 shadow-sm"
            >
              <ImageIcon className="w-3 h-3 text-purple-400" />
              <span>Image</span>
            </span>
          )}
        </div>

        {/* Top Right: Favorite & Bookmark Quick Actions */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={(e) => onOpenSaveModal(post, e)}
            title="Save to Collection"
            className="p-2 rounded-full backdrop-blur-md bg-black/55 text-white/90 hover:bg-purple-500 hover:text-white border border-white/15 transition-all shadow-sm"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => onToggleFavorite(post.id, e)}
            title={isFavorited ? "Remove from Favorites" : "Favorite"}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full backdrop-blur-md text-xs font-semibold border transition-all shadow-sm ${
              isFavorited
                ? "bg-pink-500 text-white border-pink-400 shadow-pink-500/30"
                : "bg-black/55 text-white/90 hover:bg-pink-500/80 border-white/15"
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${isFavorited ? "fill-current" : ""}`}
            />
            <span>{favCount}</span>
          </button>
        </div>

        {/* Bottom Overlay: Bigger Avatar Icon positioned above Title of work */}
        <div className="absolute bottom-0 inset-x-0 p-3 sm:p-3.5 flex flex-col items-start gap-1.5 z-10">
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectCreator(post.creator);
            }}
            className="group/avatar flex items-center cursor-pointer"
            title={`By ${post.creator.displayName} (@${post.creator.username})`}
          >
            <img
              src={post.creator.avatarUrl}
              alt={post.creator.displayName}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-white/80 group-hover/avatar:ring-pink-400 group-hover/avatar:scale-110 transition-all shadow-lg"
            />
          </div>
          <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-pink-200 transition-colors drop-shadow-md">
            {post.title}
          </h3>
        </div>
      </div>
    </div>
  );
}
