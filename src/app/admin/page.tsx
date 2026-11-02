"use client";

import { TAG_CATEGORIES, getTagCategoryStyle } from "@/lib/tag-taxonomy";
import { AnnouncementEditor } from "@/components/AnnouncementEditor";
import { ReportedPostPreview } from "@/components/ReportedPostPreview";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Image as ImageIcon,
  Users,
  Hash,
  Flag,
  FolderHeart,
  Search,
  Settings,
  ArrowLeft,
  ShieldAlert,
  Trash2,
  Check,
  X,
  Star,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  GitMerge,
  Plus,
  Sparkles,
  Menu,
  Ban,
  Eye,
  Heart,
  RefreshCw,
} from "lucide-react";
import {
  Post,
  User,
  Tag,
  Report,
  TagSuggestion,
  SearchLog,
} from "@/types/cuttiebooru";

type AdminSection =
  | "overview"
  | "posts"
  | "users"
  | "tags"
  | "suggestions"
  | "reports"
  | "collections"
  | "logs"
  | "announcements"
  | "settings";

interface AdminKpis {
  totalPosts: number;
  sfwPostsCount: number;
  questionablePostsCount: number;
  explicitPostsCount: number;
  videoPostsCount: number;
  totalViews: number;
  totalUsers: number;
  verifiedUsersCount: number;
  bannedUsersCount: number;
  totalTags: number;
  nsfwTagsCount: number;
  openReportsCount: number;
  pendingSuggestionsCount: number;
  totalFavorites: number;
  totalFollows: number;
  totalMessages: number;
  totalCollections: number;
  zeroSearchesCount: number;
  categoryStats: Record<string, { posts: number; views: number }>;
}

interface SiteSettingsState {
  siteName: string;
  allow18Plus: boolean;
  requireAgeGate: boolean;
  blurExplicitByDefault: boolean;
  openUploads: boolean;
  announcementBanner: string;
  maintenanceMode: boolean;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // Data States
  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [topTags, setTopTags] = useState<Tag[]>([]);
  const [recentZeroSearches, setRecentZeroSearches] = useState<SearchLog[]>([]);

