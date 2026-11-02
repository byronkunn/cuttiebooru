"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Star,
  Hash,
  Users,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  MessageCircle,
  BadgeCheck,
  UserCheck,
  UserPlus,
  Sparkles,
} from "lucide-react";
import type { User, Tag } from "@/types/cuttiebooru";
import { getTagCategoryStyle } from "@/lib/tag-taxonomy";

interface FollowingManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  users: User[];
  tags: Tag[];
  followingIds: string[];
  followedTagNames: string[];
  lightTheme: boolean;
  onToggleFollowCreator: (creatorId: string) => void;
  onToggleFollowTag: (tagName: string, e?: React.MouseEvent) => void;
  onSelectTag: (tagName: string) => void;
  onSelectCreator: (creator: User) => void;
  onStartMessage?: (creator: User) => void;
}

export function FollowingManagerModal({
  isOpen,
  onClose,
  currentUser,
  users,
  tags,
  followingIds,
  followedTagNames,
  lightTheme,
  onToggleFollowCreator,
  onToggleFollowTag,
  onSelectTag,
  onSelectCreator,
  onStartMessage,
}: FollowingManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"tags" | "creators">("tags");
  const [tagInput, setTagInput] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap and Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Followed creators list
  const followedCreators = useMemo(() => {
    return users.filter((u) => followingIds.includes(u.id));
  }, [users, followingIds]);

  // Suggested creators that are not followed yet
  const suggestedCreators = useMemo(() => {
    return users.filter(
      (u) => u.id !== currentUser?.id && !followingIds.includes(u.id)
    );
  }, [users, currentUser?.id, followingIds]);

  // Filtered tags for the tags tab
  const displayedTags = useMemo(() => {
    if (!filterQuery.trim()) return followedTagNames;
    const q = filterQuery.toLowerCase().replace(/^#/, "");
    return followedTagNames.filter((t) => t.toLowerCase().includes(q));
  }, [followedTagNames, filterQuery]);

  // Filtered creators for the creators tab
  const displayedCreators = useMemo(() => {
    if (!filterQuery.trim()) return followedCreators;
    const q = filterQuery.toLowerCase().replace(/^@/, "");
    return followedCreators.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q)
    );
  }, [followedCreators, filterQuery]);

  // Suggested tags to follow from database
  const suggestedTags = useMemo(() => {
    return tags
      .filter((t) => !followedTagNames.includes(t.name))
      .slice(0, 10);
  }, [tags, followedTagNames]);

  const handleAddTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tagInput.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "_");
    if (!clean) return;
    if (!followedTagNames.includes(clean)) {
      onToggleFollowTag(clean);
    }
    setTagInput("");
  };

  if (!isOpen) return null;

  const panelBg = lightTheme
    ? "bg-white border-purple-200 text-zinc-900"
    : "bg-[#141622] border-white/10 text-zinc-100";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Manage Following"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl my-auto flex flex-col overflow-hidden max-h-[90vh] ${panelBg}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
                Following & Subscriptions
              </h2>
              <p className="text-xs text-zinc-400">
                Manage followed tags and creators to personalize your feed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="px-5 sm:px-6 pt-4 pb-2 space-y-3 shrink-0">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <button
              type="button"
              onClick={() => {
                setActiveTab("tags");
                setFilterQuery("");
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === "tags"
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                  : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <Hash className="w-4 h-4" />
              <span>Followed Tags</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === "tags"
                    ? "bg-black/20 text-black"
                    : "bg-white/10 text-zinc-300"
                }`}
              >
                {followedTagNames.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("creators");
                setFilterQuery("");
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === "creators"
                  ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20"
                  : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Followed People</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === "creators"
                    ? "bg-white/20 text-white"
                    : "bg-white/10 text-zinc-300"
                }`}
              >
                {followingIds.length}
              </span>
            </button>
          </div>

          {/* Search Filter in Current Tab */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={
                activeTab === "tags"
                  ? "Filter your followed tags..."
                  : "Filter your followed people..."
              }
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Tab 1: Followed Tags */}
        {activeTab === "tags" && (
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-3 space-y-5">
            {/* Quick Add Tag Form */}
            <form onSubmit={handleAddTagSubmit} className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                Follow a New Tag
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Type tag name (e.g. cosplay, fantasy, 18+)..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={!tagInput.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 disabled:opacity-40 transition-all shrink-0"
                >
                  Follow Tag
                </button>
              </div>
            </form>

            {/* Followed Tags List */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                Your Followed Tags ({followedTagNames.length})
              </h3>

              {displayedTags.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border border-white/10 bg-black/20 space-y-2">
                  <Star className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-300">
                    {filterQuery
                      ? `No followed tags match "${filterQuery}"`
                      : "You are not following any booru tags yet."}
                  </p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Follow tags to discover matching images, videos, and manga on your Following feed tab.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {displayedTags.map((tagName) => {
                    const matchedTag = tags.find((t) => t.name === tagName);
                    const category = matchedTag?.category || "general";
                    const style = getTagCategoryStyle(category);
                    const artworkCount = matchedTag?._count?.posts ?? matchedTag?.usageCount ?? 0;

                    return (
                      <div
                        key={tagName}
                        className="p-3 rounded-2xl border border-white/10 bg-black/25 flex items-center justify-between gap-3 group hover:border-amber-500/40 transition-all"
                      >
                        <div
                          className="min-w-0 cursor-pointer flex-1"
                          onClick={() => {
                            onClose();
                            onSelectTag(tagName);
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm text-amber-300 group-hover:text-amber-200 truncate">
                              #{tagName}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${style.bg} ${style.text}`}
                            >
                              {category}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {artworkCount > 0
                              ? `${artworkCount} artworks`
                              : "Explore tag feed"}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectTag(tagName);
                            }}
                            title={`Browse #${tagName} in feed`}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => onToggleFollowTag(tagName, e)}
                            title={`Unfollow #${tagName}`}
                            className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-rose-500/20 text-amber-300 hover:text-rose-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Suggested Tags to Follow */}
            {suggestedTags.length > 0 && (
              <div className="pt-2 border-t border-white/10 space-y-2">
                <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Popular Suggestions to Follow:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedTags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onToggleFollowTag(t.name)}
                      className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 border border-white/10 hover:border-amber-500/40 text-zinc-300 flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3 h-3 text-amber-400" />
                      <span>#{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Followed People */}
        {activeTab === "creators" && (
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-3 space-y-5">
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                Creators You Follow ({followingIds.length})
              </h3>

              {displayedCreators.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border border-white/10 bg-black/20 space-y-2">
                  <Users className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-300">
                    {filterQuery
                      ? `No followed creators match "${filterQuery}"`
                      : "You are not following any creators yet."}
                  </p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Follow artists and sculptors to get their latest media in your Following feed.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedCreators.map((creator) => (
                    <div
                      key={creator.id}
                      className="p-3 rounded-2xl border border-white/10 bg-black/25 flex items-center justify-between gap-3 hover:border-pink-500/30 transition-all"
                    >
                      <div
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                        onClick={() => {
                          onClose();
                          onSelectCreator(creator);
                        }}
                      >
                        <img
                          src={creator.avatarUrl || "/default-avatar.svg"}
                          alt={creator.displayName}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-pink-500/40 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs sm:text-sm text-white hover:text-pink-400 transition-colors truncate">
                              {creator.displayName}
                            </span>
                            {creator.isVerified && (
                              <BadgeCheck className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate">
                            @{creator.username} • {creator.niche || "Creator"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {onStartMessage && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onStartMessage(creator);
                            }}
                            title={`Send direct message to @${creator.username}`}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onToggleFollowCreator(creator.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-pink-500/20 text-pink-300 hover:bg-rose-500/30 hover:text-rose-200 border border-pink-500/30 transition-all flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Following</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suggested Creators */}
            {suggestedCreators.length > 0 && (
              <div className="pt-2 border-t border-white/10 space-y-3">
                <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pink-400" />
                  Recommended Creators to Follow:
                </span>
                <div className="space-y-2">
                  {suggestedCreators.map((creator) => (
                    <div
                      key={creator.id}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3"
                    >
                      <div
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                        onClick={() => {
                          onClose();
                          onSelectCreator(creator);
                        }}
                      >
                        <img
                          src={creator.avatarUrl || "/default-avatar.svg"}
                          alt={creator.displayName}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {creator.displayName}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            @{creator.username}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleFollowCreator(creator.id)}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-sm transition-all flex items-center gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Follow</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-between bg-black/20 shrink-0">
          <span className="text-xs text-zinc-400">
            Total active subscriptions:{" "}
            <strong className="text-white">
              {followedTagNames.length + followingIds.length}
            </strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
