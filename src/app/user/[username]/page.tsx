"use client";
import { isProfileLinkAllowed, parseProfileLinks } from "@/lib/profile-links";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  BadgeCheck,
  Shield,
  ShieldAlert,
  Globe,
  Share2,
  Image as ImageIcon,
  Info,
  ExternalLink,
  MessageCircle,
  FolderHeart,
  Upload,
  Settings,
  Heart,
  Calendar,
  Lock,
  Bookmark,
} from "lucide-react";
import { User, Post, Album, Collection, FollowRelation } from "@/types/cuttiebooru";
import { FollowListModal } from "@/components/FollowListModal";
import { SiteShell } from "@/components/SiteShell";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = (params?.username as string) || "";

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [favorites, setFavorites] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [isProtected, setIsProtected] = useState(false);
  const [favoritePostIds, setFavoritePostIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<
    "posts" | "albums" | "collections" | "likes" | "about"
  >("posts");
  const [toastMsg, setToastMsg] = useState("");
  const [followTab, setFollowTab] = useState<"followers" | "following" | null>(null);
  const [allFollows, setAllFollows] = useState<FollowRelation[]>([]);
  const [userFollowingIds, setUserFollowingIds] = useState<string[]>([]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const loadUserData = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const [userRes, sessionRes] = await Promise.all([
        fetch(`/api/users/${encodeURIComponent(username)}`),
        fetch("/api/account"),
      ]);

      const userData = await userRes.json();
      if (!userRes.ok) throw new Error(userData.error || "User not found");

      setProfileUser(userData.user);
      setPosts(userData.posts || []);
      setAlbums(userData.albums || []);
      setCollections(userData.collections || []);
      setFavorites(userData.favorites || []);
      setFollowersCount(userData.followersCount || 0);
      setFollowingCount(userData.followingCount || 0);
      setAllFollows(userData.allFollows || []);
      setUserFollowingIds(userData.userFollowingIds || []);
      setIsFollowing(!!userData.isFollowing);
      setIsRequested(!!userData.isRequested);
      setIsProtected(!!userData.isProtected);

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        setCurrentUser(sessionData.user || null);
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      router.push("/signin");
      return;
    }
    if (!profileUser) return;
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "follow",
          targetUserId: profileUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update follow status");
      if (res.ok) {
        setIsFollowing(data.following);
        setIsRequested(!!data.requested);
        showToast(
          data.requested
            ? `Follow request sent to @${profileUser.username}`
            : data.following
            ? `Followed @${profileUser.username}`
            : `Unfollowed @${profileUser.username}`
        );
        // Reload user data so if page was protected, posts become visible
        loadUserData();
      }
    } catch (error) {
      console.error("Could not update follow status:", error);
      showToast(error instanceof Error ? error.message : "Could not update follow status");
    }
  };

  const handleToggleFavorite = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      router.push("/signin");
      return;
    }
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "favorite", postId }),
      });
      const data = await res.json();
      if (res.ok) {
        setFavoritePostIds((prev) =>
          data.favorited ? [...prev, postId] : prev.filter((id) => id !== postId)
        );
      }
    } catch {
      // ignore
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Profile link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <SiteShell activeNav="user" currentUser={currentUser}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-zinc-400">Loading user profile...</p>
          </div>
        </div>
      </SiteShell>
    );
  }

  if (errorMsg || !profileUser) {
    return (
      <SiteShell activeNav="user" currentUser={currentUser}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <div className="p-8 rounded-3xl bg-[#141622] border border-white/10 max-w-md w-full space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center text-2xl font-bold">
              ?
            </div>
            <h2 className="text-xl font-black text-white">User Not Found</h2>
            <p className="text-xs text-zinc-400">
              {errorMsg || "The creator or user profile you are looking for does not exist."}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition-colors"
            >
              Back to Explore
            </Link>
          </div>
        </div>
      </SiteShell>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;
  const socials = parseProfileLinks(profileUser.socialLinks);

  const canViewCollections = isOwnProfile || profileUser.showCollections !== false;
  const canViewLikes = isOwnProfile || profileUser.showFavorites !== false;

  return (
    <SiteShell activeNav="user" currentUser={currentUser}>
      <div className="space-y-6">
        {/* Toast Alert */}
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold shadow-2xl animate-fade-in">
            {toastMsg}
          </div>
        )}

        {/* Profile Card Header */}
        <div className="rounded-3xl overflow-hidden border border-white/[0.08] bg-[#141622] shadow-2xl relative">
          {/* Banner */}
          <div className="relative h-44 sm:h-64 w-full bg-gradient-to-r from-pink-600/30 via-purple-700/30 to-indigo-900/30">
            {profileUser.headerUrl ? (
              <img
                src={profileUser.headerUrl}
                alt={profileUser.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-900/40 via-purple-900/40 to-black/60" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#141622] via-black/20 to-transparent" />
          </div>

          {/* User Info Bar */}
          <div className="px-5 sm:px-8 pb-6 -mt-14 sm:-mt-16 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                {/* Avatar */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-4 ring-[#141622] shadow-2xl bg-zinc-900 shrink-0">
                  <img
                    src={profileUser.avatarUrl || "/sfw/avatar/0738955ca929985f39921b4876053170.png"}
                    alt={profileUser.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-1.5">
                      <span>{profileUser.displayName}</span>
                      {profileUser.privateProfile && (
                        <span title="Protected Account">
                          <Lock className="w-4 h-4 text-zinc-400" />
                        </span>
                      )}
                    </h2>
                    {profileUser.role === "admin" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        <Shield className="w-3 h-3 text-rose-400" />
                        Admin
                      </span>
                    )}
                    {profileUser.isModerator && profileUser.role !== "admin" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                        Mod
                      </span>
                    )}
                    {profileUser.isVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                        <BadgeCheck className="w-3 h-3 text-pink-400" />
                        Verified
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {profileUser.niche || "Cute Art"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium">@{profileUser.username}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {isOwnProfile ? (
                  <Link
                    href="/settings"
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all flex items-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5 text-pink-400" />
                    <span>Edit Profile & Settings</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`/messages?user=${profileUser.username}`}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/40 text-xs font-bold text-white transition-all flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-pink-400" />
                      <span>Message</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        isFollowing
                          ? "bg-purple-600/20 text-purple-300 border border-purple-500/40"
                          : "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-600/20"
                      }`}
                    >
                      {isRequested ? "Cancel request" : isFollowing ? "Following ✓" : profileUser.privateProfile ? "Request to follow" : "Follow"}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleShare}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors"
                  title="Share profile"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bio & Details */}
            <div className="mt-4 space-y-3">
              {profileUser.bio && (
                <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl whitespace-pre-line break-words leading-relaxed">
                  {profileUser.bio}
                </p>
              )}

              {/* Stats & Meta */}
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-400 font-medium">
                <div>
                  <strong className="text-white font-bold">{posts.length}</strong> Works
                </div>
                <button type="button" onClick={() => setFollowTab("followers")} className="hover:underline">
                  <strong className="text-white font-bold">{followersCount}</strong> Followers
                </button>
                <button type="button" onClick={() => setFollowTab("following")} className="hover:underline">
                  <strong className="text-white font-bold">{followingCount}</strong> Following
                </button>
                {isProfileLinkAllowed(profileUser.websiteUrl) && (
                  <a
                    href={profileUser.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-pink-400 hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Website</span>
                  </a>
                )}
                <div className="flex items-center gap-1 text-zinc-500 text-[11px]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Joined {new Date(profileUser.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Navigation Tabs */}
          {!isProtected && (
            <div className="flex items-center gap-1 px-5 border-t border-white/[0.08] bg-black/20 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab("posts")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === "posts"
                    ? "border-pink-500 text-pink-400"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Works ({posts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("albums")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === "albums"
                    ? "border-pink-500 text-pink-400"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                <FolderHeart className="w-3.5 h-3.5" />
                <span>Albums ({albums.length})</span>
              </button>

              {canViewCollections && (
                <button
                  type="button"
                  onClick={() => setActiveTab("collections")}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                    activeTab === "collections"
                      ? "border-pink-500 text-pink-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Collections ({collections.length})</span>
                </button>
              )}

              {canViewLikes && (
                <button
                  type="button"
                  onClick={() => setActiveTab("likes")}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                    activeTab === "likes"
                      ? "border-pink-500 text-pink-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>Likes ({favorites.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab("about")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === "about"
                    ? "border-pink-500 text-pink-400"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>About & Links</span>
              </button>
            </div>
          )}
        </div>

        {/* Protected Profile Lock Screen */}
        {isProtected ? (
          <div className="p-12 sm:p-16 text-center rounded-3xl bg-[#141622] border border-white/10 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/20 text-pink-400 mx-auto flex items-center justify-center">
              <Lock className="w-8 h-8 opacity-80" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg font-black text-white">These posts are protected</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Only approved followers can view @{profileUser.username}&apos;s creations, collections, and
                liked works. Follow this account to request access.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleToggleFollow}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 transition-all"
              >
                {isRequested ? "Cancel request" : "Request to follow"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab 1: Posts (With Blank State if 0 posts) */}
            {activeTab === "posts" && (
              <div>
                {posts.length === 0 ? (
                  <div className="p-12 sm:p-16 text-center rounded-3xl bg-[#141622] border border-white/10 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/20 text-pink-400 mx-auto flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 opacity-75" />
                    </div>
                    <div className="space-y-1.5 max-w-sm mx-auto">
                      <h3 className="text-base font-bold text-white">No creations published yet</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {isOwnProfile
                          ? "You haven't uploaded any artworks or videos yet. Share your high-res creations with the Booru community!"
                          : `@${profileUser.username} hasn't published any artworks or videos yet. Check back soon for new uploads!`}
                      </p>
                    </div>
                    {isOwnProfile && (
                      <div className="pt-2">
                        <Link
                          href="/#upload"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 transition-all"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Upload Your First Work</span>
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {posts.map((post) => {
                      const isFav = favoritePostIds.includes(post.id);
                      return (
                        <Link
                          key={post.id}
                          href={`/post/${post.id}`}
                          className="group relative rounded-2xl overflow-hidden bg-[#151722] border border-white/10 hover:border-pink-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/10 flex flex-col justify-between"
                        >
                          <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-900">
                            <img
                              src={post.thumbnailUrl || post.mediaUrl}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                  post.rating === "explicit"
                                    ? "bg-rose-500/80 text-white border-rose-400"
                                    : post.rating === "questionable"
                                    ? "bg-amber-500/80 text-white border-amber-400"
                                    : "bg-black/60 text-emerald-300 border-white/10"
                                }`}
                              >
                                {post.rating?.toUpperCase() || "SFW"}
                              </span>
                              {post.mediaType === "video" && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/80 text-white">
                                  VIDEO
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorite(post.id, e)}
                              className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all ${
                                isFav
                                  ? "bg-pink-600 text-white"
                                  : "bg-black/40 text-white hover:bg-pink-600"
                              }`}
                            >
                              <Heart className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>

                          <div className="p-3 space-y-1">
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-pink-300 transition-colors">
                              {post.title}
                            </h4>
                            <div className="flex items-center justify-between text-[10px] text-zinc-400">
                              <span>{post.category}</span>
                              <span>{post.views} views</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Albums */}
            {activeTab === "albums" && (
              <div>
                {albums.length === 0 ? (
                  <div className="p-12 text-center rounded-3xl bg-[#141622] border border-white/10 space-y-3">
                    <FolderHeart className="w-10 h-10 text-pink-400/50 mx-auto" />
                    <h3 className="text-sm font-bold text-white">No albums created yet</h3>
                    <p className="text-xs text-zinc-400">
                      {isOwnProfile
                        ? "Organize your creations into thematic sets, gravure photoshoots, or comic series."
                        : `@${profileUser.username} hasn't compiled any public albums yet.`}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {albums.map((album) => (
                      <div
                        key={album.id}
                        className="group rounded-2xl overflow-hidden border border-white/10 bg-[#151722] hover:border-pink-500/50 transition-all cursor-pointer"
                      >
                        <div className="relative h-44 overflow-hidden bg-zinc-900">
                          <img
                            src={album.coverUrl}
                            alt={album.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/75 text-pink-300 border border-pink-500/30">
                            {album._count?.posts ?? 0} files
                          </span>
                        </div>
                        <div className="p-4 space-y-1">
                          <h4 className="text-sm font-bold text-white truncate">{album.title}</h4>
                          <p className="text-xs text-zinc-400 line-clamp-2">{album.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Collections */}
            {activeTab === "collections" && canViewCollections && (
              <div>
                {collections.length === 0 ? (
                  <div className="p-12 text-center rounded-3xl bg-[#141622] border border-white/10 space-y-3">
                    <Bookmark className="w-10 h-10 text-purple-400/50 mx-auto" />
                    <h3 className="text-sm font-bold text-white">No public collections yet</h3>
                    <p className="text-xs text-zinc-400">
                      Curated archives and theme-based image vaults.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {collections.map((col) => (
                      <div
                        key={col.id}
                        className="group rounded-2xl overflow-hidden border border-white/10 bg-[#151722] hover:border-purple-500/50 transition-all p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
                            {col.badgeText || "Collection"}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {col._count?.items ?? col.items?.length ?? 0} items
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                            {col.title}
                          </h4>
                          {col.description && (
                            <p className="text-xs text-zinc-400 line-clamp-2 pt-0.5">
                              {col.description}
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 rounded-xl overflow-hidden bg-black/40 p-1">
                          {col.items?.slice(0, 4).map((it, idx) => (
                            <div key={idx} className="aspect-square bg-zinc-900 rounded-lg overflow-hidden">
                              {it.post && (
                                <img
                                  src={it.post.thumbnailUrl || it.post.mediaUrl}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Likes / Favorites */}
            {activeTab === "likes" && canViewLikes && (
              <div>
                {favorites.length === 0 ? (
                  <div className="p-12 text-center rounded-3xl bg-[#141622] border border-white/10 space-y-3">
                    <Heart className="w-10 h-10 text-pink-400/50 mx-auto" />
                    <h3 className="text-sm font-bold text-white">No favorited creations yet</h3>
                    <p className="text-xs text-zinc-400">
                      Creations @{profileUser.username} has favorited on Cuttiebooru.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {favorites.map((post) => (
                      <Link
                        key={post.id}
                        href={`/post/${post.id}`}
                        className="group relative rounded-2xl overflow-hidden bg-[#151722] border border-white/10 hover:border-pink-500/50 transition-all flex flex-col justify-between"
                      >
                        <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-900">
                          <img
                            src={post.thumbnailUrl || post.mediaUrl}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-3 space-y-1">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-pink-300">
                            {post.title}
                          </h4>
                          <p className="text-[10px] text-zinc-400">by @{post.creator?.username}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: About & Socials */}
            {activeTab === "about" && (
              <div className="p-6 sm:p-8 rounded-3xl bg-[#141622] border border-white/10 space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-pink-400">
                    Creator Profile Information
                  </h3>
                  <p className="text-xs text-zinc-400 pt-1">
                    Verified Cuttiebooru creator metadata and external portfolio links.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                    <span className="text-zinc-500 uppercase text-[10px] font-bold">Display Name</span>
                    <p className="text-white font-semibold">{profileUser.displayName}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                    <span className="text-zinc-500 uppercase text-[10px] font-bold">Username</span>
                    <p className="text-pink-400 font-mono">@{profileUser.username}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                    <span className="text-zinc-500 uppercase text-[10px] font-bold">Primary Specialty</span>
                    <p className="text-white font-semibold">{profileUser.niche || "Cute & Anime Art"}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                    <span className="text-zinc-500 uppercase text-[10px] font-bold">Platform Role</span>
                    <p className="text-white font-semibold capitalize">{profileUser.role}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-pink-400">About me</h4>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">{profileUser.bio || "No introduction added yet."}</p>
                </div>
                {Object.keys(socials).length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Connected Social Profiles
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(socials).map(([net, url]) => (
                        <a
                          key={net}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="max-w-full min-w-0 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-pink-300 hover:text-white flex items-center gap-1.5 transition-colors"
                        >
                          <span className="break-all">{net}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 text-zinc-500" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <FollowListModal
        isOpen={followTab !== null}
        targetUser={profileUser}
        initialTab={followTab || "followers"}
        allFollows={allFollows}
        currentUserFollowingIds={userFollowingIds}
        currentUserId={currentUser?.id || ""}
        lightTheme={false}
        onClose={() => setFollowTab(null)}
        onSelectUser={(user) => { setFollowTab(null); router.push(`/user/${encodeURIComponent(user.username)}`); }}
        onStartMessage={(user) => {
          setFollowTab(null);
          router.push(currentUser ? `/messages?user=${encodeURIComponent(user.username)}` : "/signin");
        }}
        onToggleFollow={async (targetUserId) => {
          if (!currentUser) { router.push("/signin"); return; }
          try {
            const response = await fetch("/api/interactions", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "follow", targetUserId }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Could not update follow status");
            showToast(data.requested ? "Follow request sent" : data.following ? "Followed user" : "Unfollowed user");
            await loadUserData();
          } catch (error) {
            console.error("Could not update follow status:", error);
            showToast(error instanceof Error ? error.message : "Could not update follow status");
          }
        }}
      />
    </SiteShell>
  );
}
