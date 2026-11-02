"use client";
import { isProfileLinkAllowed, parseProfileLinks } from "@/lib/profile-links";

import React, { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Globe,
  Share2,
  UserPlus,
  UserCheck,
  Bookmark,
  Flag,
  FolderHeart,
  Image as ImageIcon,
  Info,
  ExternalLink,
  MessageCircle,
  Camera,
  Edit3,
} from "lucide-react";
import { User, Post, Album, FollowRelation } from "@/types/cuttiebooru";
import { ImageCard } from "./ImageCard";

interface CreatorProfileViewProps {
  creator: User;
  currentUserId: string;
  posts: Post[];
  albums: Album[];
  allFollows: FollowRelation[];
  favoritePostIds: string[];
  isFollowing: boolean;
  lightTheme: boolean;
  onBack: () => void;
  onSelectPost: (post: Post) => void;
  onSelectCreator: (creator: User) => void;
  onSelectAlbum: (album: Album) => void;
  onSelectTag: (tagName: string) => void;
  onToggleFavorite: (postId: string, e: React.MouseEvent) => void;
  onToggleFollow: (creatorId: string) => void;
  onOpenSaveModal: (post: Post, e: React.MouseEvent) => void;
  onSaveCreatorToCollection: (creator: User) => void;
  onReportCreator: (creator: User) => void;
  onShare: (title: string, url: string) => void;
  onOpenFollowModal: (
    user: User,
    tab: "followers" | "following" | "verified"
  ) => void;
  onOpenEditProfileModal: () => void;
  onStartMessage: (creator: User) => void;
}

