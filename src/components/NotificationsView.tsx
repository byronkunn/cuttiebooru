"use client";

import React, { useState } from "react";
import {
  Heart,
  UserPlus,
  AtSign,
  Bookmark,
  BadgeCheck,
  CheckCheck,
  Trash2,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { NotificationItem, Post, User } from "@/types/cuttiebooru";

interface NotificationsViewProps {
  notifications: NotificationItem[];
  followingIds: string[];
  lightTheme: boolean;
  onSelectPost: (post: Post) => void;
  onSelectCreator: (creator: User) => void;
  onToggleFollow: (targetUserId: string) => void;
  onStartMessage: (targetUser: User) => void;
  onMarkOneRead: (notificationId: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onDeleteNotification: (notificationId: string) => Promise<void>;
}

function formatRelativeTime(dateStr: string): string {
  const diffSec = Math.max(
    1,
    Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  );
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

export function NotificationsView({
  notifications,
  followingIds,
  lightTheme,
  onSelectPost,
  onSelectCreator,
  onToggleFollow,
  onStartMessage,
  onMarkOneRead,
  onMarkAllRead,
  onDeleteNotification,
}: NotificationsViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "verified" | "mentions">(
    "all"
  );

  const filtered = notifications.filter((n) => {
    if (activeTab === "verified") return n.actor?.isVerified;
    if (activeTab === "mentions") return n.type === "mention";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <div
        className={`rounded-3xl overflow-hidden border shadow-2xl ${
          lightTheme
            ? "bg-white border-purple-200 text-zinc-900"
            : "bg-[#151722] border-white/10 text-zinc-100"
        }`}
      >
        {/* Twitter-style Top Sticky Header */}
        <div
          className={`px-5 pt-4 border-b ${
            lightTheme
              ? "bg-white/95 border-purple-100"
              : "bg-[#151722]/95 border-white/10"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-500 text-white">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-pink-500/15 hover:bg-pink-500/25 text-pink-400 text-xs font-bold transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Twitter 3-Column Tabs: All | Verified | Mentions */}
          <div className="grid grid-cols-3 text-xs sm:text-sm font-bold">
            {(
              [
                { id: "all", label: "All" },
                { id: "verified", label: "Verified" },
                { id: "mentions", label: "Mentions" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`py-3.5 text-center border-b-2 transition-all relative ${
                  activeTab === t.id
                    ? "border-pink-500 text-pink-400"
                    : "border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notification Feed List */}
        <div className="divide-y divide-white/[0.07]">
          {filtered.length === 0 ? (
            <div className="py-16 px-6 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-pink-400 mx-auto opacity-70" />
              <p className="text-base font-bold">Nothing to see here — yet</p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                From likes to follows, collection saves, and creator mentions,
                this is where all the action happens.
              </p>
            </div>
          ) : (
            filtered.map((notif) => {
              const isFollowingActor = followingIds.includes(notif.actorId);

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.isRead) {
                      onMarkOneRead(notif.id);
                    }
                    if (notif.type === "comic_chapter" && notif.comicSeriesId) {
                      window.location.href = `/comics?series=${encodeURIComponent(notif.comicSeriesId)}`;
                    } else if (notif.post) {
                      onSelectPost(notif.post);
                    } else if (notif.actor) {
                      onSelectCreator(notif.actor);
                    }
                  }}
                  className={`p-4 sm:px-6 flex items-start gap-3.5 cursor-pointer transition-colors relative ${
                    !notif.isRead
                      ? lightTheme
                        ? "bg-pink-50/70 hover:bg-pink-100/60"
                        : "bg-pink-500/[0.06] hover:bg-pink-500/[0.1]"
                      : "hover:bg-white/[0.03]"
                  }`}
                >
                  {/* Unread Dot */}
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-pink-500 absolute left-2 top-6 shadow-sm shadow-pink-500" />
                  )}

                  {/* Left Twitter Icon Column */}
                  <div className="w-9 flex justify-end pt-0.5 shrink-0">
                    {notif.type === "like" && (
                      <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
                    )}
                    {notif.type === "follow" && (
                      <UserPlus className="w-6 h-6 text-sky-400" />
                    )}
                    {notif.type === "mention" && (
                      <AtSign className="w-6 h-6 text-purple-400" />
                    )}
                    {notif.type === "collection_save" && (
                      <Bookmark className="w-6 h-6 text-emerald-400 fill-emerald-400/30" />
                    )}
                    {notif.type !== "like" &&
                      notif.type !== "follow" &&
                      notif.type !== "mention" &&
                      notif.type !== "collection_save" && (
                        <Sparkles className="w-6 h-6 text-amber-400" />
                      )}
                  </div>

                  {/* Right Content Column */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notif.actor) onSelectCreator(notif.actor);
                        }}
                        className="flex items-center gap-2.5 group/actor"
                      >
                        <img
                          src={notif.actor?.avatarUrl}
                          alt={notif.actor?.displayName}
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-pink-500/30"
                        />
                        <div className="flex flex-wrap items-center gap-1 text-sm">
                          <span className="font-bold group-hover/actor:underline flex items-center gap-1">
                            {notif.actor?.displayName}
                            {notif.actor?.isVerified && (
                              <BadgeCheck className="w-4 h-4 text-pink-400 shrink-0" />
                            )}
                          </span>
                          <span className="text-xs text-zinc-400">
                            @{notif.actor?.username}
                          </span>
                          <span className="text-xs text-zinc-500">
                            · {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNotification(notif.id);
                        }}
                        title="Dismiss notification"
                        className="p-1.5 rounded-full text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Notification Text & Post Preview */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                          {notif.type === "mention" ? (
                            <span>
                              {notif.text.split(/(@[a-z0-9_]+)/gi).map((part, i) =>
                                part.startsWith("@") ? (
                                  <span
                                    key={i}
                                    className="text-pink-400 font-semibold"
                                  >
                                    {part}
                                  </span>
                                ) : (
                                  part
                                )
                              )}
                            </span>
                          ) : (
                            <>
                              <span className="font-semibold text-white">
                                {notif.actor?.displayName}
                              </span>{" "}
                              {notif.text}
                            </>
                          )}
                        </p>

                        {/* Follow Card for Follow Notifications */}
                        {notif.type === "follow" && notif.actor && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2 p-3.5 rounded-2xl border border-white/10 bg-black/25 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">
                                {notif.actor.displayName} (@
                                {notif.actor.username})
                              </p>
                              <p className="text-xs text-zinc-400 line-clamp-1">
                                {notif.actor.bio}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onToggleFollow(notif.actor.id)}
                              className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                                isFollowingActor
                                  ? "border border-white/25 text-white hover:border-rose-400 hover:text-rose-300"
                                  : "bg-white text-black hover:bg-zinc-200"
                              }`}
                            >
                              {isFollowingActor ? "Following" : "Follow back"}
                            </button>
                          </div>
                        )}

                        {/* Quick Reply action on Mention Notifications */}
                        {notif.type === "mention" && notif.actor && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-1 flex items-center gap-3"
                          >
                            <button
                              type="button"
                              onClick={() => onStartMessage(notif.actor)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-400 hover:text-pink-300"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Reply via Direct Message
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Right Thumbnail if notification references a post */}
                      {notif.post && (
                        <img
                          src={
                            notif.post.thumbnailUrl || notif.post.mediaUrl
                          }
                          alt={notif.post.title}
                          className="w-14 h-14 rounded-xl object-cover border border-white/15 shrink-0 hover:scale-105 transition-transform"
                        />
                      )}
                    </div>
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

