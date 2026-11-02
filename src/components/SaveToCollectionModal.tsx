"use client";

import React, { useState } from "react";
import {
  X,
  Bookmark,
  Plus,
  Lock,
  Globe,
  Check,
  Sparkles,
} from "lucide-react";
import { Collection, Post, Album, User } from "@/types/cuttiebooru";

interface SaveToCollectionModalProps {
  isOpen: boolean;
  targetPost?: Post | null;
  targetAlbum?: Album | null;
  targetCreator?: User | null;
  collections: Collection[];
  currentUserId: string;
  lightTheme: boolean;
  onClose: () => void;
  onAddToCollection: (
    collectionId: string,
    payload: { postId?: string; albumId?: string; creatorId?: string }
  ) => Promise<void>;
  onCreateCollection: (
    title: string,
    description: string,
    isPublic: boolean
  ) => Promise<Collection | null>;
}

export function SaveToCollectionModal({
  isOpen,
  targetPost,
  targetAlbum,
  targetCreator,
  collections,
  currentUserId,
  lightTheme,
  onClose,
  onAddToCollection,
  onCreateCollection,
}: SaveToCollectionModalProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const targetTitle =
    targetPost?.title ||
    targetAlbum?.title ||
    targetCreator?.displayName ||
    "Item";

  const userCollections = collections.filter(
    (c) => c.ownerId === currentUserId || c.isCurated
  );

  const handleSave = async (colId: string) => {
    await onAddToCollection(colId, {
      postId: targetPost?.id,
      albumId: targetAlbum?.id,
      creatorId: targetCreator?.id,
    });
    setSavedIds((prev) => [...prev, colId]);
  };

  const handleCreateAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    const created = await onCreateCollection(
      newTitle.trim(),
      newDesc.trim(),
      isPublic
    );
    if (created) {
      await handleSave(created.id);
      setNewTitle("");
      setNewDesc("");
    }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-5 ${
          lightTheme
            ? "bg-white border-purple-200 text-zinc-900"
            : "bg-[#171925] border-white/10 text-zinc-100"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Save to Collection</h3>
              <p className="text-xs text-zinc-400 truncate max-w-[260px]">
                {targetTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing Collections List */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {userCollections.map((col) => {
            const alreadyIn =
              savedIds.includes(col.id) ||
              col.items?.some(
                (i) =>
                  (targetPost && i.postId === targetPost.id) ||
                  (targetAlbum && i.albumId === targetAlbum.id) ||
                  (targetCreator && i.creatorId === targetCreator.id)
              );

            return (
              <button
                key={col.id}
                type="button"
                onClick={() => handleSave(col.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                  alreadyIn
                    ? "bg-pink-500/15 border-pink-500/40 text-pink-200"
                    : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold truncate">
                      {col.title}
                    </span>
                    {col.isPublic ? (
                      <Globe className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    )}
                    {col.isCurated && (
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {col.items?.length || 0} saved items •{" "}
                    {col.isPublic ? "Public" : "Private"}
                  </span>
                </div>

                <span
                  className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 ${
                    alreadyIn
                      ? "bg-pink-500 text-white"
                      : "bg-white/10 text-zinc-300"
                  }`}
                >
                  {alreadyIn ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Saved
                    </>
                  ) : (
                    "Add"
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Create New Collection Form */}
        <form
          onSubmit={handleCreateAndSave}
          className="pt-4 border-t border-white/10 space-y-3"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5 text-pink-400" />
            Or Create New Collection
          </span>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Collection name (e.g. Cosplay Wigs & Props)"
            className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-pink-500"
          />

          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Optional description..."
            className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-pink-500"
          />

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded accent-pink-500"
              />
              Make Public & Shareable (Private by default)
            </label>

            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-semibold disabled:opacity-40 shadow-lg shadow-pink-500/20"
            >
              {creating ? "Creating..." : "Create & Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