export function CreatorProfileView({
  creator,
  currentUserId,
  posts,
  albums,
  allFollows,
  favoritePostIds,
  isFollowing,
  lightTheme,
  onBack,
  onSelectPost,
  onSelectCreator,
  onSelectAlbum,
  onSelectTag,
  onToggleFavorite,
  onToggleFollow,
  onOpenSaveModal,
  onSaveCreatorToCollection,
  onReportCreator,
  onShare,
  onOpenFollowModal,
  onOpenEditProfileModal,
  onStartMessage,
}: CreatorProfileViewProps) {
  const [activeTab, setActiveTab] = useState<"posts" | "albums" | "about">(
    "posts"
  );

  const isOwnProfile = creator.id === currentUserId;
  const creatorPosts = posts.filter((p) => p.creatorId === creator.id);
  const creatorAlbums = albums.filter((a) => a.creatorId === creator.id);

  const followersCount = allFollows.filter(
    (f) => f.followingId === creator.id
  ).length;
  const followingCount = allFollows.filter(
    (f) => f.followerId === creator.id
  ).length;

  const socials = parseProfileLinks(creator.socialLinks);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Back & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-pink-500/15 border border-white/10 text-xs sm:text-sm font-semibold transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-pink-400" />
          Back to Discovery
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSaveCreatorToCollection(creator)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-purple-500/20 border border-white/10 text-xs font-semibold"
          >
            <Bookmark className="w-3.5 h-3.5 text-purple-400" />
            Save
          </button>
          <button
            type="button"
            onClick={() =>
              onShare(
                `${creator.displayName} (@${creator.username})`,
                `${window.location.origin}/?creator=${creator.username}`
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 text-xs font-semibold"
          >
            <Share2 className="w-3.5 h-3.5 text-pink-400" />
            Share
          </button>
          <button
            type="button"
            onClick={() => onReportCreator(creator)}
            title="Report Profile"
            className="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 text-zinc-400 hover:text-amber-300"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Header Banner + Avatar Profile Card */}
      <div
        className={`rounded-3xl overflow-hidden border shadow-xl ${
          lightTheme
            ? "bg-white border-purple-200"
            : "bg-[#161822] border-white/[0.08]"
        }`}
      >
        {/* Banner with Twitter-style Camera Edit Overlay if own profile */}
        <div className="relative h-44 sm:h-60 w-full bg-gradient-to-r from-pink-600/40 via-purple-700/40 to-indigo-900/40 group">
          {creator.headerUrl && (
            <img
              src={creator.headerUrl}
              alt={creator.displayName}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#161822] via-black/25 to-transparent" />
          {isOwnProfile && (
            <button
              type="button"
              onClick={onOpenEditProfileModal}
              title="Change banner photo"
              className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/65 hover:bg-pink-500 text-white text-xs font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              Edit Banner & Avatar
            </button>
          )}
        </div>

        <div className="px-4 sm:px-6 pb-6 -mt-12 sm:-mt-14 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Avatar with Twitter-style Camera Overlay if own profile */}
              <div
                onClick={() => isOwnProfile && onOpenEditProfileModal()}
                className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-4 ring-[#161822] shadow-2xl bg-zinc-900 ${
                  isOwnProfile ? "cursor-pointer group/avatar" : ""
                }`}
              >
                <img
                  src={creator.avatarUrl}
                  alt={creator.displayName}
                  className="w-full h-full object-cover"
                />
                {isOwnProfile && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold">
                    {creator.displayName}
                  </h1>
                  {creator.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      <BadgeCheck className="w-3.5 h-3.5 text-pink-400" />
                      Verified
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {creator.niche}
                  </span>
                </div>
                <p className="text-sm text-zinc-400">@{creator.username}</p>
              </div>
            </div>

            {/* Right Action Buttons: Edit Profile (if own) OR Message + Follow */}
            <div className="flex flex-wrap items-center gap-2.5">
              {isOwnProfile ? (
                <button
                  type="button"
                  onClick={onOpenEditProfileModal}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/25 hover:bg-white/10 text-xs sm:text-sm font-bold transition-all"
                >
                  <Edit3 className="w-4 h-4 text-pink-400" />
                  Edit profile
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onStartMessage(creator)}
                    title={`Send Direct Message to @${creator.username}`}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-white/20 bg-white/5 hover:bg-pink-500/20 hover:border-pink-500/40 text-xs sm:text-sm font-bold transition-all"
                  >
                    <MessageCircle className="w-4 h-4 text-pink-400" />
                    Message
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleFollow(creator.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                      isFollowing
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                        : "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/30 hover:opacity-95"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Follow
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="mt-4 text-sm text-zinc-300 max-w-3xl leading-relaxed">
            {creator.bio}
          </p>

          {/* Twitter-style Clickable Following & Followers Counts */}
          <div className="mt-4 flex flex-wrap items-center gap-5 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => onOpenFollowModal(creator, "following")}
              className="hover:underline flex items-center gap-1"
            >
              <span className="font-extrabold text-white">
                {followingCount}
              </span>
              <span className="text-zinc-400">Following</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenFollowModal(creator, "followers")}
              className="hover:underline flex items-center gap-1"
            >
              <span className="font-extrabold text-white">
                {followersCount}
              </span>
              <span className="text-zinc-400">Followers</span>
            </button>

            <span className="flex items-center gap-1 text-zinc-400">
              <strong className="text-pink-400">{creatorPosts.length}</strong>{" "}
              Works
            </span>

            <span className="flex items-center gap-1 text-zinc-400">
              <strong className="text-purple-400">
                {creatorAlbums.length}
              </strong>{" "}
              Albums
            </span>
          </div>

          {/* External Platform Links */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isProfileLinkAllowed(creator.websiteUrl) && (
              <a
                href={creator.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-w-0 max-w-full items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-pink-500/20 text-xs font-medium text-pink-300 border border-white/10 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span className="break-all">{creator.websiteUrl.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
              </a>
            )}
            {Object.entries(socials).map(([platform, handle]) =>
              handle ? (
                <a
                  key={platform}
                  href={handle}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full min-w-0 items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-pink-500/20 text-xs text-zinc-300 border border-white/10"
                >
                  <span className="break-all font-bold text-purple-400">{platform}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : null
            )}
          </div>
        </div>

        {/* Profile Navigation Tabs: Posts | Albums | About */}
        <div className="px-4 sm:px-6 border-t border-white/10 flex items-center gap-2 bg-black/20 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 px-4 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "posts"
                ? "border-pink-500 text-pink-400"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Posts ({creatorPosts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("albums")}
            className={`flex items-center gap-2 px-4 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "albums"
                ? "border-pink-500 text-pink-400"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <FolderHeart className="w-4 h-4" />
            Albums ({creatorAlbums.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("about")}
            className={`flex items-center gap-2 px-4 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "about"
                ? "border-pink-500 text-pink-400"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Info className="w-4 h-4" />
            About & Attribution
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "posts" && (
        <div>
          {creatorPosts.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#141622] border border-white/10 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 mx-auto flex items-center justify-center">
                <ImageIcon className="w-7 h-7 opacity-75" />
              </div>
              <h3 className="text-sm font-bold text-white">No creations published yet</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {isOwnProfile
                  ? "You haven't uploaded any artworks or videos yet. Share your high-res creations with the community!"
                  : `@${creator.username} hasn't published any artworks or videos yet.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {creatorPosts.map((post) => (
                <ImageCard
                  key={post.id}
                  post={post}
                  isFavorited={favoritePostIds.includes(post.id)}
                  lightTheme={lightTheme}
                  onSelectPost={onSelectPost}
                  onSelectCreator={onSelectCreator}
                  onSelectTag={onSelectTag}
                  onToggleFavorite={onToggleFavorite}
                  onOpenSaveModal={onOpenSaveModal}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "albums" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {creatorAlbums.length === 0 ? (
            <p className="text-sm text-zinc-400 col-span-full py-8 text-center">
              No albums published yet.
            </p>
          ) : (
            creatorAlbums.map((album) => (
              <div
                key={album.id}
                onClick={() => onSelectAlbum(album)}
                className="group rounded-2xl overflow-hidden border border-white/10 bg-[#181a24] hover:border-pink-500/50 cursor-pointer transition-all"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={album.coverUrl}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/70 text-pink-300 border border-pink-500/30">
                    {album._count?.posts ?? album.posts?.length ?? 0} files
                  </span>
                </div>
                <div className="p-4 space-y-1.5">
                  <h3 className="font-bold text-base group-hover:text-pink-400 transition-colors">
                    {album.title}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {album.description}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "about" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl border border-white/10 bg-[#161822] space-y-4">
            <h3 className="text-base font-bold text-pink-400">
              Creator Bio & Focus
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
              {creator.bio}
            </p>
            <div className="pt-2 space-y-2 text-xs text-zinc-400">
              <p>
                <strong className="text-zinc-200">Primary Niche:</strong>{" "}
                {creator.niche}
              </p>
              <p>
                <strong className="text-zinc-200">Joined Cuttiebooru:</strong>{" "}
                {new Date(creator.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-white/10 bg-[#161822] space-y-4">
            <h3 className="text-base font-bold text-purple-400">
              Sharing & Attribution Policy
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Reposting within Cuttiebooru collections is always welcome! If you
              share works externally or cosplay from these character sheets,
              please link back to{" "}
              <span className="text-pink-400 font-semibold">
                @{creator.username}
              </span>{" "}
              and include the original source URL.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