  const [postsList, setPostsList] = useState<Post[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [tagsList, setTagsList] = useState<Tag[]>([]);
  const [suggestionsList, setSuggestionsList] = useState<TagSuggestion[]>([]);
  const [reportsList, setReportsList] = useState<Report[]>([]);
  const [collectionsList, setCollectionsList] = useState<
    Array<{
      id: string;
      title: string;
      description: string;
      coverUrl: string;
      isPublic: boolean;
      isCurated: boolean;
      badgeText: string;
      owner: User;
      _count?: { items: number };
    }>
  >([]);
  const [logsList, setLogsList] = useState<SearchLog[]>([]);

  // Tag Management Forms
  const [newTagName, setNewTagName] = useState("");
  const [newTagCategory, setNewTagCategory] = useState("general");
  const [newTagDesc, setNewTagDesc] = useState("");
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");

  // Site Settings State
  const [settings, setSettings] = useState<SiteSettingsState>({
    siteName: "Cuttiebooru",
    allow18Plus: true,
    requireAgeGate: false,
    blurExplicitByDefault: false,
    openUploads: true,
    announcementBanner: "",
    maintenanceMode: false,
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        section: activeSection,
        page: String(page),
        limit: String(limit),
        search: searchQuery,
        filter: filterValue,
      });
      const res = await fetch(`/api/admin?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Unable to load admin dashboard"); setLoading(false); return; }

      if (data.kpis) setKpis(data.kpis);
      if (data.siteSettings) setSettings(data.siteSettings);

      if (activeSection === "overview") {
        setTopTags(data.topTags || []);
        setRecentZeroSearches(data.recentZeroSearches || []);
      } else if (activeSection === "posts") {
        setPostsList(data.items || []);
        setTotalItems(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else if (activeSection === "users") {
        setUsersList(data.items || []);
        setTotalItems(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else if (activeSection === "tags") {
        setTagsList(data.items || []);
        setTotalItems(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else if (activeSection === "suggestions") {
        setSuggestionsList(data.items || []);
        setTotalItems(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else if (activeSection === "reports") {
        setReportsList(data.items || []);
        setTotalItems(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else if (activeSection === "collections") {
        setCollectionsList(data.items || []);
        setTotalItems(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else if (activeSection === "logs") {
        setLogsList(data.items || []);
        setTotalItems(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch {
      showToast("Error loading admin data");
    } finally {
      setLoading(false);
    }
  }, [activeSection, page, limit, searchQuery, filterValue]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const switchSection = (sec: AdminSection) => {
    if (sec !== activeSection) setLoading(true);
    setActiveSection(sec);
    setPage(1);
    setSearchQuery("");
    setFilterValue("all");
    setMobileNavOpen(false);
  };

  const runAdminAction = async (
    payload: Record<string, unknown>,
    successText: string
  ) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Action failed");
      } else {
        showToast(successText);
        fetchAdminData();
      }
    } catch {
      showToast("Network error performing action");
    }
  };

  const navItems: Array<{
    id: AdminSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: "overview", label: "Analytics & Overview", icon: BarChart3 },
    { id: "announcements", label: "Announcements", icon: Sparkles },
    {
      id: "posts",
      label: "Posts & Media",
      icon: ImageIcon,
      badge: kpis?.totalPosts,
    },
    {
      id: "users",
      label: "Users & Creators",
      icon: Users,
      badge: kpis?.totalUsers,
    },
    {
      id: "tags",
      label: "Booru Tags & Taxonomy",
      icon: Hash,
      badge: kpis?.totalTags,
    },
    {
      id: "suggestions",
      label: "Tag Suggestions",
      icon: Sparkles,
      badge: kpis?.pendingSuggestionsCount,
    },
    {
      id: "reports",
      label: "Reports & Moderation",
      icon: Flag,
      badge: kpis?.openReportsCount,
    },
    {
      id: "collections",
      label: "Collections & Curation",
      icon: FolderHeart,
      badge: kpis?.totalCollections,
    },
    {
      id: "logs",
      label: "Search Traffic & Logs",
      icon: Search,
      badge: kpis?.zeroSearchesCount,
    },
    { id: "settings", label: "Site & 18+ Settings", icon: Settings },
  ];

  // Reusable Pagination Footer Component
  const renderPaginationBar = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10 text-xs">
      <div className="flex items-center gap-2 text-zinc-400">
        <span>
          Showing page <strong className="text-white">{page}</strong> of{" "}
          <strong className="text-white">{totalPages}</strong> ({totalItems}{" "}
          total records)
        </span>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
          className="px-2 py-1 rounded-lg bg-[#1a1d2d] border border-white/10 text-zinc-200"
        >
          <option value={8}>8 / page</option>
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={30}>30 / page</option>
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 disabled:opacity-30 flex items-center gap-1 font-bold"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>

        {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
          const pNum = idx + 1;
          return (
            <button
              key={pNum}
              type="button"
              onClick={() => setPage(pNum)}
              className={`w-8 h-8 rounded-xl font-bold transition-all ${
                page === pNum
                  ? "bg-pink-500 text-white shadow"
                  : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              {pNum}
            </button>
          );
        })}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 disabled:opacity-30 flex items-center gap-1 font-bold"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#0c0e16] text-zinc-100 flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-2xl bg-pink-600 text-white text-xs font-bold shadow-2xl flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* Top Admin Header */}
      <header className="px-4 sm:px-6 py-3 border-b border-white/[0.08] bg-[#121521] flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300"
            aria-label="Open admin navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-pink-500/25"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Cuttiebooru
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-sm sm:text-base tracking-tight text-white">
                Cuttiebooru Admin Control Center
              </span>
              <span className="hidden md:inline text-[11px] text-zinc-400 ml-2">
                SFW & 18+ Booru Operations, Analytics & Paginated Moderation
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAdminData}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-1.5 text-zinc-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <a
            href="/signin"
            className="px-3 py-1.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-xs font-bold text-pink-300"
          >
            Switch Account
          </a>
        </div>
      </header>

      {/* Main Layout: Dedicated Admin Left Sidebar + Right Content Workspace */}
      <div className="flex-1 flex min-h-0 relative">
        {/* DEDICATED ADMIN LEFT NAVIGATION */}
        <aside
          className={`${
            mobileNavOpen
              ? "fixed inset-y-0 left-0 z-40 flex w-72"
              : "hidden lg:flex lg:w-64 xl:w-72"
          } flex-col border-r border-white/[0.08] bg-[#121521] p-4 justify-between shrink-0 overflow-y-auto max-w-[90vw]`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between lg:hidden pb-2 border-b border-white/10">
              <span className="text-xs font-extrabold uppercase tracking-wider text-pink-400">
                Admin Navigation
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
                Booru Operations
              </p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => switchSection(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                      active
                        ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          active
                            ? "bg-black/30 text-white"
                            : item.id === "reports" || item.id === "suggestions"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-white/10 text-zinc-300"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Health Summary Card in Admin Sidebar */}
          {kpis && (
            <div className="p-3.5 rounded-2xl bg-black/35 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="font-bold text-pink-400">Booru Index</span>
                <span>{kpis.totalPosts} posts</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-bold">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-300">
                  SFW: {kpis.sfwPostsCount}
                </div>
                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300">
                  Q: {kpis.questionablePostsCount}
                </div>
                <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300">
                  18+: {kpis.explicitPostsCount}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT ADMIN CONTENT AREA */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
          {/* ==================== 1. ANALYTICS & OVERVIEW ==================== */}
          {activeSection === "overview" && kpis && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black">
                  Booru Analytics & Executive Overview
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Real-time metrics across SFW & 18+ media, tag taxonomy,
                  creator growth, and moderation queues.
                </p>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                <div className="p-4 rounded-2xl bg-[#151826] border border-white/10 space-y-1">
                  <span className="text-[11px] text-zinc-400">Total Posts</span>
                  <p className="text-2xl font-black text-white">
                    {kpis.totalPosts}
                  </p>
                  <span className="text-[10px] text-purple-300 block">
                    {kpis.videoPostsCount} MP4 Videos
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#151826] border border-rose-500/30 space-y-1">
                  <span className="text-[11px] text-rose-300">
                    18+ & Ecchi Posts
                  </span>
                  <p className="text-2xl font-black text-rose-400">
                    {kpis.explicitPostsCount + kpis.questionablePostsCount}
                  </p>
                  <span className="text-[10px] text-zinc-400 block">
                    {kpis.explicitPostsCount} Explicit •{" "}
                    {kpis.questionablePostsCount} Ecchi
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#151826] border border-white/10 space-y-1">
                  <span className="text-[11px] text-zinc-400">Total Views</span>
                  <p className="text-2xl font-black text-pink-400">
                    {kpis.totalViews.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-emerald-400 block">
                    {kpis.totalFavorites} Favorites
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#151826] border border-white/10 space-y-1">
                  <span className="text-[11px] text-zinc-400">
                    Booru Tags
                  </span>
                  <p className="text-2xl font-black text-purple-400">
                    {kpis.totalTags}
                  </p>
                  <span className="text-[10px] text-rose-300 block">
                    {kpis.nsfwTagsCount} content tags
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#151826] border border-white/10 space-y-1">
                  <span className="text-[11px] text-zinc-400">
                    Creators & Users
                  </span>
                  <p className="text-2xl font-black text-sky-400">
                    {kpis.totalUsers}
                  </p>
                  <span className="text-[10px] text-zinc-400 block">
                    {kpis.verifiedUsersCount} Verified
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#151826] border border-amber-500/30 space-y-1">
                  <span className="text-[11px] text-amber-300">
                    Pending Actions
                  </span>
                  <p className="text-2xl font-black text-amber-400">
                    {kpis.openReportsCount + kpis.pendingSuggestionsCount}
                  </p>
                  <span className="text-[10px] text-zinc-400 block">
                    {kpis.openReportsCount} Reports •{" "}
                    {kpis.pendingSuggestionsCount} Tags
                  </span>
                </div>
              </div>

              {/* Analytics Visual Charts: Rating Distribution & Category Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Chart 1: Content Rating Breakdown */}
                <div className="p-5 rounded-3xl bg-[#151826] border border-white/10 space-y-4">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-pink-400">
                    Content Rating Distribution (SFW vs Questionable vs 18+)
                  </h2>
                  {[
                    {
                      label: "SFW (Safe)",
                      count: kpis.sfwPostsCount,
                      color: "bg-emerald-500",
                    },
                    {
                      label: "Ecchi (Suggestive)",
                      count: kpis.questionablePostsCount,
                      color: "bg-amber-500",
                    },
                    {
                      label: "18+ Explicit (NSFW)",
                      count: kpis.explicitPostsCount,
                      color: "bg-rose-500",
                    },
                  ].map((r) => {
                    const pct =
                      kpis.totalPosts > 0
                        ? Math.round((r.count / kpis.totalPosts) * 100)
                        : 0;
                    return (
                      <div key={r.label} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{r.label}</span>
                          <span className="text-zinc-400">
                            {r.count} posts ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-black/50 overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`h-full rounded-full ${r.color}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chart 2: Category Niche Breakdown */}
                <div className="p-5 rounded-3xl bg-[#151826] border border-white/10 space-y-4">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-purple-400">
                    Views & Volume by Niche Category
                  </h2>
                  <div className="space-y-3">
                    {Object.entries(kpis.categoryStats).map(([cat, st]) => {
                      const pct =
                        kpis.totalViews > 0
                          ? Math.round((st.views / kpis.totalViews) * 100)
                          : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span>{cat}</span>
                            <span className="text-zinc-400">
                              {st.posts} posts • {st.views.toLocaleString()}{" "}
                              views ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-black/50 overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Top Tags & Top Creators */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="p-5 rounded-3xl bg-[#151826] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-200">
                      Top Booru Tags by Usage
                    </h2>
                    <button
                      type="button"
                      onClick={() => switchSection("tags")}
                      className="text-xs text-pink-400 hover:underline font-bold"
                    >
                      Manage All Tags →
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topTags.map((t) => (
                      <span
                        key={t.id}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                          t.category === "content"
                            ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                            : "bg-white/5 border-white/10 text-zinc-200"
                        }`}
                      >
                        #{t.name}{" "}
                        <span className="opacity-60 ml-1">
                          ({t._count?.posts ?? t.usageCount})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-[#151826] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-200">
                      Zero-Result Search Queries
                    </h2>
                    <button
                      type="button"
                      onClick={() => switchSection("logs")}
                      className="text-xs text-pink-400 hover:underline font-bold"
                    >
                      View Search Logs →
                    </button>
                  </div>
                  {recentZeroSearches.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      No zero-result searches logged.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {recentZeroSearches.map((log) => (
                        <div
                          key={log.id}
                          className="px-3 py-2 rounded-xl bg-black/30 border border-white/[0.06] flex items-center justify-between text-xs"
                        >
                          <code className="text-amber-300 font-bold">
                            {log.query}
                          </code>
                          <span className="text-[10px] text-zinc-500">
                            0 results
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== 2. PAGINATED POSTS & MEDIA MANAGEMENT ==================== */}
          {activeSection === "posts" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black">
                    Posts & Media Management (Paginated)
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Inspect, re-rate (SFW / Questionable / 18+), feature, or
                    delete booru posts.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search title or category..."
                    className="px-3.5 py-2 rounded-xl bg-[#151826] border border-white/15 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                  <select
                    value={filterValue}
                    onChange={(e) => {
                      setFilterValue(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#151826] border border-white/15 text-xs text-zinc-200 font-bold"
                  >
                    <option value="all">All Posts</option>
                    <option value="sfw">SFW Only</option>
                    <option value="questionable">Ecchi (Suggestive)</option>
                    <option value="explicit">18+ Explicit Only</option>
                    <option value="video">MP4 Videos Only</option>
                    <option value="featured">Featured Only</option>
                  </select>
                </div>
              </div>

              <div className="rounded-3xl bg-[#151826] border border-white/10 p-4 sm:p-5 space-y-4">
                {loading ? (
                  <p className="text-xs text-zinc-400 py-8 text-center">
                    Loading paginated posts...
                  </p>
                ) : postsList.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-8 text-center">
                    No posts match the current filter.
                  </p>
                ) : (
                  <div className="divide-y divide-white/[0.07]">
                    {postsList.map((post) => {
                      const isVid =
                        post.mediaType === "video" ||
                        post.mediaUrl.endsWith(".mp4");
                      return (
                        <div
                          key={post.id}
                          className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-black border border-white/15 shrink-0 relative">
                              {isVid ? (
                                <video
                                  src={post.mediaUrl}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <img
                                  src={post.thumbnailUrl || post.mediaUrl}
                                  alt={post.title}
                                  className="w-full h-full object-cover"
                                />
                              )}
                              {isVid && (
                                <span className="absolute bottom-1 right-1 px-1 rounded bg-purple-600 text-[9px] font-bold">
                                  MP4
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-white truncate">
                                  {post.title}
                                </span>
                                {post.featured && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    ★ Featured
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-400">
                                by @{post.creator?.username} • {post.category} •{" "}
                                <Eye className="w-3 h-3 inline" /> {post.views}{" "}
                                • <Heart className="w-3 h-3 inline" />{" "}
                                {post._count?.favorites ?? 0}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {post.tags?.slice(0, 5).map((pt) => (
                                  <span
                                    key={pt.id}
                                    className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-zinc-300"
                                  >
                                    #{pt.tag.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Admin Controls for Post */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <select
                              value={post.rating || "sfw"}
                              onChange={(e) =>
                                runAdminAction(
                                  {
                                    action: "update_post",
                                    postId: post.id,
                                    rating: e.target.value,
                                  },
                                  `Updated rating to ${e.target.value.toUpperCase()}`
                                )
                              }
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
                                post.rating === "explicit"
                                  ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                                  : post.rating === "questionable"
                                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                              }`}
                            >
                              <option value="sfw">SFW (Safe)</option>
                              <option value="questionable">
                                Ecchi (Suggestive)
                              </option>
                              <option value="explicit">18+ Explicit</option>
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                runAdminAction(
                                  {
                                    action: "update_post",
                                    postId: post.id,
                                    featured: !post.featured,
                                  },
                                  post.featured
                                    ? "Removed from Featured"
                                    : "Marked as Featured"
                                )
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 ${
                                post.featured
                                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                              }`}
                            >
                              <Star className="w-3.5 h-3.5" />
                              {post.featured ? "Featured" : "Feature"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                runAdminAction(
                                  {
                                    action: "delete_post",
                                    postId: post.id,
                                  },
                                  "Deleted post from booru"
                                )
                              }
                              className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 transition-colors"
                              title="Delete Post"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {renderPaginationBar()}
              </div>
            </div>
          )}

          {/* ==================== 3. PAGINATED USERS & CREATORS MANAGEMENT ==================== */}
          {activeSection === "users" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black">
                    Users & Creators Management (Paginated)
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Assign roles (Admin, Moderator, Creator), toggle
                    verification badges, or suspend accounts.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search @username or name..."
                    className="px-3.5 py-2 rounded-xl bg-[#151826] border border-white/15 text-xs text-white"
                  />
                  <select
                    value={filterValue}
                    onChange={(e) => {
                      setFilterValue(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#151826] border border-white/15 text-xs text-zinc-200 font-bold"
                  >
                    <option value="all">All Users</option>
                    <option value="verified">Verified Creators</option>
                    <option value="moderator">Admins & Moderators</option>
                    <option value="banned">Suspended / Banned</option>
                  </select>
                </div>
              </div>

              <div className="rounded-3xl bg-[#151826] border border-white/10 p-4 sm:p-5 space-y-4">
                <div className="divide-y divide-white/[0.07]">
                  {usersList.map((u) => (
                    <div
                      key={u.id}
                      className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={u.avatarUrl}
                          alt={u.displayName}
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-pink-500/30 shrink-0"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-white">
                              {u.displayName}
                            </span>
                            {u.isVerified && (
                              <BadgeCheck className="w-4 h-4 text-pink-400" />
                            )}
                            {u.isBanned && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                                BANNED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400">
                            @{u.username} • {u.email} • {u.niche}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {u._count?.createdPosts ?? 0} posts •{" "}
                            {u._count?.followers ?? 0} followers
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <select
                          value={u.role || (u.isModerator ? "moderator" : "creator")}
                          onChange={(e) =>
                            runAdminAction(
                              {
                                action: "update_user",
                                userId: u.id,
                                role: e.target.value,
                              },
                              `Updated @${u.username} role to ${e.target.value}`
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs font-bold text-zinc-200"
                        >
                          <option value="creator">Creator</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                          <option value="user">Member</option>
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            runAdminAction(
                              {
                                action: "update_user",
                                userId: u.id,
                                isVerified: !u.isVerified,
                              },
                              u.isVerified
                                ? "Removed verification"
                                : "Verified creator"
                            )
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                            u.isVerified
                              ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                              : "bg-white/5 border-white/10 text-zinc-400"
                          }`}
                        >
                          {u.isVerified ? "✓ Verified" : "Verify"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            runAdminAction(
                              {
                                action: "update_user",
                                userId: u.id,
                                isBanned: !u.isBanned,
                              },
                              u.isBanned
                                ? `Unbanned @${u.username}`
                                : `Suspended @${u.username}`
                            )
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 ${
                            u.isBanned
                              ? "bg-rose-600 text-white border-rose-400"
                              : "bg-white/5 border-white/10 text-zinc-400 hover:text-rose-400"
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          {u.isBanned ? "Unban" : "Ban"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {renderPaginationBar()}
              </div>
            </div>
          )}

          {/* ==================== 4. PAGINATED BOORU TAGS & TAXONOMY ==================== */}
          {activeSection === "tags" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black">
                    Booru Tags & Taxonomy Management (Paginated)
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Create SFW & 18+ tags, recategorize tags, merge aliases, or
                    prune unused tags.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search #tag..."
                    className="px-3.5 py-2 rounded-xl bg-[#151826] border border-white/15 text-xs text-white"
                  />
                  <select
                    value={filterValue}
                    onChange={(e) => {
                      setFilterValue(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#151826] border border-white/15 text-xs text-zinc-200 font-bold"
                  >
                    <option value="all">All Categories</option>
                    {TAG_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Create Tag & Merge Tags Tools */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newTagName.trim()) return;
                    runAdminAction(
                      {
                        action: "create_tag",
                        name: newTagName,
                        category: newTagCategory,
                        description: newTagDesc,
                      },
                      `Created booru tag #${newTagName}`
                    );
                    setNewTagName("");
                    setNewTagDesc("");
                  }}
                  className="p-4 rounded-2xl bg-[#151826] border border-white/10 space-y-3"
                >
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Create New Booru Tag
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Tag name (e.g. fishnets)"
                      className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                    />
                    <select
                      value={newTagCategory}
                      onChange={(e) => setNewTagCategory(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-zinc-200 font-bold"
                    >
                      {TAG_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold"
                    >
                      + Create Tag
                    </button>
                  </div>
                </form>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!mergeSource.trim() || !mergeTarget.trim()) return;
                    runAdminAction(
                      {
                        action: "merge_tags",
                        sourceTagName: mergeSource,
                        targetTagName: mergeTarget,
                      },
                      `Merged #${mergeSource} into #${mergeTarget}`
                    );
                    setMergeSource("");
                    setMergeTarget("");
                  }}
                  className="p-4 rounded-2xl bg-[#151826] border border-white/10 space-y-3"
                >
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <GitMerge className="w-4 h-4" /> Merge Duplicate / Alias
                    Tags
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={mergeSource}
                      onChange={(e) => setMergeSource(e.target.value)}
                      placeholder="Source tag..."
                      className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={mergeTarget}
                      onChange={(e) => setMergeTarget(e.target.value)}
                      placeholder="Target tag..."
                      className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                    >
                      Merge Tags
                    </button>
                  </div>
                </form>
              </div>

              {/* Paginated Tags List */}
              <div className="rounded-3xl bg-[#151826] border border-white/10 p-4 sm:p-5 space-y-4">
                <div className="divide-y divide-white/[0.07]">
                  {tagsList.map((tag) => {
                    const style = getTagCategoryStyle(tag.category);
                    return (
                      <div
                        key={tag.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${style.text}`}>
                              #{tag.name}
                            </span>
                            <span className="text-xs text-zinc-400">
                              ({tag.displayName})
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${style.badge}`}
                            >
                              {tag.category}
                            </span>
                            <span className="text-xs text-zinc-500">
                              • {tag._count?.posts ?? tag.usageCount} posts
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">
                            {tag.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={tag.category}
                            onChange={(e) =>
                              runAdminAction(
                                {
                                  action: "update_tag",
                                  tagId: tag.id,
                                  category: e.target.value,
                                },
                                `Updated #${tag.name} category`
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border ${style.bg} ${style.border} ${style.text}`}
                          >
                            {TAG_CATEGORIES.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.label}
                              </option>
                            ))}
                          </select>

                        <button
                          type="button"
                          onClick={() =>
                            runAdminAction(
                              {
                                action: "update_tag",
                                tagId: tag.id,
                                trending: !tag.trending,
                              },
                              `Toggled trending on #${tag.name}`
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
                            tag.trending
                              ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                              : "bg-white/5 border-white/10 text-zinc-400"
                          }`}
                        >
                          {tag.trending ? "🔥 Trending" : "Normal"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            runAdminAction(
                              { action: "delete_tag", tagId: tag.id },
                              `Deleted tag #${tag.name}`
                            )
                          }
                          className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

                {renderPaginationBar()}
              </div>
            </div>
          )}

          {/* ==================== 5. PAGINATED TAG SUGGESTIONS QUEUE ==================== */}
          {activeSection === "suggestions" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black">
                    Community Tag Suggestions Queue (Paginated)
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Approve suggested SFW & 18+ tags to attach them directly to
                    posts.
                  </p>
                </div>

                <select
                  value={filterValue}
                  onChange={(e) => {
                    setFilterValue(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-[#151826] border border-white/15 text-xs font-bold"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Only</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="rounded-3xl bg-[#151826] border border-white/10 p-4 sm:p-5 space-y-4">
                {suggestionsList.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-8 text-center">
                    No tag suggestions in this filter.
                  </p>
                ) : (
                  <div className="divide-y divide-white/[0.07]">
                    {suggestionsList.map((s) => (
                      <div
                        key={s.id}
                        className="py-3.5 flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-pink-500/20 text-pink-300 font-bold text-xs">
                              #{s.tagName}
                            </span>
                            <span className="text-xs text-zinc-400 uppercase">
                              [{s.tagCategory}]
                            </span>
                            <span className="text-xs text-zinc-300">
                              on post <strong>{s.post?.title}</strong>
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500">
                            Suggested by @{s.suggestedBy?.username} • Status:{" "}
                            <strong className="uppercase">{s.status}</strong>
                          </p>
                        </div>

                        {s.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                runAdminAction(
                                  {
                                    action: "review_suggestion",
                                    suggestionId: s.id,
                                    decision: "approved",
                                  },
                                  `Approved #${s.tagName}`
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                runAdminAction(
                                  {
                                    action: "review_suggestion",
                                    suggestionId: s.id,
                                    decision: "rejected",
                                  },
                                  `Rejected #${s.tagName}`
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {renderPaginationBar()}
              </div>
            </div>
          )}

          {/* ==================== 6. PAGINATED MODERATION & REPORTS QUEUE ==================== */}
          {activeSection === "reports" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black">
                    Moderation & Reports Queue (Paginated)
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Review attribution requests, untagged 18+ reports, and
                    DMCA/removal notices.
                  </p>
                </div>

                <select
                  value={filterValue}
                  onChange={(e) => {
                    setFilterValue(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-[#151826] border border-white/15 text-xs font-bold"
                >
                  <option value="all">All Reports</option>
                  <option value="open">Open Only</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>

              <div className="rounded-3xl bg-[#151826] border border-white/10 p-4 sm:p-5 space-y-4">
                {reportsList.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-8 text-center">
                    No reports matching this status.
                  </p>
                ) : (
                  <div className="divide-y divide-white/[0.07]">
                    {reportsList.map((rep) => (
                      <div
                        key={rep.id}
                        className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                rep.status === "open"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-300"
                              }`}
                            >
                              {rep.status}
                            </span>
                            <span className="text-xs font-bold text-rose-400 uppercase">
                              {rep.reason.replace(/_/g, " ")}
                            </span>
                            {rep.post && (
                              <span className="text-xs text-zinc-200 font-semibold">
                                • Post: &ldquo;{rep.post.title}&rdquo;
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-300">{rep.details}</p>
                          <p className="text-[11px] text-zinc-500">
                            Reported by @{rep.reporter?.username || "anonymous"}{" "}
                            • {new Date(rep.createdAt).toLocaleString()}
                          </p>
                          {rep.post ? <ReportedPostPreview post={rep.post} /> : rep.targetType === "post" && (
                            <p className="text-xs text-zinc-400">This post is no longer available.</p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              runAdminAction(
                                {
                                  action: "resolve_report",
                                  reportId: rep.id,
                                  status: "resolved",
                                },
                                "Marked report resolved"
                              )
                            }
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white text-xs font-bold"
                          >
                            Resolve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              runAdminAction(
                                {
                                  action: "resolve_report",
                                  reportId: rep.id,
                                  status: "dismissed",
                                },
                                "Dismissed report"
                              )
                            }
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold"
                          >
                            Dismiss
                          </button>
                          {rep.postId && (
                            <button
                              type="button"
                              onClick={() =>
                                runAdminAction(
                                  {
                                    action: "resolve_report",
                                    reportId: rep.id,
                                    status: "resolved",
                                    removePost: true,
                                  },
                                  "Removed reported post & resolved"
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold"
                            >
                              Delete Post & Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {renderPaginationBar()}
              </div>
            </div>
          )}

          {/* ==================== 7. PAGINATED COLLECTIONS & CURATION ==================== */}
          {activeSection === "collections" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-black">
                  Collections & Staff Curation (Paginated)
                </h1>
                <p className="text-xs text-zinc-400">
                  Promote collections to Staff Picks or toggle public/private
                  visibility.
                </p>
              </div>

              <div className="rounded-3xl bg-[#151826] border border-white/10 p-4 sm:p-5 space-y-4">
                <div className="divide-y divide-white/[0.07]">
                  {collectionsList.map((col) => (
                    <div
                      key={col.id}
                      className="py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {col.coverUrl && (
                          <img
                            src={col.coverUrl}
                            alt={col.title}
                            className="w-12 h-12 rounded-xl object-cover shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {col.title}
                          </p>
                          <p className="text-xs text-zinc-400">
                            by @{col.owner?.username} •{" "}
                            {col._count?.items ?? 0} items •{" "}
                            {col.isPublic ? "Public" : "Private"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            runAdminAction(
                              {
                                action: "update_collection",
                                collectionId: col.id,
                                isCurated: !col.isCurated,
                              },
                              col.isCurated
                                ? "Removed from Curated"
                                : "Promoted to Staff Curated"
                            )
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                            col.isCurated
                              ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                              : "bg-white/5 border-white/10 text-zinc-400"
                          }`}
                        >
                          {col.isCurated ? "★ Staff Curated" : "Curate"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            runAdminAction(
                              {
                                action: "delete_collection",
                                collectionId: col.id,
                              },
                              "Deleted collection"
                            )
                          }
                          className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {renderPaginationBar()}
              </div>
            </div>
          )}

          {/* ==================== 8. PAGINATED SEARCH LOGS ==================== */}
          {activeSection === "logs" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black">
                    Search Traffic & Zero-Result Queries (Paginated)
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Track what visitors are searching for and turn 0-hit queries
                    into new booru tags.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={filterValue}
                    onChange={(e) => {
                      setFilterValue(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#151826] border border-white/15 text-xs font-bold"
                  >
                    <option value="all">All Searches</option>
                    <option value="zero">Zero-Result (0 Hits)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      runAdminAction(
                        { action: "clear_zero_searches" },
                        "Cleared zero-result search logs"
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold"
                  >
                    Clear 0-Hit Logs
                  </button>
                </div>
              </div>

              <div className="rounded-3xl bg-[#151826] border border-white/10 p-4 sm:p-5 space-y-4">
                <div className="divide-y divide-white/[0.07]">
                  {logsList.map((log) => (
                    <div
                      key={log.id}
                      className="py-3 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-0.5">
                        <code className="text-sm font-bold text-pink-300">
                          {log.query}
                        </code>
                        <p className="text-[11px] text-zinc-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold ${
                            log.resultsCount === 0
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {log.resultsCount} results
                        </span>
                        {log.resultsCount === 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              runAdminAction(
                                {
                                  action: "create_tag",
                                  name: log.query,
                                  category: "general",
                                },
                                `Created tag from search: #${log.query}`
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-white font-bold"
                          >
                            + Create Tag
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {renderPaginationBar()}
              </div>
            </div>
          )}

          {activeSection === "announcements" && (
            <section className="max-w-2xl space-y-5">
              <div>
                <h1 className="text-xl font-black">Announcements</h1>
                <p className="text-xs text-zinc-400">Publish or update the home-feed notice for all visitors. Removing it restores the community notice.</p>
              </div>
              {!loading && <AnnouncementEditor
                banner={settings.announcementBanner}
                onSaved={(announcementBanner) => setSettings((previous) => ({ ...previous, announcementBanner }))}
              />}
            </section>
          )}

          {/* ==================== 9. SITE & 18+ COMPLIANCE SETTINGS ==================== */}
          {activeSection === "settings" && (
            <div className="max-w-2xl space-y-5">
              <div>
                <h1 className="text-xl font-black">
                  Site Configuration & 18+ Booru Controls
                </h1>
                <p className="text-xs text-zinc-400">
                  Configure global SFW/18+ policies, age gate behavior, and site
                  banners.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAdminAction(
                    {
                      action: "update_settings",
                      siteName: settings.siteName,
                      allow18Plus: settings.allow18Plus,
                      requireAgeGate: settings.requireAgeGate,
                      blurExplicitByDefault: settings.blurExplicitByDefault,
                      openUploads: settings.openUploads,
                      maintenanceMode: settings.maintenanceMode,
                    },
                    "Saved global site settings"
                  );
                }}
                className="p-6 rounded-3xl bg-[#151826] border border-white/10 space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) =>
                      setSettings({ ...settings, siteName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white"
                  />
                </div>

                <button type="button" onClick={() => switchSection("announcements")}
                  className="text-sm font-bold text-pink-300">Manage Announcements</button>

                <div className="space-y-2.5 pt-2">
                  {[
                    {
                      key: "allow18Plus" as const,
                      label: "Allow 18+ Explicit (NSFW) Content & Tags on Booru",
                    },
                    {
                      key: "blurExplicitByDefault" as const,
                      label: "Blur 18+ Explicit Thumbnails by Default in Feed",
                    },
                    {
                      key: "requireAgeGate" as const,
                      label: "Require 18+ Age Confirmation Modal for Explicit Filter",
                    },
                    {
                      key: "openUploads" as const,
                      label: "Allow All Signed-In Creators to Upload Media",
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-black/35 border border-white/10 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-zinc-200">
                        {item.label}
                      </span>
                      <input
                        type="checkbox"
                        checked={settings[item.key]}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            [item.key]: e.target.checked,
                          })
                        }
                        className="rounded accent-pink-500 w-4 h-4"
                      />
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-pink-500/25"
                >
                  Save Global Booru Settings
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
