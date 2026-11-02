"use client";
import { isProfileLinkAllowed } from "@/lib/profile-links";

import { TAG_CATEGORIES, getTagCategoryStyle } from "@/lib/tag-taxonomy";

import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Bookmark,
  Share2,
  Flag,
  ExternalLink,
  Calendar,
  Eye,
  FolderHeart,
  BadgeCheck,
  Plus,
  Sparkles,
  Check,
  UserPlus,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { Post, User, Album } from "@/types/cuttiebooru";

interface ImageViewerModalProps {
  post: Post | null;
  allPosts: Post[];
  albums: Album[];
  isFavorited: boolean;
  isFollowingCreator: boolean;
  lightTheme: boolean;
  onClose: () => void;
  onSelectPost: (post: Post) => void;
  onSelectCreator: (creator: User) => void;
  onSelectAlbum: (album: Album) => void;
  onSelectTag: (tagName: string) => void;
  onToggleFavorite: (postId: string) => void;
  onToggleFollow: (creatorId: string) => void;
  onOpenSaveModal: (post: Post) => void;
  onOpenReportModal: (post: Post) => void;
  onSuggestTag: (postId: string, tagName: string, category: string) => Promise<void>;
  onShare: (title: string, url: string) => void;
}

export function ImageViewerModal({
  post,
  allPosts,
  albums,
  isFavorited,
  isFollowingCreator,
  lightTheme,
  onClose,
  onSelectPost,
  onSelectCreator,
  onSelectAlbum,
  onSelectTag,
  onToggleFavorite,
  onToggleFollow,
  onOpenSaveModal,
  onOpenReportModal,
  onSuggestTag,
  onShare,
}: ImageViewerModalProps) {
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [newTagCategory, setNewTagCategory] = useState("general");
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [tagSubmitted, setTagSubmitted] = useState(false);

  useEffect(() => {
    setActiveGalleryIdx(0);
    setIsPlayingVideo(false);
    setShowSuggestForm(false);
    setTagSubmitted(false);
  }, [post?.id]);

  useEffect(() => {
    if (!post) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      const idx = allPosts.findIndex((p) => p.id === post.id);
      if (e.key === "ArrowLeft" && idx > 0) {
        onSelectPost(allPosts[idx - 1]);
      } else if (e.key === "ArrowRight" && idx >= 0 && idx < allPosts.length - 1) {
        onSelectPost(allPosts[idx + 1]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [post, allPosts, onClose, onSelectPost]);

  if (!post) return null;

  const currentIdx = allPosts.findIndex((p) => p.id === post.id);
  const prevPost = currentIdx > 0 ? allPosts[currentIdx - 1] : null;
  const nextPost =
    currentIdx >= 0 && currentIdx < allPosts.length - 1
      ? allPosts[currentIdx + 1]
      : null;

  let galleryList: string[] = [post.mediaUrl];
  try {
    const parsed = JSON.parse(post.galleryUrls || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      galleryList = parsed;
    }
  } catch {
    galleryList = [post.mediaUrl];
  }

  const activeImageUrl = galleryList[activeGalleryIdx] || post.mediaUrl;
  const containingAlbum =
    albums.find((a) => a.id === post.albumId) || post.album || null;

  // Related posts sharing tags or creator
  const postTagNames = new Set(post.tags.map((t) => t.tag.name));
  const relatedPosts = allPosts
    .filter((p) => p.id !== post.id)
    .map((p) => {
      const sharedTags = p.tags.filter((t) => postTagNames.has(t.tag.name)).length;
      const sameCreator = p.creatorId === post.creatorId ? 2 : 0;
      const sameCategory = p.category === post.category ? 1 : 0;
      return { post: p, score: sharedTags * 3 + sameCreator + sameCategory };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.post);

  const handleTagSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    await onSuggestTag(post.id, newTagInput.trim(), newTagCategory);
    setNewTagInput("");
    setTagSubmitted(true);
    setTimeout(() => {
      setTagSubmitted(false);
      setShowSuggestForm(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div
        className={`relative w-full max-w-6xl rounded-3xl overflow-hidden border shadow-2xl my-auto max-h-[94vh] flex flex-col ${
          lightTheme
            ? "bg-white border-purple-200 text-zinc-900"
            : "bg-[#151722] border-white/10 text-zinc-100"
        }`}
      >
        {/* Top Modal Bar */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0 ${
            lightTheme
              ? "bg-purple-50/70 border-purple-200/70"
              : "bg-[#11131c] border-white/[0.07]"
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {post.rating === "explicit" ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-rose-600 text-white border border-rose-400/50 shrink-0">
                18+ Explicit
              </span>
            ) : post.rating === "questionable" ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-amber-500 text-black shrink-0">
                Ecchi (Suggestive)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                SFW
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-500/20 text-pink-400 border border-pink-500/30 shrink-0">
              {post.category}
            </span>
            <h2 className="text-base sm:text-lg font-bold truncate">
              {post.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!prevPost}
              onClick={() => prevPost && onSelectPost(prevPost)}
              title="Previous Post (←)"
              className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-pink-500/20 hover:border-pink-500/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!nextPost}
              onClick={() => nextPost && onSelectPost(nextPost)}
              title="Next Post (→)"
              className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-pink-500/20 hover:border-pink-500/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close Viewer (Esc)"
              className="p-2 rounded-xl bg-pink-500/15 text-pink-400 hover:bg-pink-500 hover:text-white transition-all ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Column: Media Display & Multi-file Gallery */}
            <div className="lg:col-span-7 bg-black/95 flex flex-col items-center justify-center relative min-h-[380px] sm:min-h-[520px] p-4">
              <div className="relative w-full flex items-center justify-center max-h-[65vh]">
                {post.mediaType === "video" ||
                /\.(mp4|webm|mov)$/i.test(activeImageUrl) ? (
                  <video
                    key={activeImageUrl}
                    src={activeImageUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="max-h-[62vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
                  />
                ) : (
                  <img
                    src={activeImageUrl}
                    alt={post.title}
                    onClick={() => {
                      if (galleryList.length > 1 && activeGalleryIdx < galleryList.length - 1) {
                        setActiveGalleryIdx((prev) => prev + 1);
                      } else if (nextPost) {
                        onSelectPost(nextPost);
                      } else if (galleryList.length > 1) {
                        setActiveGalleryIdx(0);
                      }
                    }}
                    className={`max-h-[62vh] w-auto max-w-full rounded-xl object-contain shadow-2xl transition-all ${
                      isPlayingVideo ? "ring-2 ring-pink-500 brightness-110" : ""
                    } ${galleryList.length > 1 || nextPost ? "cursor-pointer hover:opacity-95" : ""}`}
                    title={
                      galleryList.length > 1 && activeGalleryIdx < galleryList.length - 1
                        ? "Click to view next image in gallery"
                        : nextPost
                        ? `Click to view next post: "${nextPost.title}"`
                        : post.title
                    }
                  />
                )}
              </div>

              {/* Multi-file Gallery Strip */}
              {galleryList.length > 1 && (
                <div className="mt-4 flex items-center gap-2.5 overflow-x-auto py-1 px-2">
                  {galleryList.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveGalleryIdx(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                        activeGalleryIdx === idx
                          ? "border-pink-500 scale-105 shadow-lg shadow-pink-500/30"
                          : "border-white/20 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={url}
                        alt={`File ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-white bg-black/70 px-1 rounded">
                        {idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Creator, Actions, Tags, Attribution & Album */}
            <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col gap-5 border-t lg:border-t-0 lg:border-l border-white/10">
              {/* Creator Profile Card */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                  lightTheme
                    ? "bg-purple-50/60 border-purple-200/80"
                    : "bg-[#1b1e2b] border-white/[0.07]"
                }`}
              >
                <div
                  onClick={() => {
                    onClose();
                    onSelectCreator(post.creator);
                  }}
                  className="flex items-center gap-3 cursor-pointer group min-w-0"
                >
                  <img
                    src={post.creator.avatarUrl}
                    alt={post.creator.displayName}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-pink-500/50 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm sm:text-base group-hover:text-pink-400 transition-colors truncate">
                        {post.creator.displayName}
                      </span>
                      {post.creator.isVerified && (
                        <BadgeCheck className="w-4 h-4 text-pink-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate">
                      @{post.creator.username} • {post.creator.niche}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleFollow(post.creator.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    isFollowingCreator
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30"
                      : "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 hover:opacity-95"
                  }`}
                >
                  {isFollowingCreator ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      Follow
                    </>
                  )}
                </button>
              </div>

              {/* Primary Action Bar: Favorite, Save, Share, Report */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => onToggleFavorite(post.id)}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-2xl text-xs font-semibold border transition-all ${
                    isFavorited
                      ? "bg-pink-500 text-white border-pink-400 shadow-lg shadow-pink-500/30"
                      : "bg-white/5 hover:bg-pink-500/15 border-white/10 text-zinc-300"
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`}
                  />
                  <span>Favorite ({post._count?.favorites ?? 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenSaveModal(post)}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-2xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/40 text-zinc-300 transition-all"
                >
                  <Bookmark className="w-4 h-4 text-purple-400" />
                  <span>Collect</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onShare(
                      post.title,
                      `${window.location.origin}/?post=${post.id}`
                    )
                  }
                  className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-2xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-pink-500/15 text-zinc-300 transition-all"
                >
                  <Share2 className="w-4 h-4 text-pink-400" />
                  <span>Share</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenReportModal(post)}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-2xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-amber-500/15 hover:text-amber-300 text-zinc-400 transition-all"
                >
                  <Flag className="w-4 h-4" />
                  <span>Report</span>
                </button>
              </div>

              {/* Description & Stats */}
              <div className="space-y-2.5">
                <p className="text-sm leading-relaxed text-zinc-300">
                  {post.description || "No description provided."}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-pink-400" />
                    {(post.views + 1).toLocaleString()} views
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Containing Album Link */}
              {containingAlbum && (
                <div
                  onClick={() => {
                    onClose();
                    onSelectAlbum(containingAlbum);
                  }}
                  className="p-3.5 rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20 cursor-pointer transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={containingAlbum.coverUrl}
                      alt={containingAlbum.title}
                      className="w-11 h-11 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-pink-400 flex items-center gap-1">
                        <FolderHeart className="w-3 h-3" /> Featured in Album
                      </span>
                      <p className="text-sm font-semibold truncate">
                        {containingAlbum.title}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-pink-400 shrink-0" />
                </div>
              )}

              {/* Categorized Booru Tags + Community Tag Suggestion */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Booru Tags ({post.tags.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSuggestForm(!showSuggestForm)}
                    className="text-xs font-semibold text-pink-400 hover:text-pink-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Suggest Tag
                  </button>
                </div>

                {/* Categorized Tag Groups */}
                <div className="space-y-2.5">
                  {[
                    { id: "franchise", label: "Franchise" },
                    { id: "character", label: "Character" },
                    { id: "clothing", label: "Clothing" },
                    { id: "pose", label: "Pose" },
                    { id: "activity", label: "Activity" },
                    { id: "genre", label: "Genre & Theme" },
                    { id: "content", label: "Content & Rating" },
                    { id: "meta", label: "Media & Meta" },
                    { id: "appearance", label: "Appearance" },
                    { id: "anatomy", label: "Anatomy" },
                    { id: "setting", label: "Setting" },
                    { id: "general", label: "General" },
                  ].map((cat) => {
                    const groupTags = post.tags.filter(
                      (pt) => (pt.tag.category || "general") === cat.id
                    );
                    if (groupTags.length === 0) return null;
                    const style = getTagCategoryStyle(cat.id);

                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                          <span
                            className={`w-2 h-2 rounded-full ${style.solid}`}
                          />
                          <span className={style.text}>{cat.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {groupTags.map((pt) => (
                            <button
                              key={pt.id}
                              type="button"
                              onClick={() => {
                                onClose();
                                onSelectTag(pt.tag.name);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${style.bg} ${style.border} ${style.text} ${style.hover}`}
                            >
                              #{pt.tag.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {showSuggestForm && (
                  <form
                    onSubmit={handleTagSuggestionSubmit}
                    className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2"
                  >
                    <p className="text-xs text-zinc-400">
                      Suggest a consistent booru tag for creator/moderator review:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder="e.g. thighhighs, 18+,succubus"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-pink-500"
                      />
                      <select
                        value={newTagCategory}
                        onChange={(e) => setNewTagCategory(e.target.value)}
                        className="px-2 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-zinc-300"
                      >
                        {TAG_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
                      </select>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold"
                      >
                        {tagSubmitted ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          "Send"
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Source & Attribution Box */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-semibold flex items-center gap-1.5 text-zinc-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Artist Credit & Source
                  </span>
                  {isProfileLinkAllowed(post.sourceUrl) && (
                    <a
                      href={post.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-pink-400 hover:underline flex items-center gap-1"
                    >
                      Source Link <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-zinc-400">
                  {post.attribution ||
                    `Published by ${post.creator.displayName} (@${post.creator.username})`}
                </p>
              </div>
            </div>
          </div>

          {/* Related Images Beneath Post */}
          {relatedPosts.length > 0 && (
            <div className="p-5 sm:p-6 border-t border-white/10 bg-black/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  Related Works & Discovery
                </h3>
                <span className="text-xs text-zinc-400">
                  Matching tags & creator aesthetic
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {relatedPosts.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => onSelectPost(rel)}
                    className="group relative aspect-[4/5] rounded-xl overflow-hidden border border-white/10 cursor-pointer"
                  >
                    <img
                      src={rel.thumbnailUrl || rel.mediaUrl}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5">
                      <p className="text-xs font-semibold text-white truncate">
                        {rel.title}
                      </p>
                      <p className="text-[11px] text-pink-300 truncate">
                        @{rel.creator.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
