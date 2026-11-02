"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Camera, Trash2 } from "lucide-react";
import { User } from "@/types/cuttiebooru";

interface TwitterEditProfileModalProps {
  isOpen: boolean;
  user: User | null;
  lightTheme: boolean;
  onClose: () => void;
  onSaveProfile: (
    payload: Partial<User> & { userId: string }
  ) => Promise<void>;
}

export function TwitterEditProfileModal({
  isOpen,
  user,
  lightTheme,
  onClose,
  onSaveProfile,
}: TwitterEditProfileModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [headerUrl, setHeaderUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [niche, setNiche] = useState("Cute Character Art");
  const [spotlightQuote, setSpotlightQuote] = useState("");
  const [saving, setSaving] = useState(false);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setAvatarUrl(user.avatarUrl || "");
      setHeaderUrl(user.headerUrl || "");
      setWebsiteUrl(user.websiteUrl || "");
      setNiche(user.niche || "Cute Character Art");
      setSpotlightQuote(user.spotlightQuote || "");
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "banner" | "avatar"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", target === "banner" ? "banner-image" : "avatar");
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        if (target === "banner") setHeaderUrl(data.url);
        else setAvatarUrl(data.url);
        return;
      }
    } catch {
      // Fallback to data URL if offline
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        if (target === "banner") setHeaderUrl(reader.result);
        else setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSaveProfile({
      userId: user.id,
      displayName: displayName.trim() || user.displayName,
      bio,
      avatarUrl,
      headerUrl,
      websiteUrl,
      niche,
      spotlightQuote,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div
        className={`w-full max-w-xl rounded-3xl overflow-hidden border shadow-2xl my-auto max-h-[92dvh] flex flex-col ${
          lightTheme
            ? "bg-white border-purple-200 text-zinc-900"
            : "bg-[#151722] border-white/15 text-zinc-100"
        }`}
      >
        {/* Top Twitter-style Sticky Header */}
        <div
          className={`px-4 py-3 flex items-center justify-between border-b shrink-0 ${
            lightTheme
              ? "bg-white/95 border-purple-100"
              : "bg-[#151722]/95 border-white/10"
          }`}
        >
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-extrabold">Edit profile</h2>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white text-sm font-bold shadow-lg shadow-pink-500/25 disabled:opacity-50 transition-all"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 pb-6">
          {/* Banner Header with Centered Camera Upload & Remove Overlay (Twitter Behavior) */}
          <div className="relative h-44 sm:h-52 w-full bg-gradient-to-r from-pink-600/40 via-purple-700/40 to-indigo-900/50 overflow-hidden group">
            {headerUrl && (
              <img
                src={headerUrl}
                alt="Profile banner"
                className="w-full h-full object-cover brightness-75 transition-transform duration-300 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-black/35 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                title="Add banner photo"
                className="p-3 rounded-full bg-black/65 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-105 shadow-lg"
              >
                <Camera className="w-5 h-5" />
              </button>
              {headerUrl && (
                <button
                  type="button"
                  onClick={() => setHeaderUrl("")}
                  title="Remove banner photo"
                  className="p-3 rounded-full bg-black/65 hover:bg-rose-500/80 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-105 shadow-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "banner")}
                className="hidden"
              />
            </div>
          </div>

          {/* Overlapping Avatar with Centered Camera Overlay Button + Preset Toggle */}
          <div className="px-5 flex items-end justify-between -mt-14 relative z-10 mb-4">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-4 ring-[#151722] bg-zinc-900 group shadow-2xl">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover brightness-75 group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  title="Change avatar photo"
                  className="p-2.5 rounded-full bg-black/65 hover:bg-pink-500 text-white backdrop-blur-md border border-white/25 transition-all hover:scale-110 shadow-lg"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "avatar")}
                  className="hidden"
                />
              </div>
            </div>

          </div>

          {/* Twitter-style Input Fields */}
          <form onSubmit={handleSave} className="px-5 space-y-4">
            <div className="p-3 rounded-2xl border border-white/15 bg-black/25 focus-within:border-pink-500 transition-colors">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                <label className="font-semibold">Name</label>
                <span>{displayName.length} / 50</span>
              </div>
              <input
                type="text"
                maxLength={50}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-transparent text-sm font-medium focus:outline-none"
              />
            </div>

            <div className="p-3 rounded-2xl border border-white/15 bg-black/25 focus-within:border-pink-500 transition-colors">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                <label className="font-semibold">Bio</label>
                <span>{bio.length} / 160</span>
              </div>
              <textarea
                rows={3}
                maxLength={160}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-transparent text-sm focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl border border-white/15 bg-black/25 focus-within:border-pink-500 transition-colors">
                <label className="text-[11px] font-semibold text-zinc-400 block mb-0.5">
                  Primary Niche
                </label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none text-pink-300 font-medium"
                >
                  <option value="Cute Character Art" className="bg-zinc-900">
                    Cute Character Art
                  </option>
                  <option value="Cosplay" className="bg-zinc-900">
                    Cosplay
                  </option>
                  <option value="Photography" className="bg-zinc-900">
                    Photography
                  </option>
                  <option value="Indie" className="bg-zinc-900">
                    Indie Creators & Sculpt
                  </option>
                </select>
              </div>

              <div className="p-3 rounded-2xl border border-white/15 bg-black/25 focus-within:border-pink-500 transition-colors">
                <label className="text-[11px] font-semibold text-zinc-400 block mb-0.5">
                  Website
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl border border-white/15 bg-black/25 focus-within:border-pink-500 transition-colors">
              <label className="text-[11px] font-semibold text-zinc-400 block mb-0.5">
                Creator Spotlight Quote
              </label>
              <input
                type="text"
                value={spotlightQuote}
                onChange={(e) => setSpotlightQuote(e.target.value)}
                placeholder="Share a short quote about your craft..."
                className="w-full bg-transparent text-sm focus:outline-none"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
