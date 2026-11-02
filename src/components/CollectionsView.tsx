"use client";

import React, { useState } from "react";
import {
  Bookmark,
  Sparkles,
  Lock,
  Globe,
  Plus,
  Share2,
  Trash2,
  ArrowUp,
  ArrowDown,
  FolderHeart,
  BadgeCheck,
} from "lucide-react";
import { Collection, Post, Album, User } from "@/types/cuttiebooru";

interface CollectionsViewProps {
  collections: Collection[];
  currentUser: User | null;
  lightTheme: boolean;
  onSelectPost: (post: Post) => void;
  onSelectAlbum: (album: Album) => void;
  onSelectCreator: (creator: User) => void;
  onCreateCollection: (
    title: string,
    description: string,
    isPublic: boolean
  ) => Promise<Collection | null>;
  onTogglePrivacy: (collectionId: string) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  onReorderItem: (itemId: string, direction: "up" | "down") => Promise<void>;
  onShare: (title: string, url: string) => void;
}

export function CollectionsView({
  collections,
  currentUser,
  lightTheme,
  onSelectPost,
  onSelectAlbum,
  onSelectCreator,
  onCreateCollection,
  onTogglePrivacy,
  onRemoveItem,
  onReorderItem,
  onShare,
}: CollectionsViewProps) {
  const [filterTab, setFilterTab] = useState<"all" | "curated" | "mine">("all");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    collections[0]?.id || ""
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPublic, setNewPublic] = useState(false);

  const filteredCollections = collections.filter((c) => {
    if (filterTab === "curated") return c.isCurated;
    if (filterTab === "mine") return c.ownerId === currentUser?.id;
    return true;
  });

  const activeCollection =
    collections.find((c) => c.id === selectedCollectionId) ||
    filteredCollections[0] ||
    null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created = await onCreateCollection(
      newTitle.trim(),
      newDesc.trim(),
      newPublic
    );
    if (created) {
      setSelectedCollectionId(created.id);
      setNewTitle("");
      setNewDesc("");
      setNewPublic(false);
      setShowCreateForm(false);
    }
  };

  return (
    <div className="space-y-6 pb-14">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2.5">
            <Bookmark className="w-6 h-6 text-pink-400" />
            Curated & Personal Collections
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Organize favorite images, albums, and creators into private boards
            or shareable themed galleries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap rounded-2xl p-1 bg-white/[0.04] border border-white/10 text-xs font-semibold">
            {(["all", "curated", "mine"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterTab(t)}
                className={`px-3.5 py-1.5 rounded-xl capitalize transition-all ${
                  filterTab === t
                    ? "bg-pink-500 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {t === "all"
                  ? "All Galleries"
                  : t === "curated"
                  ? "Staff Curated"
                  : "My Collections"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-lg shadow-pink-500/20"
          >
            <Plus className="w-4 h-4" />
            New Collection
          </button>
        </div>
      </div>

      {/* Inline Create Collection Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className={`p-5 rounded-3xl border space-y-4 ${
            lightTheme
              ? "bg-white border-purple-200"
              : "bg-[#171925] border-pink-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-pink-400">
              Create New Named Collection
            </h3>
            <span className="text-xs text-zinc-400">
              Private by default — make public anytime
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Collection title (e.g. Magical Girl Staff References)"
              className="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description or theme notes..."
              className="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newPublic}
                onChange={(e) => setNewPublic(e.target.checked)}
                className="rounded accent-pink-500"
              />
              Make collection public and shareable
            </label>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold"
            >
              Create Collection
            </button>
          </div>
        </form>
      )}

      {/* Collection Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredCollections.map((col) => {
          const isSelected = activeCollection?.id === col.id;
          return (
            <div
              key={col.id}
              onClick={() => setSelectedCollectionId(col.id)}
              className={`group rounded-2xl overflow-hidden border cursor-pointer transition-all ${
                isSelected
                  ? "border-pink-500 ring-2 ring-pink-500/30 bg-[#1c1f2e]"
                  : lightTheme
                  ? "bg-white border-purple-200 hover:border-pink-400"
                  : "bg-[#161822] border-white/10 hover:border-pink-500/40"
              }`}
            >
              <div className="relative h-32 overflow-hidden bg-zinc-900">
                {col.coverUrl && (
                  <img
                    src={col.coverUrl}
                    alt={col.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  {col.isCurated ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-black flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {col.badgeText || "Curated"}
                    </span>
                  ) : col.isPublic ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-500/80 text-white flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Public
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/75 text-zinc-300 border border-white/15 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Private
                    </span>
                  )}
                </div>
                <span className="absolute bottom-2.5 right-2.5 text-[11px] font-semibold text-white bg-black/65 px-2 py-0.5 rounded-md">
                  {col.items?.length || 0} items
                </span>
              </div>
              <div className="p-3.5 space-y-1">
                <h3 className="font-bold text-sm line-clamp-1 group-hover:text-pink-400">
                  {col.title}
                </h3>
                <p className="text-xs text-zinc-400 line-clamp-2">
                  {col.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Collection Detail Viewer & Item Organizer */}
      {activeCollection && (
        <div
          className={`rounded-3xl border p-6 space-y-5 ${
            lightTheme
              ? "bg-white border-purple-200"
              : "bg-[#161822] border-white/10"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold">
                  {activeCollection.title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  {activeCollection.isPublic
                    ? "Public Gallery"
                    : "Private Board"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400">
                {activeCollection.description} • Curated by @
                {activeCollection.owner?.username || "hana_starlight"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onTogglePrivacy(activeCollection.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold"
              >
                {activeCollection.isPublic ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Switch to Private
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    Make Public & Shareable
                  </>
                )}
              </button>

              {activeCollection.isPublic && (
                <button
                  type="button"
                  onClick={() =>
                    onShare(
                      activeCollection.title,
                      `${window.location.origin}/?collection=${activeCollection.id}`
                    )
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 text-xs font-semibold"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share Collection
                </button>
              )}
            </div>
          </div>

          {activeCollection.items?.length === 0 ? (
            <p className="text-center text-sm text-zinc-400 py-10">
              This collection is empty. Click the Bookmark icon on any image,
              album, or creator profile to save items here!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCollection.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-2xl overflow-hidden border border-white/10 bg-[#1b1e2b] flex flex-col justify-between"
                >
                  {/* Item Content: Post OR Album OR Creator */}
                  {item.post && (
                    <div
                      onClick={() => onSelectPost(item.post!)}
                      className="cursor-pointer group"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={item.post.thumbnailUrl || item.post.mediaUrl}
                          alt={item.post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 text-pink-300">
                          Saved Work
                        </span>
                      </div>
                      <div className="p-3.5">
                        <h4 className="font-bold text-sm line-clamp-1 group-hover:text-pink-400">
                          {item.post.title}
                        </h4>
                        <p className="text-xs text-zinc-400">
                          by @{item.post.creator?.username}
                        </p>
                      </div>
                    </div>
                  )}

                  {item.album && (
                    <div
                      onClick={() => onSelectAlbum(item.album!)}
                      className="cursor-pointer group"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={item.album.coverUrl}
                          alt={item.album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white flex items-center gap-1">
                          <FolderHeart className="w-3 h-3" /> Saved Album
                        </span>
                      </div>
                      <div className="p-3.5">
                        <h4 className="font-bold text-sm line-clamp-1 group-hover:text-pink-400">
                          {item.album.title}
                        </h4>
                        <p className="text-xs text-zinc-400">
                          Album by @{item.album.creator?.username}
                        </p>
                      </div>
                    </div>
                  )}

                  {item.creator && (
                    <div
                      onClick={() => onSelectCreator(item.creator!)}
                      className="cursor-pointer group p-4 flex items-center gap-3.5 h-full"
                    >
                      <img
                        src={item.creator.avatarUrl}
                        alt={item.creator.displayName}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-pink-500/40"
                      />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                          Saved Creator
                        </span>
                        <h4 className="font-bold text-sm group-hover:text-pink-400 flex items-center gap-1">
                          {item.creator.displayName}
                          {item.creator.isVerified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-pink-400" />
                          )}
                        </h4>
                        <p className="text-xs text-zinc-400">
                          @{item.creator.username} • {item.creator.niche}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Item Rearrange & Remove Bar */}
                  <div className="px-3.5 py-2 bg-black/30 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
                    <span>Order #{idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => onReorderItem(item.id, "up")}
                        title="Move Earlier"
                        className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === activeCollection.items.length - 1}
                        onClick={() => onReorderItem(item.id, "down")}
                        title="Move Later"
                        className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        title="Remove from Collection"
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
