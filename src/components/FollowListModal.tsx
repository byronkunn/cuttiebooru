"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  BadgeCheck,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import { User, FollowRelation } from "@/types/cuttiebooru";

interface FollowListModalProps {
  isOpen: boolean;
  targetUser: User | null;
  initialTab: "followers" | "following" | "verified";
  allFollows: FollowRelation[];
  currentUserFollowingIds: string[];
  currentUserId: string;
  lightTheme: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
  onToggleFollow: (targetUserId: string) => void;
  onStartMessage: (targetUser: User) => void;
}

export function FollowListModal({
  isOpen,
  targetUser,
  initialTab,
  allFollows,
  currentUserFollowingIds,
  currentUserId,
  lightTheme,
  onClose,
  onSelectUser,
  onToggleFollow,
  onStartMessage,
}: FollowListModalProps) {
  const [activeTab, setActiveTab] = useState<
    "verified" | "followers" | "following"
  >(initialTab);
  const [hoveredUnfollowId, setHoveredUnfollowId] = useState<string | null>(
    null
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button, a[href], [tabindex='0']");
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keyDown);
    return () => { document.removeEventListener("keydown", keyDown); previousFocus?.focus(); };
  }, [isOpen]);

  if (!isOpen || !targetUser) return null;

  // Users who follow targetUser
  const followersList = allFollows
    .filter((f) => f.followingId === targetUser.id)
    .map((f) => f.follower);

  // Verified users who follow targetUser
  const verifiedFollowersList = followersList.filter((u) => u.isVerified);

  // Users whom targetUser is following
  const followingList = allFollows
    .filter((f) => f.followerId === targetUser.id)
    .map((f) => f.following);

  // Users who follow the active signed-in user (for "Follows you" badge)
  const followsCurrentUserSet = new Set(
    allFollows
      .filter((f) => f.followingId === currentUserId)
      .map((f) => f.followerId)
  );

  const displayedUsers =
    activeTab === "verified"
      ? verifiedFollowersList
      : activeTab === "followers"
      ? followersList
      : followingList;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      <div
        className={`w-full max-w-lg rounded-3xl overflow-hidden border shadow-2xl max-h-[88dvh] flex flex-col ${
          lightTheme
            ? "bg-white border-purple-200 text-zinc-900"
            : "bg-[#151722] border-white/15 text-zinc-100"
        }`}
        role="dialog"
        ref={dialogRef}
        aria-modal="true"
        aria-label={`Followers and following for @${targetUser.username}`}
      >
        {/* Top Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Close followers and following"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold truncate flex items-center gap-1">
                {targetUser.displayName}
                {targetUser.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-pink-400 shrink-0" />
                )}
              </h2>
              <p className="text-xs text-zinc-400 truncate">
                @{targetUser.username}
              </p>
            </div>
          </div>
        </div>

        {/* Twitter-style Tabs: Verified Followers | Followers | Following */}
        <div className="grid grid-cols-3 border-b border-white/10 text-xs sm:text-sm font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("verified")}
            className={`py-3.5 text-center border-b-2 transition-all ${
              activeTab === "verified"
                ? "border-pink-500 text-pink-400"
                : "border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            Verified ({verifiedFollowersList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("followers")}
            className={`py-3.5 text-center border-b-2 transition-all ${
              activeTab === "followers"
                ? "border-pink-500 text-pink-400"
                : "border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            Followers ({followersList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("following")}
            className={`py-3.5 text-center border-b-2 transition-all ${
              activeTab === "following"
                ? "border-pink-500 text-pink-400"
                : "border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            Following ({followingList.length})
          </button>
        </div>

        {/* User List */}
        <div className="overflow-y-auto flex-1 divide-y divide-white/[0.06]">
          {displayedUsers.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-2">
              <p className="text-sm font-bold">
                {activeTab === "following"
                  ? `@${targetUser.username} isn't following anyone yet`
                  : `No ${
                      activeTab === "verified" ? "verified " : ""
                    }followers yet`}
              </p>
              <p className="text-xs text-zinc-400">
                When accounts follow or get followed, they&apos;ll show up right
                here.
              </p>
            </div>
          ) : (
            displayedUsers.map((u) => {
              const isMe = u.id === currentUserId;
              const isFollowing = currentUserFollowingIds.includes(u.id);
              const followsYou = followsCurrentUserSet.has(u.id);

              return (
                <div
                  key={u.id}
                  className="p-4 hover:bg-white/[0.03] transition-colors flex items-start justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectUser(u);
                    }}
                    className="flex items-start gap-3 text-left cursor-pointer min-w-0 flex-1"
                  >
                    <img
                      src={u.avatarUrl}
                      alt={u.displayName}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-pink-500/30 shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-sm hover:underline truncate">
                          {u.displayName}
                        </span>
                        {u.isVerified && (
                          <BadgeCheck className="w-4 h-4 text-pink-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
                        <span>@{u.username}</span>
                        {followsYou && !isMe && (
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-zinc-300">
                            Follows you
                          </span>
                        )}
                      </div>
                      {u.bio && (
                        <p className="text-xs text-zinc-300 line-clamp-2 pt-0.5">
                          {u.bio}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Action Buttons: Message & Follow / Following (Unfollow on hover) */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onStartMessage(u);
                        }}
                        title={`Message @${u.username}`}
                        className="p-2 rounded-full border border-white/15 bg-white/5 hover:bg-pink-500/20 hover:border-pink-500/40 text-pink-400 transition-all"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}

                    {!isMe && (
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredUnfollowId(u.id)}
                        onMouseLeave={() => setHoveredUnfollowId(null)}
                        onClick={() => onToggleFollow(u.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all min-w-[96px] ${
                          isFollowing
                            ? hoveredUnfollowId === u.id
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/50"
                              : "bg-transparent text-white border border-white/25"
                            : "bg-white text-black hover:bg-zinc-200 shadow"
                        }`}
                      >
                        {isFollowing ? (
                          hoveredUnfollowId === u.id ? (
                            "Unfollow"
                          ) : (
                            "Following"
                          )
                        ) : (
                          <span className="flex items-center justify-center gap-1">
                            <UserPlus className="w-3.5 h-3.5" />
                            Follow
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
