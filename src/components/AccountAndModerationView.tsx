"use client";

import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  ShieldAlert,
  CheckCircle2,
  Camera,
  LogIn,
  ExternalLink,
  Bell,
  Lock,
} from "lucide-react";
import { User } from "@/types/cuttiebooru";

interface AccountAndModerationViewProps {
  currentUser: User | null;
  lightTheme: boolean;
  onUpdateAccount: (
    payload: Partial<User> & { userId: string }
  ) => Promise<void>;
  onOpenTwitterEditModal?: () => void;
}

export function AccountAndModerationView({
  currentUser,
  lightTheme,
  onUpdateAccount,
  onOpenTwitterEditModal,
}: AccountAndModerationViewProps) {
  const [displayName, setDisplayName] = useState(
    currentUser?.displayName || ""
  );
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || "");
  const [headerUrl, setHeaderUrl] = useState(currentUser?.headerUrl || "");
  const [websiteUrl, setWebsiteUrl] = useState(currentUser?.websiteUrl || "");
  const [niche, setNiche] = useState(currentUser?.niche || "Cute Art");
  const [spotlightQuote, setSpotlightQuote] = useState(
    currentUser?.spotlightQuote || ""
  );
  const [notifyFollows, setNotifyFollows] = useState(
    currentUser?.notifyFollows ?? true
  );
  const [notifyFavorites, setNotifyFavorites] = useState(
    currentUser?.notifyFavorites ?? true
  );
  const [privateProfile, setPrivateProfile] = useState(
    currentUser?.privateProfile ?? false
  );
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName);
      setBio(currentUser.bio);
      setAvatarUrl(currentUser.avatarUrl);
      setHeaderUrl(currentUser.headerUrl);
      setWebsiteUrl(currentUser.websiteUrl);
      setNiche(currentUser.niche);
      setSpotlightQuote(currentUser.spotlightQuote);
      setNotifyFollows(currentUser.notifyFollows);
      setNotifyFavorites(currentUser.notifyFavorites);
      setPrivateProfile(currentUser.privateProfile);
    }
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    await onUpdateAccount({
      userId: currentUser.id,
      displayName,
      bio,
      avatarUrl,
      headerUrl,
      websiteUrl,
      niche,
      spotlightQuote,
      notifyFollows,
      notifyFavorites,
      privateProfile,
    });
    setStatusMessage("Profile & privacy settings saved!");
    setTimeout(() => setStatusMessage(""), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Banner Links to /signin and /admin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="/signin"
          className={`p-5 rounded-3xl border flex items-center justify-between transition-all hover:border-pink-500/50 ${
            lightTheme
              ? "bg-white border-purple-200 text-zinc-900"
              : "bg-[#161822] border-white/[0.08] text-zinc-100"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                Sign In & Account Switcher Page
              </h3>
              <p className="text-xs text-zinc-400">
                Switch active account or register a new creator profile
              </p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-pink-400 shrink-0" />
        </a>

        <a
          href="/admin"
          className={`p-5 rounded-3xl border flex items-center justify-between transition-all hover:border-rose-500/50 ${
            lightTheme
              ? "bg-white border-purple-200 text-zinc-900"
              : "bg-[#161822] border-white/[0.08] text-zinc-100"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                Dedicated Booru Admin Control Center
              </h3>
              <p className="text-xs text-zinc-400">
                Analytics, Paginated Posts/Users/Tags, & Moderation Queue
              </p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-rose-400 shrink-0" />
        </a>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {statusMessage}
        </div>
      )}

      {/* Profile Settings Card */}
      {currentUser && (
        <form
          onSubmit={handleSaveProfile}
          className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
            lightTheme
              ? "bg-white border-purple-200 text-zinc-900"
              : "bg-[#161822] border-white/[0.08] text-zinc-100"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3.5">
              <img
                src={avatarUrl || currentUser.avatarUrl}
                alt={displayName}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-pink-500/50"
              />
              <div>
                <h2 className="text-lg font-extrabold flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-pink-400" />
                  Profile, Avatar & Privacy Settings
                </h2>
                <p className="text-xs text-zinc-400">
                  Signed in as <strong>@{currentUser.username}</strong> • Role:{" "}
                  <span className="uppercase text-pink-400 font-bold">
                    {currentUser.role || "creator"}
                  </span>
                </p>
              </div>
            </div>

            {onOpenTwitterEditModal && (
              <button
                type="button"
                onClick={onOpenTwitterEditModal}
                className="px-4 py-2 rounded-full bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/40 text-xs font-bold text-pink-300 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Camera className="w-3.5 h-3.5" />
                Change Avatar & Banner (./sfw)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">
                Primary Niche
              </label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white"
              >
                <option value="Cute Art">Cute & Fantasy Art</option>
                <option value="Cosplay">Cosplay & Gravure</option>
                <option value="Photography">Photography & Boudoir</option>
                <option value="Indie">Indie 3D & Animation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">
                Avatar Path (./sfw/avatar/...)
              </label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">
                Banner Path (./sfw/banner-image/...)
              </label>
              <input
                type="text"
                value={headerUrl}
                onChange={(e) => setHeaderUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400">Bio</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs sm:text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">
                Personal Website / Social Link
              </label>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">
                Creator Spotlight Quote
              </label>
              <input
                type="text"
                value={spotlightQuote}
                onChange={(e) => setSpotlightQuote(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
              />
            </div>
          </div>

          {/* Notification & Privacy Toggles */}
          <div className="pt-2 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-pink-400" />
              Notifications & Privacy Preferences
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyFollows}
                  onChange={(e) => setNotifyFollows(e.target.checked)}
                  className="rounded accent-pink-500"
                />
                Notify on new followers
              </label>
              <label className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyFavorites}
                  onChange={(e) => setNotifyFavorites(e.target.checked)}
                  className="rounded accent-pink-500"
                />
                Notify on post favorites
              </label>
              <label className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs cursor-pointer">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="checkbox"
                  checked={privateProfile}
                  onChange={(e) => setPrivateProfile(e.target.checked)}
                  className="rounded accent-pink-500"
                />
                Private Saved Vault
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-pink-500/20"
          >
            Save Account & Profile Settings
          </button>
        </form>
      )}
    </div>
  );
}
