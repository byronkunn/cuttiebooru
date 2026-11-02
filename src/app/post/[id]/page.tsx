"use client";
import { isProfileLinkAllowed } from "@/lib/profile-links";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Share2,
  ExternalLink,
  Calendar,
  Eye,
  BadgeCheck,
  Plus,
  Sparkles,
  Download,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  MessageSquare,
  Shield,
  Hash,
  Search,
  X,
} from "lucide-react";
import { Post, User, Comment } from "@/types/cuttiebooru";
import { TAG_CATEGORIES, getTagCategoryStyle } from "@/lib/tag-taxonomy";
import { SiteShell } from "@/components/SiteShell";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = (params?.id as string) || "";

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFollowingCreator, setIsFollowingCreator] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Suggest Tag State
  const [showSuggestTag, setShowSuggestTag] = useState(false);
  const [suggestTagName, setSuggestTagName] = useState("");
  const [suggestTagCategory, setSuggestTagCategory] = useState("general");

  // All Tags Modal State for posts with tons of tags
  const [showAllTagsModal, setShowAllTagsModal] = useState(false);
  const [tagModalSearch, setTagModalSearch] = useState("");
  const [tagModalCategoryFilter, setTagModalCategoryFilter] = useState("all");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const loadPostData = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const [postRes, sessionRes] = await Promise.all([
        fetch(`/api/posts/${encodeURIComponent(postId)}`),
        fetch("/api/account"),
      ]);

      const postData = await postRes.json();
      if (!postRes.ok) throw new Error(postData.error || "Post not found");

      setPost(postData.post);
      setRelatedPosts(postData.relatedPosts || []);
      setComments(postData.post.comments || []);

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        const user = sessionData.user || null;
        setCurrentUser(user);

        if (user && postData.post) {
          const [favRes, followRes] = await Promise.all([
            fetch(`/api/interactions?action=check_favorite&postId=${postData.post.id}`),
            fetch(`/api/interactions?action=check_follow&creatorId=${postData.post.creatorId}`),
          ]);
          if (favRes.ok) {
            const fd = await favRes.json();
            setIsFavorited(!!fd.favorited);
          }
          if (followRes.ok) {
            const fld = await followRes.json();
            setIsFollowingCreator(!!fld.following);
          }
        }
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPostData();
    setActiveGalleryIdx(0);
  }, [loadPostData]);

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      router.push("/signin");
      return;
    }
    if (!post) return;
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "favorite", postId: post.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsFavorited(data.favorited);
        setPost((prev) =>
          prev
            ? {
                ...prev,
                _count: {
                  ...prev._count,
                  favorites: data.favorited
                    ? (prev._count?.favorites || 0) + 1
                    : Math.max(0, (prev._count?.favorites || 1) - 1),
                },
              }
            : null
        );
        showToast(data.favorited ? "Saved to favorites!" : "Removed from favorites");
      }
    } catch {
      showToast("Could not update favorite");
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser) {
      router.push("/signin");
      return;
    }
    if (!post?.creator) return;
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "follow", creatorId: post.creatorId }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsFollowingCreator(data.following);
        showToast(
          data.following
            ? `Followed @${post.creator.username}`
            : `Unfollowed @${post.creator.username}`
        );
      }
    } catch {
      showToast("Could not update follow status");
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Post link copied to clipboard!");
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      router.push("/signin");
      return;
    }
    if (!newCommentText.trim() || !post) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newCommentText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post comment");

      setComments((prev) => [data.comment, ...prev]);
      setNewCommentText("");
      showToast("Comment posted!");
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSuggestTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestTagName.trim() || !post) return;
    try {
      await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest_tag",
          postId: post.id,
          tagName: suggestTagName.trim().toLowerCase().replace(/\s+/g, "_"),
          tagCategory: suggestTagCategory,
        }),
      });
      showToast("Tag suggestion submitted for moderation!");
      setShowSuggestTag(false);
      setSuggestTagName("");
    } catch {
      showToast("Could not submit tag suggestion");
    }
  };

  // Hitting plus automatically tags user to search for that tag
  const handleTagSearchPlus = (tagName: string) => {
    router.push(`/?tags=${encodeURIComponent(tagName)}`);
  };

  if (loading) {
    return (
      <SiteShell activeNav="post" currentUser={currentUser}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-zinc-400">Loading Booru post...</p>
          </div>
        </div>
      </SiteShell>
    );
  }

  if (errorMsg || !post) {
    return (
      <SiteShell activeNav="post" currentUser={currentUser}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <div className="p-8 rounded-3xl bg-[#141622] border border-white/10 max-w-md w-full space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-black text-white">Post Not Found</h2>
            <p className="text-xs text-zinc-400">
              {errorMsg || "The media item you are looking for does not exist or was deleted."}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Explore Feed
            </Link>
          </div>
        </div>
      </SiteShell>
    );
  }

  // Parse gallery list
  let galleryList: string[] = [post.mediaUrl];
  try {
    const parsed = JSON.parse(post.galleryUrls || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      galleryList = parsed;
    }
  } catch {
    galleryList = [post.mediaUrl];
  }
  const activeMediaUrl = galleryList[activeGalleryIdx] || post.mediaUrl;

  // Group tags by category
  const tagsByCategory: Record<string, typeof post.tags> = {};
  for (const pt of post.tags) {
    const cat = pt.tag.category || "general";
    if (!tagsByCategory[cat]) tagsByCategory[cat] = [];
    tagsByCategory[cat].push(pt);
  }

  return (
    <SiteShell activeNav="post" currentUser={currentUser}>
      <div className="space-y-6">
        {/* Toast Alert */}
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold shadow-2xl animate-fade-in">
            {toastMsg}
          </div>
        )}

        {/* Media Action Sub-bar */}
        <div className="p-4 rounded-3xl bg-[#141622] border border-white/[0.08] flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors shrink-0"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 truncate">
                <h1 className="text-base sm:text-lg font-black text-white truncate">{post.title}</h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase shrink-0 border ${
                    post.rating === "explicit"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : post.rating === "questionable"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  {post.rating?.toUpperCase() || "SFW"}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                by{" "}
                <Link
                  href={`/user/${post.creator.username}`}
                  className="text-pink-400 hover:underline font-semibold"
                >
                  @{post.creator.username}
                </Link>{" "}
                in <span className="text-zinc-300">{post.category}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                isFavorited
                  ? "bg-pink-600 text-white border-pink-500 shadow-lg shadow-pink-600/25"
                  : "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorited ? "fill-current" : ""}`} />
              <span>{isFavorited ? "Favorited" : "Favorite"}</span>
              <span>({post._count?.favorites || 0})</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors"
              title="Share post"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <a
              href={activeMediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors"
              title="Download original file"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Main Grid: Left Media & Comments (8 cols) + Right Taxonomy & Creator (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Media Player Container - NO AUTO PLAY FOR VIDEOS */}
            <div className="rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl relative flex items-center justify-center min-h-[420px] max-h-[78vh]">
              {post.mediaType === "video" ? (
                <video
                  src={activeMediaUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-[75vh] object-contain rounded-2xl"
                />
              ) : (
                <img
                  src={activeMediaUrl}
                  alt={post.title}
                  className="w-full max-h-[75vh] object-contain select-none"
                />
              )}

              {/* Gallery Navigator */}
              {galleryList.length > 1 && (
                <>
                  {activeGalleryIdx > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveGalleryIdx((prev) => prev - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-pink-600 text-white backdrop-blur-md border border-white/20 transition-all"
                      title="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {activeGalleryIdx < galleryList.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveGalleryIdx((prev) => prev + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-pink-600 text-white backdrop-blur-md border border-white/20 transition-all"
                      title="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/75 border border-white/15 text-[11px] font-bold text-white backdrop-blur-md">
                    {activeGalleryIdx + 1} / {galleryList.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {galleryList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-2 rounded-2xl bg-[#141622] border border-white/[0.08]">
                {galleryList.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveGalleryIdx(idx)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      activeGalleryIdx === idx
                        ? "border-pink-500 scale-105 shadow-md shadow-pink-500/30"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description & Attribution */}
            <div className="p-6 rounded-3xl bg-[#141622] border border-white/[0.08] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-white">{post.title}</h2>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {post.views} views
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {post.description && (
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line max-w-3xl">
                  {post.description}
                </p>
              )}

              {(post.attribution || isProfileLinkAllowed(post.sourceUrl)) && (
                <div className="p-3 rounded-2xl bg-black/30 border border-white/5 text-xs text-zinc-400 flex flex-wrap gap-2 items-center justify-between">
                  {post.attribution && <span className="break-words min-w-0">
                    Artist credit: <strong className="text-white">{post.attribution}</strong>
                  </span>}
                  {isProfileLinkAllowed(post.sourceUrl) && (
                    <a
                      href={post.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-400 hover:underline flex items-center gap-1"
                    >
                      <span>Original Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="p-6 rounded-3xl bg-[#141622] border border-white/[0.08] space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-pink-400 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Comments ({comments.length})</span>
                </h3>
                <span className="text-xs text-zinc-400">Community Discussion</span>
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handlePostComment} className="space-y-3">
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder={
                    currentUser
                      ? "Write a comment about this artwork..."
                      : "Sign in to leave a comment..."
                  }
                  rows={2}
                  disabled={submittingComment || !currentUser}
                  className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500 disabled:opacity-50 placeholder:text-zinc-500"
                />
                <div className="flex items-center justify-between">
                  {!currentUser ? (
                    <Link href="/signin" className="text-xs text-pink-400 hover:underline font-semibold">
                      Sign in to comment →
                    </Link>
                  ) : (
                    <span className="text-[11px] text-zinc-500">
                      Posting as @{currentUser.username}
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={submittingComment || !newCommentText.trim() || !currentUser}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-pink-600/25 transition-all flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingComment ? "Posting..." : "Post Comment"}</span>
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-3 pt-2">
                {comments.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-black/20 border border-white/5 space-y-1">
                    <p className="text-xs font-semibold text-zinc-300">No comments yet.</p>
                    <p className="text-[11px] text-zinc-500">Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-black/25 border border-white/5 space-y-2 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/user/${c.author.username}`}
                          className="flex items-center gap-2 group"
                        >
                          <img
                            src={c.author.avatarUrl || "/sfw/avatar/0738955ca929985f39921b4876053170.png"}
                            alt={c.author.displayName}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-pink-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors flex items-center gap-1">
                              {c.author.displayName}
                              {c.author.role === "admin" && (
                                <Shield className="w-3 h-3 text-rose-400" />
                              )}
                              {c.author.isVerified && (
                                <BadgeCheck className="w-3 h-3 text-pink-400" />
                              )}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              @{c.author.username}
                            </span>
                          </div>
                        </Link>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-200 pl-9 whitespace-pre-line leading-relaxed">
                        {c.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Related Works */}
            {relatedPosts.length > 0 && (
              <div className="p-6 rounded-3xl bg-[#141622] border border-white/[0.08] space-y-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-pink-400">
                  More Creations Like This
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {relatedPosts.map((rp) => (
                    <Link
                      key={rp.id}
                      href={`/post/${rp.id}`}
                      className="group relative rounded-xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-pink-500/50 transition-all flex flex-col justify-between"
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden">
                        <img
                          src={rp.thumbnailUrl || rp.mediaUrl}
                          alt={rp.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-1.5">
                        <p className="text-[11px] font-bold text-white truncate group-hover:text-pink-300">
                          {rp.title}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Booru Tag Taxonomy Sidebar & Creator Card */}
          <div className="lg:col-span-4 space-y-6">
            {/* Creator Summary Card */}
            <div className="p-5 rounded-3xl bg-[#141622] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/user/${post.creator.username}`}
                  className="flex items-center gap-3 group"
                >
                  <img
                    src={post.creator.avatarUrl || "/sfw/avatar/0738955ca929985f39921b4876053170.png"}
                    alt={post.creator.displayName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-pink-500/40 group-hover:ring-pink-500 transition-all"
                  />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-pink-300 transition-colors flex items-center gap-1">
                      <span>{post.creator.displayName}</span>
                      {post.creator.isVerified && (
                        <BadgeCheck className="w-3.5 h-3.5 text-pink-400" />
                      )}
                    </h3>
                    <p className="text-[11px] text-zinc-400">@{post.creator.username}</p>
                  </div>
                </Link>

                {currentUser?.id !== post.creatorId && (
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isFollowingCreator
                        ? "bg-purple-600/20 text-purple-300 border border-purple-500/40"
                        : "bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-600/20"
                    }`}
                  >
                    {isFollowingCreator ? "Following ✓" : "Follow"}
                  </button>
                )}
              </div>

              {post.creator.bio && (
                <p className="text-xs text-zinc-400 line-clamp-2">{post.creator.bio}</p>
              )}

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <Link
                  href={`/user/${post.creator.username}`}
                  className="text-pink-400 hover:underline font-semibold"
                >
                  View Full Creator Profile →
                </Link>
                <Link
                  href={`/messages?user=${post.creator.username}`}
                  className="text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-pink-400" />
                  <span>Message</span>
                </Link>
              </div>
            </div>

            {/* Booru Tags Section (Grouped by Category with Modal for Heavy Tag Posts) */}
            <div className="p-5 rounded-3xl bg-[#141622] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Booru Tags ({post.tags.length})</span>
                </h3>
                <div className="flex items-center gap-2">
                  {post.tags.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowAllTagsModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-pink-500/15 hover:bg-pink-500 text-pink-300 hover:text-white text-[11px] font-bold transition-all border border-pink-500/30"
                    >
                      <Hash className="w-3 h-3" />
                      <span>View All ({post.tags.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowSuggestTag(!showSuggestTag)}
                    className="text-[11px] font-bold text-zinc-400 hover:text-pink-400 transition-colors"
                  >
                    + Suggest Tag
                  </button>
                </div>
              </div>

              {/* Tag Suggestion Form */}
              {showSuggestTag && (
                <form
                  onSubmit={handleSuggestTagSubmit}
                  className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2 animate-fade-in"
                >
                  <p className="text-[11px] font-bold text-zinc-300">Suggest a Tag for this Post</p>
                  <input
                    type="text"
                    value={suggestTagName}
                    onChange={(e) => setSuggestTagName(e.target.value)}
                    placeholder="tag_name (e.g. thighhighs)"
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                  <select
                    value={suggestTagCategory}
                    onChange={(e) => setSuggestTagCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-pink-500"
                  >
                    {TAG_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label} ({c.id})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowSuggestTag(false)}
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              )}

              {/* Tags Grouped by Category */}
              <div className="space-y-3.5">
                {Object.entries(tagsByCategory).map(([catId, catTags]) => {
                  const catMeta = TAG_CATEGORIES.find((c) => c.id === catId);
                  const style = getTagCategoryStyle(catId);
                  const visibleCatTags = catTags.slice(0, 6);
                  const hasMore = catTags.length > 6;

                  return (
                    <div key={catId} className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                        {catMeta?.label || catId}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {visibleCatTags.map((pt) => (
                          <div
                            key={pt.tag.id}
                            className={`inline-flex items-center rounded-lg border text-xs font-medium overflow-hidden transition-all ${style.bg} ${style.border} ${style.text}`}
                          >
                            <Link
                              href={`/?tags=${encodeURIComponent(pt.tag.name)}`}
                              className="px-2 py-0.5 hover:underline"
                              title={`Search for #${pt.tag.name}`}
                            >
                              #{pt.tag.name}
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                handleTagSearchPlus(pt.tag.name);
                                showToast(`Added #${pt.tag.name} to search chips!`);
                              }}
                              title={`Add #${pt.tag.name} to active search chips`}
                              className="px-1.5 py-0.5 hover:bg-white/20 border-l border-current/20 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {hasMore && (
                          <button
                            type="button"
                            onClick={() => {
                              setTagModalCategoryFilter(catId);
                              setShowAllTagsModal(true);
                            }}
                            className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-pink-500/20 text-zinc-400 hover:text-pink-300 border border-white/10 hover:border-pink-500/30 transition-all"
                          >
                            +{catTags.length - 6} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {post.tags.length > 8 && (
                <button
                  type="button"
                  onClick={() => {
                    setTagModalCategoryFilter("all");
                    setShowAllTagsModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-white/10 mt-2"
                >
                  <Hash className="w-3.5 h-3.5 text-pink-400" />
                  <span>Browse All {post.tags.length} Tags Modal →</span>
                </button>
              )}
            </div>

            {/* Post Technical Meta */}
            <div className="p-5 rounded-3xl bg-[#141622] border border-white/[0.08] space-y-3 text-xs">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-pink-400">
                Technical Details
              </h3>
              <div className="divide-y divide-white/[0.06] space-y-2">
                <div className="pt-2 flex items-center justify-between text-zinc-400">
                  <span>Post ID</span>
                  <span className="font-mono text-white text-[11px]">{post.id}</span>
                </div>
                <div className="pt-2 flex items-center justify-between text-zinc-400">
                  <span>Content Rating</span>
                  <span className="uppercase font-bold text-white">{post.rating}</span>
                </div>
                <div className="pt-2 flex items-center justify-between text-zinc-400">
                  <span>Media Format</span>
                  <span className="uppercase font-semibold text-white">
                    {post.mediaType} ({galleryList.length} file{galleryList.length > 1 ? "s" : ""})
                  </span>
                </div>
                {post.videoDuration && (
                  <div className="pt-2 flex items-center justify-between text-zinc-400">
                    <span>Duration</span>
                    <span className="font-semibold text-white">{post.videoDuration}</span>
                  </div>
                )}
                <div className="pt-2 flex items-center justify-between text-zinc-400">
                  <span>Aspect Ratio</span>
                  <span className="capitalize text-white">{post.aspectRatio}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ALL TAGS MODAL (High-volume Booru Tags Browser & Quick Filter)
      ========================================================================= */}
      {showAllTagsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowAllTagsModal(false)}
          />

          <div className="relative w-full max-w-2xl rounded-3xl bg-[#141624] border border-white/15 p-5 sm:p-6 shadow-2xl text-white space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <span>All Tags on this Post</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40">
                      {post.tags.length} tags
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Click any tag to search or click &quot;+&quot; to stage it in your search bar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllTagsModal(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Filter & Category Filter Chips */}
            <div className="space-y-2.5 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={tagModalSearch}
                  onChange={(e) => setTagModalSearch(e.target.value)}
                  placeholder={`Search ${post.tags.length} tags on this media...`}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500"
                />
                {tagModalSearch && (
                  <button
                    type="button"
                    onClick={() => setTagModalSearch("")}
                    className="absolute right-2.5 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => setTagModalCategoryFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    tagModalCategoryFilter === "all"
                      ? "bg-pink-600 text-white"
                      : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  All ({post.tags.length})
                </button>
                {Object.entries(tagsByCategory).map(([catId, catTags]) => {
                  const catMeta = TAG_CATEGORIES.find((c) => c.id === catId);
                  return (
                    <button
                      key={catId}
                      type="button"
                      onClick={() => setTagModalCategoryFilter(catId)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        tagModalCategoryFilter === catId
                          ? "bg-pink-600 text-white"
                          : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {catMeta?.label || catId} ({catTags.length})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Tag Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {Object.entries(tagsByCategory)
                .filter(
                  ([catId]) =>
                    tagModalCategoryFilter === "all" ||
                    tagModalCategoryFilter === catId
                )
                .map(([catId, catTags]) => {
                  const filteredCatTags = catTags.filter((pt) =>
                    pt.tag.name
                      .toLowerCase()
                      .includes(tagModalSearch.toLowerCase().trim().replace(/^#/, ""))
                  );
                  if (filteredCatTags.length === 0) return null;
                  const catMeta = TAG_CATEGORIES.find((c) => c.id === catId);
                  const style = getTagCategoryStyle(catId);

                  return (
                    <div key={catId} className="space-y-2">
                      <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-pink-300">
                          {catMeta?.label || catId}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-semibold">
                          ({filteredCatTags.length})
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {filteredCatTags.map((pt) => (
                          <div
                            key={pt.tag.id}
                            className={`inline-flex items-center rounded-xl border text-xs font-semibold overflow-hidden transition-all shadow-sm ${style.bg} ${style.border} ${style.text}`}
                          >
                            <Link
                              href={`/?tags=${encodeURIComponent(pt.tag.name)}`}
                              className="px-2.5 py-1 hover:underline"
                              title={`Explore all posts tagged #${pt.tag.name}`}
                            >
                              #{pt.tag.name}
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                handleTagSearchPlus(pt.tag.name);
                                showToast(`Added #${pt.tag.name} to search chips!`);
                              }}
                              title={`Add #${pt.tag.name} to active search chips`}
                              className="px-2 py-1 hover:bg-white/20 border-l border-current/20 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
              <span className="text-xs text-zinc-400">
                {post.tags.length} total tags categorized on this post
              </span>
              <button
                type="button"
                onClick={() => setShowAllTagsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </SiteShell>
  );
}
