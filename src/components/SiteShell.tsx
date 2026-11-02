"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Compass,
  Users,
  Hash,
  Bookmark,
  Upload as UploadIcon,
  User as UserIcon,
  Search,
  Sparkles,
  ShieldAlert,
  LogIn,
  MessageCircle,
  Bell,
  BookOpen,
  Settings,
  X,
  Menu,
  LogOut,
  ChevronRight,
  Shield,
  BadgeCheck,
  Palette,
} from "lucide-react";
import { User } from "@/types/cuttiebooru";
import { parseSearchInput } from "@/lib/search";
import {
  AppearanceModal,
  applyThemeToDocument,
  getStoredTheme,
} from "./AppearanceModal";
import { QuickUserSwitcher } from "./QuickUserSwitcher";

interface SiteShellProps {
  children: React.ReactNode;
  activeNav?: string;
  currentUser?: User | null;
}

export function SiteShell({
  children,
  activeNav = "",
  currentUser: initialUser = null,
}: SiteShellProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);
  const [searchVal, setSearchVal] = useState("");
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);

  // Responsive Drawer & Avatar Modal State
  const [railOpen, setRailOpen] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("dark");
  const [appearanceError, setAppearanceError] = useState("");

  useEffect(() => {
    const saved = getStoredTheme();
    setCurrentTheme(saved);
    try {
      applyThemeToDocument(saved);
    } catch (error) {
      setAppearanceError(error instanceof Error ? error.message : "Unable to restore appearance.");
    }

    if (!initialUser) {
      fetch("/api/account")
        .then((r) => r.json())
        .then((d) => {
          if (d.user) setCurrentUser(d.user);
        })
        .catch(() => {});
    } else {
      setCurrentUser(initialUser);
    }

    fetch("/api/bootstrap")
      .then((r) => r.json())
      .then((d) => {
        if (d.notifications) {
          setUnreadNotif(d.notifications.filter((n: { isRead: boolean }) => !n.isRead).length);
        }
        if (d.messages) {
          setUnreadMsg(d.messages.filter((m: { isRead: boolean }) => !m.isRead).length);
        }
      })
      .catch(() => {});
  }, [initialUser]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseSearchInput(searchVal);
    const params = new URLSearchParams();
    if (parsed.query) params.set("q", parsed.query);
    if (parsed.includedTags.length) params.set("tags", parsed.includedTags.join(","));
    if (parsed.excludedTags.length) params.set("excludeTags", parsed.excludedTags.join(","));
    router.push(params.size ? `/?${params}` : "/");
  };

  const handleSignOut = async () => {
    await fetch("/api/account", { method: "DELETE" });
    setShowAvatarModal(false);
    router.push("/signin");
  };

  return (
    <div className="min-h-screen bg-[#0f1016] text-zinc-100 flex flex-col font-sans">
      {appearanceError && <p role="alert" className="p-3 text-sm text-amber-500">{appearanceError}</p>}
      {/* Sticky Top Header (Cleaned: No notifications, messages, or upload buttons in top bar) */}
      <header className="sticky top-0 z-40 bg-[#12141d]/90 backdrop-blur-xl border-b border-white/[0.07]">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-2 md:min-h-16 flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
          {/* Left: Mobile Rail Drawer Button + Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Open Left Rail Nav Button for smaller screens */}
            <button
              type="button"
              onClick={() => setRailOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/25 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="hidden xs:block">
                <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 bg-clip-text text-transparent">
                  Cuttiebooru
                </span>
                <span className="hidden xl:block text-[10px] text-zinc-400 -mt-1">
                  SFW, ecchi & explicit booru
                </span>
              </div>
            </Link>
          </div>

          {/* Search Box */}
          <div className="relative order-last w-full min-w-0 md:order-none md:flex-1 max-w-xl">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center bg-[#1a1d2b] border border-white/10 rounded-2xl p-1.5 focus-within:border-pink-500/70 transition-all"
            >
              <Search className="w-4 h-4 text-pink-400 ml-2 pointer-events-none shrink-0" />
              <input
                type="text"
                aria-label="Search posts"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search creators, #tags, or keywords..."
                className="flex-1 min-w-0 bg-transparent py-1 px-2 text-base sm:text-sm text-white focus:outline-none placeholder:text-zinc-500"
              />
              {searchVal && (
                <button
                  type="button"
                  onClick={() => setSearchVal("")}
                  aria-label="Clear search"
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="px-2.5 py-1 rounded-xl bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-white text-xs font-semibold transition-colors shrink-0"
              >
                Go
              </button>
            </form>
          </div>

          {/* Top Right: Admin Link (if admin) + Avatar Icon (Opens Avatar Modal) */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser?.role === "admin" && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Admin</span>
              </Link>
            )}

            {/* Site Appearance Themes Button */}
            <button
              type="button"
              onClick={() => setShowAppearanceModal(true)}
              className="p-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-pink-500/15 text-pink-400 transition-all"
              title="Site Appearance & Themes"
            >
              <Palette className="w-4 h-4" />
            </button>

            {/* Avatar Icon Button (Click opens Avatar Modal) */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/40 transition-all group"
                title="Account Menu"
              >
                <img
                  src={currentUser.avatarUrl || "/sfw/avatar/0738955ca929985f39921b4876053170.png"}
                  alt={currentUser.displayName}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-pink-500/40 group-hover:ring-pink-500 transition-all"
                />
                <span className="hidden sm:inline text-xs font-bold text-white max-w-[90px] truncate">
                  {currentUser.displayName}
                </span>
              </button>
            ) : (
              <Link
                href="/signin"
                className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container: Left Sidebar Rail + Content Viewport */}
      <div className="max-w-[1600px] w-full mx-auto flex-1 flex gap-5 px-2.5 sm:px-6 pt-4 sm:pt-5 pb-24 md:pb-12">
        {/* Left Sidebar Navigation (Desktop Rail) */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 gap-5">
          <nav className="p-2 rounded-3xl border border-white/[0.07] bg-[#151722] space-y-1">
            <Link
              href="/"
              className={`w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                activeNav === "home"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Home Feed</span>
            </Link>

            <Link
              href="/?tab=explore"
              className={`w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                activeNav === "explore"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span>Explore</span>
            </Link>

            <Link
              href="/comics"
              className={`w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                activeNav === "comics"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0 text-pink-400" />
              <span>Comics & Manga</span>
            </Link>

            <Link
              href="/#upload"
              className={`w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                activeNav === "upload"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <UploadIcon className="w-4 h-4 shrink-0" />
              <span>Upload Work</span>
            </Link>

            <Link
              href="/messages"
              className={`w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                activeNav === "messages"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Messages</span>
              {unreadMsg > 0 && (
                <span className="ml-auto px-1.5 py-0.2 rounded-full bg-purple-500 text-white text-[10px] font-bold">
                  {unreadMsg}
                </span>
              )}
            </Link>

            <Link
              href="/?tab=notifications"
              className={`w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                activeNav === "notifications"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Bell className="w-4 h-4 shrink-0" />
              <span>Notifications</span>
              {unreadNotif > 0 && (
                <span className="ml-auto px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[10px] font-bold">
                  {unreadNotif}
                </span>
              )}
            </Link>

            <Link
              href="/?tab=creators"
              className={`w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                activeNav === "creators"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Creators</span>
            </Link>

            <Link
              href="/?tab=tags"
              className={`w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                activeNav === "tags"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Hash className="w-4 h-4 shrink-0" />
              <span>Tags Directory</span>
            </Link>

            <Link
              href="/?tab=collections"
              className={`w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                activeNav === "collections"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Bookmark className="w-4 h-4 shrink-0" />
              <span>Collections</span>
            </Link>

            <div className="pt-2 mt-2 border-t border-white/10 space-y-1">
              <Link
                href={`/user/${currentUser?.username || "byron"}`}
                className={`w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                  activeNav === "user"
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                    : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <UserIcon className="w-4 h-4 shrink-0 text-purple-400" />
                <span>My User Page</span>
              </Link>

              <Link
                href="/settings"
                className={`w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                  activeNav === "settings"
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                    : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <Settings className="w-4 h-4 shrink-0 text-zinc-400" />
                <span>Settings</span>
              </Link>

              {currentUser?.role === "admin" && (
                <Link
                  href="/admin"
                  className="w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-rose-400 hover:bg-rose-500/15 transition-all"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Admin Dashboard</span>
                </Link>
              )}

              <Link
                href="/signin"
                className="w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-pink-400 hover:bg-pink-500/15 transition-all"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>Sign In / Switch</span>
              </Link>
            </div>
          </nav>
        </aside>

        {/* Content Viewport */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* =========================================================================
          SLIDE-OUT OVERLAY RAIL NAV FOR SMALLER SCREENS (Opens OVER content, does not squeeze!)
      ========================================================================= */}
      {railOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
            onClick={() => setRailOpen(false)}
          />

          {/* Drawer Panel */}
          <aside className="relative w-72 max-w-[85vw] h-full bg-[#131520] border-r border-white/10 p-4 overflow-y-auto z-10 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200">
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="font-black text-sm text-white">Cuttiebooru Navigation</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRailOpen(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1 text-xs font-semibold">
                <Link
                  href="/"
                  onClick={() => setRailOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "home"
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Home Feed</span>
                </Link>

                <Link
                  href="/?tab=explore"
                  onClick={() => setRailOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "explore"
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore</span>
                </Link>

                <Link
                  href="/comics"
                  onClick={() => setRailOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "comics"
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-pink-400" />
                  <span>Comics & Manga</span>
                </Link>

                <Link
                  href="/#upload"
                  onClick={() => setRailOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "upload"
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <UploadIcon className="w-4 h-4" />
                  <span>Upload Work</span>
                </Link>

                <Link
                  href="/messages"
                  onClick={() => setRailOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "messages"
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-4 h-4" />
                    <span>Messages</span>
                  </div>
                  {unreadMsg > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-purple-500 text-white text-[10px] font-bold">
                      {unreadMsg}
                    </span>
                  )}
                </Link>

                <Link
                  href="/?tab=notifications"
                  onClick={() => setRailOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "notifications"
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </div>
                  {unreadNotif > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[10px] font-bold">
                      {unreadNotif}
                    </span>
                  )}
                </Link>

                <Link
                  href="/?tab=tags"
                  onClick={() => setRailOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "tags"
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span>Tags Directory</span>
                </Link>

                <Link
                  href="/?tab=creators"
                  onClick={() => setRailOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "creators"
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Creators</span>
                </Link>

                <Link
                  href="/?tab=collections"
                  onClick={() => setRailOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "collections"
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Saved Collections</span>
                </Link>

                <div className="pt-2 border-t border-white/10 space-y-1">
                  <Link
                    href={`/user/${currentUser?.username || "byron"}`}
                    onClick={() => setRailOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-300 hover:bg-white/5"
                  >
                    <UserIcon className="w-4 h-4 text-purple-400" />
                    <span>My User Page</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setRailOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-300 hover:bg-white/5"
                  >
                    <Settings className="w-4 h-4 text-zinc-400" />
                    <span>Settings</span>
                  </Link>

                  {currentUser?.role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setRailOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-300 bg-rose-500/10 hover:bg-rose-500/20"
                    >
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>Admin Control Center</span>
                    </Link>
                  )}
                </div>
              </nav>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-white/10">
              <Link
                href="/signin"
                onClick={() => setRailOpen(false)}
                className="w-full py-2 px-3 rounded-xl bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Switch / Sign In</span>
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* =========================================================================
          AVATAR ICON MODAL (Contains all things that don't fit on the 5-item mobile nav)
      ========================================================================= */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-end sm:justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowAvatarModal(false)}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-sm rounded-3xl bg-[#141624] border border-white/15 p-5 shadow-2xl text-white space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header: User Info & Close */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <img
                    src={currentUser.avatarUrl || "/sfw/avatar/0738955ca929985f39921b4876053170.png"}
                    alt={currentUser.displayName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-pink-500 shadow-md"
                  />
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-1.5">
                      <span>{currentUser.displayName}</span>
                      {currentUser.isVerified && <BadgeCheck className="w-4 h-4 text-pink-400" />}
                    </h3>
                    <p className="text-xs text-zinc-400">@{currentUser.username}</p>
                    {currentUser.role === "admin" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 mt-1">
                        <Shield className="w-3 h-3 text-rose-400" /> Admin
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-bold">Guest Visitor</h3>
                  <p className="text-xs text-zinc-400">Sign in to access your profile & studio</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items That Don't Fit on Mobile Nav */}
            <div className="space-y-1 text-xs font-semibold">
              <Link
                href="/?tab=notifications"
                onClick={() => setShowAvatarModal(false)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-pink-400" />
                  <span>Notifications & Alerts</span>
                </div>
                {unreadNotif > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[10px] font-bold">
                    {unreadNotif}
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                )}
              </Link>

              {currentUser && (
                <Link
                  href={`/user/${currentUser.username}`}
                  onClick={() => setShowAvatarModal(false)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <UserIcon className="w-4 h-4 text-purple-400" />
                    <span>My User Page</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </Link>
              )}

              <Link
                href="/comics?tab=dashboard"
                onClick={() => setShowAvatarModal(false)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-pink-400" />
                  <span>Manga Creator Studio</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </Link>

              <Link
                href="/?tab=collections"
                onClick={() => setShowAvatarModal(false)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span>My Saved Collections</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </Link>

              <Link
                href="/?tab=tags"
                onClick={() => setShowAvatarModal(false)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-cyan-400" />
                  <span>Tags & Taxonomy</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </Link>

              <Link
                href="/?tab=creators"
                onClick={() => setShowAvatarModal(false)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Top Creators</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </Link>

              <Link
                href="/settings"
                onClick={() => setShowAvatarModal(false)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <span>Account & Privacy Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </Link>

              {currentUser?.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setShowAvatarModal(false)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Admin Dashboard</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400" />
                </Link>
              )}

            </div>

            {/* 1-Click Access to All 3 Accounts */}
            <div className="pt-2 border-t border-white/10">
              <QuickUserSwitcher
                currentUsername={currentUser?.username}
                onSwitched={(u) => {
                  setCurrentUser(u);
                  setShowAvatarModal(false);
                  router.refresh();
                  window.location.reload();
                }}
              />
            </div>

            {/* Sign Out Action */}
            {currentUser && (
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-rose-500/20"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION BAR (Strictly 5 items: Home, Explore, Upload, Comics, Messages)
      ========================================================================= */}
      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#0d0f18]/95 backdrop-blur-xl px-2 py-1.5 grid grid-cols-5 justify-items-center">
        {/* 1. Home */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-colors ${
            activeNav === "home" ? "text-pink-400 font-extrabold" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>

        {/* 2. Explore */}
        <Link
          href="/?tab=explore"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-colors ${
            activeNav === "explore" ? "text-pink-400 font-extrabold" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Explore</span>
        </Link>

        {/* 3. Upload Work (Prominent Center Action) */}
        <Link
          href="/#upload"
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold text-white transition-transform hover:scale-105"
        >
          <div className="w-8 h-8 -mt-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <UploadIcon className="w-4 h-4 text-white" />
          </div>
          <span>Upload</span>
        </Link>

        {/* 4. Messages */}
        <Link
          href="/messages"
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-colors ${
            activeNav === "messages" ? "text-pink-400 font-extrabold" : "text-zinc-400 hover:text-white"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Messages</span>
          {unreadMsg > 0 && (
            <span className="absolute top-0 right-2 w-3.5 h-3.5 rounded-full bg-purple-500 text-white text-[8px] font-bold flex items-center justify-center">
              {unreadMsg}
            </span>
          )}
        </Link>

        {/* 5. Account / Avatar Menu (Opens Avatar Modal right from bottom nav) */}
        <button
          type="button"
          onClick={() => setShowAvatarModal(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
          title="Account Menu"
        >
          {currentUser ? (
            <img
              src={currentUser.avatarUrl || "/sfw/avatar/0738955ca929985f39921b4876053170.png"}
              alt={currentUser.displayName}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-pink-500/50"
            />
          ) : (
            <UserIcon className="w-4 h-4" />
          )}
          <span>Account</span>
        </button>
      </nav>

      {/* Appearance Themes Selector Modal */}
      <AppearanceModal
        isOpen={showAppearanceModal}
        onClose={() => setShowAppearanceModal(false)}
        currentTheme={currentTheme}
        onSelectTheme={(t) => setCurrentTheme(t)}
      />
    </div>
  );
}
