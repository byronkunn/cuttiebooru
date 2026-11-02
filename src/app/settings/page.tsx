"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User as UserIcon,
  Shield,
  CheckCircle2,
  Globe,
  Lock,
  ExternalLink,
  LogOut,
  Save,
  UserCheck,
  ChevronRight,
  Bell,
  Eye,
  MessageSquare,
  Heart,
  Bookmark,
  ArrowRight,
} from "lucide-react";
import { User } from "@/types/cuttiebooru";
import { SiteShell } from "@/components/SiteShell";
import { FollowRequests } from "@/components/FollowRequests";
import { isProfileLinkAllowed, parseProfileLinks, validateProfileLinks } from "@/lib/profile-links";

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    "account" | "privacy" | "notifications" | "creator"
  >("account");

  // Form Fields - Account & Profile
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [headerUrl, setHeaderUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [niche, setNiche] = useState("Cute Art");
  const [spotlightQuote, setSpotlightQuote] = useState("");

  // Privacy & Safety (Twitter-style)
  const [privateProfile, setPrivateProfile] = useState(false);
  const [showCollections, setShowCollections] = useState(true);
  const [showFavorites, setShowFavorites] = useState(true);
  const [allowDMs, setAllowDMs] = useState<"everyone" | "followers" | "none">("everyone");
  const [blurExplicit, setBlurExplicit] = useState(true);

  // Notifications
  const [notifyFollows, setNotifyFollows] = useState(true);
  const [notifyFavorites, setNotifyFavorites] = useState(true);

  // Social Links
  const [profileLinks, setProfileLinks] = useState<{ label: string; url: string }[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/account", { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.push("/signin");
          return;
        }
        const u: User = d.user;
        setCurrentUser(u);
        setDisplayName(u.displayName || "");
        setBio(u.bio || "");
        setAvatarUrl(u.avatarUrl || "");
        setHeaderUrl(u.headerUrl || "");
        setWebsiteUrl(u.websiteUrl || "");
        setNiche(u.niche || "Cute Art");
        setSpotlightQuote(u.spotlightQuote || "");
        setNotifyFollows(u.notifyFollows ?? true);
        setNotifyFavorites(u.notifyFavorites ?? true);
        setPrivateProfile(u.privateProfile ?? false);
        setShowCollections(u.showCollections ?? true);
        setShowFavorites(u.showFavorites ?? true);
        if (u.allowDMs === "followers" || u.allowDMs === "none") {
          setAllowDMs(u.allowDMs);
        } else {
          setAllowDMs("everyone");
        }

        setProfileLinks(Object.entries(parseProfileLinks(u.socialLinks)).map(([label, url]) => ({ label, url })));
      })
      .catch(() => {
        if (!controller.signal.aborted) router.push("/signin");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    // Load local display preferences
    try {
      const storedBlur = localStorage.getItem("cuttiebooru_blur_explicit");
      if (storedBlur !== null) {
        setBlurExplicit(storedBlur === "true");
      }
    } catch {
      // ignore
    }

    return () => controller.abort();
  }, [router]);

  const handleBlurToggle = (val: boolean) => {
    setBlurExplicit(val);
    try {
      localStorage.setItem("cuttiebooru_blur_explicit", String(val));
    } catch {
      // ignore
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const labels = profileLinks.map((link) => link.label.trim());
      if (new Set(labels.map((label) => label.toLowerCase())).size !== labels.length) throw new Error("Each profile link needs a different label.");
      const links = Object.fromEntries(profileLinks.map((link) => [link.label.trim(), link.url.trim()]));
      const linkError = validateProfileLinks(links);
      if (linkError) throw new Error(linkError);
      if (websiteUrl.trim() && !isProfileLinkAllowed(websiteUrl.trim())) throw new Error("Website must be a valid HTTP(S) URL.");
      const socialLinks = JSON.stringify(links);

      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          bio,
          avatarUrl,
          headerUrl,
          websiteUrl: websiteUrl.trim(),
          niche,
          spotlightQuote,
          notifyFollows,
          notifyFavorites,
          privateProfile,
          showCollections,
          showFavorites,
          allowDMs,
          socialLinks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update settings");

      setCurrentUser(data.user);
      setStatusMessage("Your settings have been saved successfully.");
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await fetch("/api/account", { method: "DELETE" });
    router.push("/signin");
  };

  if (loading) {
    return (
      <SiteShell activeNav="settings">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </SiteShell>
    );
  }

  if (!currentUser) return null;

  return (
    <SiteShell activeNav="settings" currentUser={currentUser}>
      <div className="max-w-6xl mx-auto py-6 px-3 sm:px-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Settings</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage your Cuttiebooru account, privacy, and preferences
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/user/${currentUser.username}`}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">View User Page</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/20 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Main Settings Grid (Twitter / X 2-Column Layout) */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Navigation Tabs */}
          <div className="md:col-span-4 lg:col-span-4 space-y-1 bg-[#13151f] p-2 rounded-2xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab("account")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left font-bold text-xs transition-colors ${
                activeTab === "account"
                  ? "bg-pink-500 text-white shadow-md shadow-pink-500/25"
                  : "text-zinc-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <UserIcon className="w-4 h-4" />
                <span>Your account</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-60" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("privacy")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left font-bold text-xs transition-colors ${
                activeTab === "privacy"
                  ? "bg-pink-500 text-white shadow-md shadow-pink-500/25"
                  : "text-zinc-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4" />
                <span>Privacy and safety</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-60" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("notifications")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left font-bold text-xs transition-colors ${
                activeTab === "notifications"
                  ? "bg-pink-500 text-white shadow-md shadow-pink-500/25"
                  : "text-zinc-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-60" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("creator")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left font-bold text-xs transition-colors ${
                activeTab === "creator"
                  ? "bg-pink-500 text-white shadow-md shadow-pink-500/25"
                  : "text-zinc-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4" />
                <span>Creator & Links</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-60" />
            </button>

            {/* Quick Action Links inside Left Column */}
            <div className="pt-3 mt-3 border-t border-white/[0.08] space-y-1">
              <Link
                href="/signin"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                  <span>Account Switcher</span>
                </div>
                <span className="text-[10px] text-zinc-400">Sign in page</span>
              </Link>

              {currentUser.role === "admin" && (
                <Link
                  href="/admin"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-rose-400" />
                    <span>Admin Dashboard</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
                </Link>
              )}
            </div>
          </div>

          {/* Right Column: Settings Content Panels */}
          <div className="md:col-span-8 lg:col-span-8 bg-[#13151f] rounded-3xl border border-white/[0.08] p-5 sm:p-7 space-y-6">
            {/* 1. YOUR ACCOUNT */}
            {activeTab === "account" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white">Your account</h2>
                  <p className="text-xs text-zinc-400">
                    Update your public identity, display name, avatar, and banner
                  </p>
                </div>

                {/* Live Preview Card */}
                <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-black/40">
                  <div className="relative h-28 sm:h-36 bg-gradient-to-r from-pink-900/40 to-purple-900/40">
                    {headerUrl ? (
                      <img src={headerUrl} alt="Header Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-pink-900/30 via-purple-900/30 to-indigo-900/30 flex items-center justify-center text-xs text-zinc-400">
                        No banner image set
                      </div>
                    )}
                    <div className="absolute -bottom-6 left-4 flex items-end gap-3">
                      <img
                        src={avatarUrl || "/sfw/avatar/0738955ca929985f39921b4876053170.png"}
                        alt="Avatar Preview"
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-[#13151f] shadow-2xl bg-black"
                      />
                    </div>
                  </div>
                  <div className="pt-8 pb-4 px-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{displayName || currentUser.username}</p>
                      <p className="text-xs text-pink-400">@{currentUser.username}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      {niche}
                    </span>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4 pt-2">
                  {/* Display Name with character count */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-semibold text-zinc-300">Display Name</label>
                      <span className="text-[11px] text-zinc-400">{displayName.length}/50</span>
                    </div>
                    <input
                      type="text"
                      maxLength={50}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  {/* Bio with character count */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <label htmlFor="about-me" className="font-semibold text-zinc-300">About me</label>
                      <span className="text-[11px] text-zinc-400">{bio.length}/2000</span>
                    </div>
                    <textarea
                      id="about-me"
                      rows={6}
                      maxLength={2000}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell the community about your booru taste, creative works, or favorites..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-base sm:text-sm text-white focus:outline-none focus:border-pink-500 resize-y"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-300">Custom Avatar URL</label>
                      <input
                        type="text"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="/sfw/avatar/... or https://..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-300">Custom Banner URL</label>
                      <input
                        type="text"
                        value={headerUrl}
                        onChange={(e) => setHeaderUrl(e.target.value)}
                        placeholder="/sfw/banner-image/... or https://..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-300">Creative Niche / Specialty</label>
                      <select
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-pink-500"
                      >
                        <option value="Cute Art">Cute & Fantasy Art</option>
                        <option value="Anime & Manga">Anime & Manga</option>
                        <option value="Ecchi & Explicit">Ecchi & Explicit Archive</option>
                        <option value="Cosplay">Cosplay & Gravure</option>
                        <option value="Indie 3D">Indie 3D & Animation</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="profile-website" className="text-xs font-semibold text-zinc-300">Website or Portfolio</label>
                      <input
                        id="profile-website"
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PRIVACY AND SAFETY (Twitter-style toggles and permissions) */}
            {activeTab === "privacy" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white">Privacy and safety</h2>
                  <p className="text-xs text-zinc-400">
                    Control who sees your user page, your collections, your likes, and who can message you
                  </p>
                </div>

                <FollowRequests />

                <div className="divide-y divide-white/[0.08] text-xs">
                  {/* Protect Profile Toggle */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="space-y-1 max-w-lg">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-pink-400" />
                        <span className="font-bold text-white text-sm">Protect your user page</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Only you and followers you approve can view your creations and hosted media. Enabling protection sends existing followers back to pending approval. Previously downloaded copies cannot be recalled.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={privateProfile}
                      onClick={() => setPrivateProfile(!privateProfile)}
                      className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${
                        privateProfile ? "bg-pink-500" : "bg-zinc-700"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          privateProfile ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Show Collections Toggle */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="space-y-1 max-w-lg">
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-3.5 h-3.5 text-purple-400" />
                        <span className="font-bold text-white text-sm">Show Collections on your profile</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Allow other users and visitors to see your curated Booru collections and vaults on your public page. Turn off to keep collections private to you.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showCollections}
                      onClick={() => setShowCollections(!showCollections)}
                      className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${
                        showCollections ? "bg-pink-500" : "bg-zinc-700"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          showCollections ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Show Likes / Favorites Toggle */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="space-y-1 max-w-lg">
                      <div className="flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5 text-rose-400" />
                        <span className="font-bold text-white text-sm">Show Likes tab on your profile</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Allow people to see what images and videos you have liked. When turned off, the Likes tab is hidden from all visitors.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showFavorites}
                      onClick={() => setShowFavorites(!showFavorites)}
                      className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${
                        showFavorites ? "bg-pink-500" : "bg-zinc-700"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          showFavorites ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Direct Messages Permission (Twitter style) */}
                  <div className="py-4 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                        <span className="font-bold text-white text-sm">Direct Messages</span>
                      </div>
                      <p className="text-zinc-400 text-xs">
                        Choose who can send you direct chat messages on Cuttiebooru.
                      </p>
                    </div>

                    <div className="space-y-2 pt-1 pl-1">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="allowDMs"
                          checked={allowDMs === "everyone"}
                          onChange={() => setAllowDMs("everyone")}
                          className="w-4 h-4 accent-pink-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-zinc-200 group-hover:text-white">Allow messages from everyone</p>
                          <p className="text-[11px] text-zinc-400">Any signed-in creator can send you a message</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="allowDMs"
                          checked={allowDMs === "followers"}
                          onChange={() => setAllowDMs("followers")}
                          className="w-4 h-4 accent-pink-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-zinc-200 group-hover:text-white">Allow messages only from people you follow</p>
                          <p className="text-[11px] text-zinc-400">Only trusted followers and creators you follow</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="allowDMs"
                          checked={allowDMs === "none"}
                          onChange={() => setAllowDMs("none")}
                          className="w-4 h-4 accent-pink-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-zinc-200 group-hover:text-white">Turn off direct messages</p>
                          <p className="text-[11px] text-zinc-400">No one can start a new direct message conversation with you</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Explicit 18+ Content Blur Filter */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="space-y-1 max-w-lg">
                      <div className="flex items-center gap-2">
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-bold text-white text-sm">Blur sensitive / explicit (18+) media</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Makes your browsing experience comfortable by applying a soft blur filter over explicit content until hovered or clicked.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={blurExplicit}
                      onClick={() => handleBlurToggle(!blurExplicit)}
                      className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${
                        blurExplicit ? "bg-pink-500" : "bg-zinc-700"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          blurExplicit ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white">Notifications</h2>
                  <p className="text-xs text-zinc-400">
                    Select the kinds of notifications you want to receive about your activities
                  </p>
                </div>

                <div className="divide-y divide-white/[0.08] text-xs">
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="space-y-1 max-w-lg">
                      <span className="font-bold text-white text-sm">New Followers</span>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Receive an in-app alert when someone starts following your profile or series.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifyFollows}
                      onClick={() => setNotifyFollows(!notifyFollows)}
                      className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${
                        notifyFollows ? "bg-pink-500" : "bg-zinc-700"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          notifyFollows ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="space-y-1 max-w-lg">
                      <span className="font-bold text-white text-sm">Favorites and Likes</span>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Receive an in-app alert when another user adds your image, video, or comic to their favorites.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifyFavorites}
                      onClick={() => setNotifyFavorites(!notifyFavorites)}
                      className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${
                        notifyFavorites ? "bg-pink-500" : "bg-zinc-700"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          notifyFavorites ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. CREATOR & LINKS */}
            {activeTab === "creator" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white">Creator & Links</h2>
                  <p className="text-xs text-zinc-400">
                    Connect your external platforms so fans can support and follow your work
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-zinc-400">Add up to 10 labeled links to your portfolio, socials, shop or other websites.</p>
                  {profileLinks.map((link, index) => (
                    <div key={index} className="space-y-2 p-3 rounded-xl border border-white/10">
                      <label className="block text-xs text-zinc-300">
                        Link {index + 1} label
                        <input type="text" maxLength={80} value={link.label} placeholder="e.g. Portfolio"
                          onChange={(event) => setProfileLinks((previous) => previous.map((item, i) => i === index ? { ...item, label: event.target.value } : item))}
                          className="mt-1 w-full min-w-0 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-base sm:text-sm" />
                      </label>
                      <label className="block text-xs text-zinc-300">
                        Link {index + 1} URL
                        <input type="url" maxLength={2048} value={link.url} placeholder="https://example.com"
                          onChange={(event) => setProfileLinks((previous) => previous.map((item, i) => i === index ? { ...item, url: event.target.value } : item))}
                          className="mt-1 w-full min-w-0 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-base sm:text-sm" />
                      </label>
                      <button type="button" aria-label={`Remove link ${index + 1}`} onClick={() => setProfileLinks((previous) => previous.filter((_, i) => i !== index))}
                        className="text-xs text-rose-400 px-2 py-1">Remove link</button>
                    </div>
                  ))}
                  <button type="button" disabled={profileLinks.length >= 10} onClick={() => setProfileLinks((previous) => [...previous, { label: "", url: "" }])}
                    className="px-4 py-2 rounded-xl bg-pink-500/20 text-pink-300 text-sm font-bold disabled:opacity-40">Add website link</button>

                  <div className="space-y-1 pt-2">
                    <label className="text-xs font-semibold text-zinc-300">Spotlight Quote</label>
                    <input
                      type="text"
                      maxLength={120}
                      value={spotlightQuote}
                      onChange={(e) => setSpotlightQuote(e.target.value)}
                      placeholder="e.g. Drawing cute anime & manga illustration every week!"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-pink-500"
                    />
                    <p className="text-[11px] text-zinc-400">
                      Highlighted in italics on your public profile header.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Save Action Bar */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                {saving ? "Saving changes..." : "Unsaved changes will be applied on save"}
              </span>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-pink-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
