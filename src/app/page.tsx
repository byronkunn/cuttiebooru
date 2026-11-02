"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Flame,
  Shuffle,
  X,
  Plus,
  Minus,
  BadgeCheck,
  FolderHeart,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Check,
  ShieldCheck,
  ShieldAlert,
  LogIn,
  EyeOff,
  MessageCircle,
  Bell,
  BookOpen,
  Settings,
  Menu,
  LogOut,
  Megaphone,
  Edit3,
  Palette,
} from "lucide-react";
import {
  AppearanceModal,
  applyThemeToDocument,
  getStoredTheme,
} from "@/components/AppearanceModal";
import { QuickUserSwitcher } from "@/components/QuickUserSwitcher";
import { parseAnnouncement } from "@/lib/announcement";
import { parseSearchInput } from "@/lib/search";
import {
  User,
  Post,
  Album,
  Tag,
  Collection,
  FollowRelation,
  DirectMessage,
  NotificationItem,
  SavedSearch,
} from "@/types/cuttiebooru";
import { TAG_CATEGORIES, getTagCategoryStyle } from "@/lib/tag-taxonomy";
import { ImageCard } from "@/components/ImageCard";
import { ExploreView } from "@/components/ExploreView";
import { AlbumViewerModal } from "@/components/AlbumViewerModal";
import { SaveToCollectionModal } from "@/components/SaveToCollectionModal";
import { ReportModal } from "@/components/ReportModal";
import { CreatorProfileView } from "@/components/CreatorProfileView";
import { UploadView } from "@/components/UploadView";
import { CollectionsView } from "@/components/CollectionsView";
import { MessagesView } from "@/components/MessagesView";
import { NotificationsView } from "@/components/NotificationsView";
import { FollowListModal } from "@/components/FollowListModal";
import { TwitterEditProfileModal } from "@/components/TwitterEditProfileModal";

type NavSection =
  | "home"
  | "explore"
  | "notifications"
  | "messages"
  | "creators"
  | "tags"
  | "collections"
  | "upload";

export default function CuttiebooruApp() {
  const router = useRouter();
  // Navigation & Theme
  const [activeNav, setActiveNav] = useState<NavSection>("home");
  const [lightTheme, setLightTheme] = useState(false);

  // Active User & Platform State
  const [activeUserId, setActiveUserId] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [favoritePostIds, setFavoritePostIds] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [allFollows, setAllFollows] = useState<FollowRelation[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Messaging Partner
  const [activePartnerId, setActivePartnerId] = useState<string>("user_kitsune");

  // Modals for Followers/Following & Twitter Edit Profile
  const [followModalState, setFollowModalState] = useState<{
    user: User;
    tab: "followers" | "following" | "verified";
  } | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Posts & Feed Filtering + Server-Side Pagination State
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [savedSearchAlerts, setSavedSearchAlerts] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);
  const [feedTab, setFeedTab] = useState<
    "latest" | "popular" | "following" | "random"
  >("latest");
  const [randomSeed, setRandomSeed] = useState("initial");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [includedTags, setIncludedTags] = useState<string[]>([]);
  const [excludedTags, setExcludedTags] = useState<string[]>([]);

  // Committed / Applied Search Query State (Only updated when user hits Go!)
  const [appliedQuery, setAppliedQuery] = useState("");
  const [appliedIncludedTags, setAppliedIncludedTags] = useState<string[]>([]);
  const [appliedExcludedTags, setAppliedExcludedTags] = useState<string[]>([]);

  const [selectedMediaType, setSelectedMediaType] = useState("all");
  const [selectedRating, setSelectedRating] = useState("all"); // all | sfw | questionable | explicit
  const [blurExplicit, setBlurExplicit] = useState(false);

  // Server-side Pagination State for Feed, Tags Directory, and Creators Directory
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage, setPostsPerPage] = useState(12);
  const [totalPostsCount, setTotalPostsCount] = useState(0);
  const [totalPagesCount, setTotalPagesCount] = useState(1);

  const [tagsPage, setTagsPage] = useState(1);
  const [creatorsPage, setCreatorsPage] = useState(1);

  // Sub-views & Modals
  const [viewingCreator, setViewingCreator] = useState<User | null>(null);
  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [saveTarget, setSaveTarget] = useState<{
    post?: Post | null;
    album?: Album | null;
    creator?: User | null;
  } | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    post?: Post | null;
    user?: User | null;
  } | null>(null);

  // Tags & Creators Page Filters
  const [tagCategoryFilter, setTagCategoryFilter] = useState("all");
  const [tagSearchInput, setTagSearchInput] = useState("");
  const [creatorNicheFilter, setCreatorNicheFilter] = useState("all");

  // Responsive Drawer & Avatar Modal State
  const [railOpen, setRailOpen] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("dark");

  const handleSignOut = async () => {
    await fetch("/api/account", { method: "DELETE" });
    setShowAvatarModal(false);
    router.push("/signin");
  };

  // Admin Announcement State
  const [announcementBanner, setAnnouncementBanner] = useState<string>("");
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    linkUrl: "",
    linkLabel: "",
  });
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState<string | null>();
  const announcementVersion = announcementBanner.trim() || "community-notice-v1";

  useEffect(() => {
    try {
      setDismissedAnnouncement(localStorage.getItem("cuttiebooru-dismissed-announcement"));
    } catch (error) {
      console.error("Unable to read announcement dismissal:", error);
      setDismissedAnnouncement(null);
    }
  }, []);

  const dismissAnnouncement = () => {
    setDismissedAnnouncement(announcementVersion);
    try {
      localStorage.setItem("cuttiebooru-dismissed-announcement", announcementVersion);
    } catch (error) {
      console.error("Unable to save announcement dismissal:", error);
      showToast("Announcement hidden, but your browser could not save this preference.");
    }
  };

  const parsedAnnouncement = useMemo(() => {
    if (!announcementBanner || !announcementBanner.trim()) {
      return {
        title: "Community Notice",
        message:
          "SFW, ecchi & explicit booru. Explore by franchise, characters, outfits, poses, and manga chapters.",
        linkUrl: "",
        linkLabel: "",
        isCustom: false,
      };
    }
    const parsed = parseAnnouncement(announcementBanner);
    return {
      ...parsed,
      title: parsed.title || "Admin Announcement",
      isCustom: true,
    };
  }, [announcementBanner]);

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title.trim() && !announcementForm.message.trim()) {
      showToast("Please provide a title or message for the announcement");
      return;
    }
    setIsSavingAnnouncement(true);
    try {
      const payloadString = JSON.stringify({
        title: announcementForm.title.trim(),
        message: announcementForm.message.trim(),
        linkUrl: announcementForm.linkUrl.trim(),
        linkLabel: announcementForm.linkLabel.trim(),
        updatedAt: new Date().toISOString(),
      });
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_settings",
          announcementBanner: payloadString,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnnouncementBanner(payloadString);
        setIsEditingAnnouncement(false);
        showToast("Announcement published to all users!");
      } else {
        showToast(data.error || "Failed to publish announcement");
      }
    } catch (err) {
      console.error(err);
      showToast("Error saving announcement");
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleClearAnnouncement = async () => {
    setIsSavingAnnouncement(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_settings",
          announcementBanner: "",
        }),
      });
      if (res.ok) {
        setAnnouncementBanner("");
        setIsEditingAnnouncement(false);
        showToast("Announcement cleared");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to clear announcement");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to clear announcement");
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  // Toast Notification
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  const currentUserId = currentUser?.id;

  useEffect(() => {
    if (!currentUserId) {
      setSavedSearches([]);
      return;
    }

    let cancelled = false;
    fetch("/api/saved-searches")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load saved searches");
        if (!cancelled) setSavedSearches(data.savedSearches || []);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to load saved searches:", error);
          showToast("Could not load saved searches");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserId, showToast]);

  const saveCurrentSearch = async () => {
    const criteria = [
      appliedQuery.trim(),
      ...appliedIncludedTags.map((tag) => `#${tag}`),
      ...appliedExcludedTags.map((tag) => `-#${tag}`),
      selectedMediaType !== "all" ? selectedMediaType : "",
      selectedRating !== "all" ? selectedRating : "",
    ].filter(Boolean);
    const name = (criteria.join(" ") || "All posts").slice(0, 60);
    setSavingSearch(true);
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          query: appliedQuery,
          includedTags: appliedIncludedTags,
          excludedTags: appliedExcludedTags,
          mediaType: selectedMediaType,
          rating: selectedRating,
          alertsEnabled: savedSearchAlerts,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save search");
      setSavedSearches((previous) => [data.savedSearch, ...previous]);
      setShowSavedSearches(true);
      showToast("Search saved");
    } catch (error) {
      console.error("Failed to save search:", error);
      showToast(error instanceof Error ? error.message : "Failed to save search");
    } finally {
      setSavingSearch(false);
    }
  };

  const applySavedSearch = (savedSearch: SavedSearch) => {
    setSearchQuery(savedSearch.query);
    setAppliedQuery(savedSearch.query);
    setIncludedTags(JSON.parse(savedSearch.includedTags) as string[]);
    setAppliedIncludedTags(JSON.parse(savedSearch.includedTags) as string[]);
    setExcludedTags(JSON.parse(savedSearch.excludedTags) as string[]);
    setAppliedExcludedTags(JSON.parse(savedSearch.excludedTags) as string[]);
    setSelectedMediaType(savedSearch.mediaType);
    setSelectedRating(savedSearch.rating);
    setCurrentPage(1);
    setActiveNav("home");
    setViewingCreator(null);
  };

  const toggleSavedSearchAlerts = async (savedSearch: SavedSearch) => {
    const alertsEnabled = !savedSearch.alertsEnabled;
    try {
      const res = await fetch("/api/saved-searches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: savedSearch.id, alertsEnabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update alerts");
      setSavedSearches((previous) =>
        previous.map((item) =>
          item.id === savedSearch.id ? { ...item, alertsEnabled } : item
        )
      );
    } catch (error) {
      console.error("Failed to update saved search alerts:", error);
      showToast(error instanceof Error ? error.message : "Failed to update alerts");
    }
  };

  const deleteSavedSearch = async (savedSearch: SavedSearch) => {
    try {
      const res = await fetch(
        `/api/saved-searches?id=${encodeURIComponent(savedSearch.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete saved search");
      setSavedSearches((previous) =>
        previous.filter((item) => item.id !== savedSearch.id)
      );
      showToast("Saved search removed");
    } catch (error) {
      console.error("Failed to delete saved search:", error);
      showToast(error instanceof Error ? error.message : "Failed to delete saved search");
    }
  };

  // Load Bootstrap Data
  const loadBootstrap = useCallback(
    async (uid: string) => {
      try {
        const res = await fetch(`/api/bootstrap?userId=${uid}`);
        const data = await res.json();
        if (res.ok) {
          setCurrentUser(data.currentUser);
          setActiveUserId(data.currentUser?.id || "");
          setUsers(data.users || []);
          setTags(data.tags || []);
          setAlbums(data.albums || []);
          setCollections(data.collections || []);
          setFavoritePostIds(data.userFavoritePostIds || []);
          setFollowingIds(data.userFollowingIds || []);
          setAllFollows(data.allFollows || []);
          setMessages(data.messages || []);
          setNotifications(data.notifications || []);
          if (data.announcementBanner !== undefined) {
            setAnnouncementBanner(data.announcementBanner || "");
          }

          // Keep viewingCreator synced if open
          setViewingCreator((prev) =>
            prev
              ? (data.users || []).find((u: User) => u.id === prev.id) || prev
              : null
          );
        }
      } catch (err) {
        console.error("Failed to bootstrap:", err);
      }
    },
    []
  );

  // Load Paginated & Filtered Posts
  const loadPosts = useCallback(
    async (logSearch = false) => {
      setLoadingPosts(true);
      try {
        const params = new URLSearchParams({
          q: appliedQuery,
          tags: appliedIncludedTags.join(","),
          excludeTags: appliedExcludedTags.join(","),
          category: "all",
          mediaType: selectedMediaType,
          rating: selectedRating,
          creatorId: "",
          tab: feedTab,
          seed: randomSeed,
          userId: activeUserId,
          page: String(currentPage),
          limit: String(postsPerPage),
          logSearch: logSearch ? "true" : "false",
        });
        const res = await fetch(`/api/posts?${params.toString()}`);
        const data = await res.json();
        if (res.ok) {
          setPosts(data.posts || []);
          setTotalPostsCount(data.total ?? (data.posts || []).length);
          setTotalPagesCount(data.totalPages ?? 1);
        }
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      } finally {
        setLoadingPosts(false);
      }
    },
    [
      appliedQuery,
      appliedIncludedTags,
      appliedExcludedTags,
      selectedMediaType,
      selectedRating,
      feedTab,
      randomSeed,
      activeUserId,
      currentPage,
      postsPerPage,
    ]
  );

  useEffect(() => {
    loadBootstrap("");
  }, [loadBootstrap]);

  useEffect(() => {
    loadPosts(false);
  }, [loadPosts]);

  // Sync URL search params (?tags=... or ?q=...) into active search chips
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const tagParam = urlParams.get("tags") || urlParams.get("tag");
    const qParam = urlParams.get("q");
    const excludeParam = urlParams.get("excludeTags");
    if (excludeParam) {
      const parsedTags = excludeParam.split(",").map((tag) => tag.trim().replace(/^#/, "").toLowerCase()).filter(Boolean);
      setExcludedTags(parsedTags);
      setAppliedExcludedTags(parsedTags);
    }
    if (tagParam) {
      const parsedTags = tagParam
        .split(",")
        .map((t) => t.trim().replace(/^#/, "").toLowerCase())
        .filter(Boolean);
      if (parsedTags.length > 0) {
        setIncludedTags((prev) => Array.from(new Set([...prev, ...parsedTags])));
        setAppliedIncludedTags((prev) => Array.from(new Set([...prev, ...parsedTags])));
        setActiveNav("home");
      }
    }
    if (qParam) {
      setSearchQuery(qParam);
      setAppliedQuery(qParam);
      setActiveNav("home");
    }
  }, []);

  // Initialize and apply visual theme across document
  useEffect(() => {
    const saved = getStoredTheme();
    setCurrentTheme(saved);
    setLightTheme(saved === "sakura");
    try {
      applyThemeToDocument(saved);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to restore appearance.");
    }
  }, [showToast]);

  // Unread counts for Header, Sidebar, Mobile Nav & DM Dock
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const unreadMessagesCount = useMemo(
    () =>
      messages.filter((m) => m.receiverId === activeUserId && !m.isRead).length,
    [messages, activeUserId]
  );

  // Autocomplete Suggestions based on searchQuery
  const autocompleteResults = useMemo(() => {
    const raw = searchQuery.trim().toLowerCase().replace(/^-?#?/, "");
    if (!raw) {
      return {
        tags: tags.filter((t) => t.trending).slice(0, 5),
        creators: users.filter((u) => u.featured).slice(0, 3),
      };
    }
    return {
      tags: tags
        .filter(
          (t) =>
            t.name.toLowerCase().includes(raw) ||
            t.displayName.toLowerCase().includes(raw)
        )
        .slice(0, 6),
      creators: users
        .filter(
          (u) =>
            u.username.toLowerCase().includes(raw) ||
            u.displayName.toLowerCase().includes(raw)
        )
        .slice(0, 4),
    };
  }, [searchQuery, tags, users]);

  // Tag Inclusion / Exclusion helpers
  const toggleIncludeTag = (tagName: string) => {
    setViewingCreator(null);
    if (activeNav !== "home" && activeNav !== "explore" && activeNav !== "tags") {
      setActiveNav("home");
    }
    setExcludedTags((prev) => prev.filter((t) => t !== tagName));
    setIncludedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const toggleExcludeTag = (tagName: string) => {
    setViewingCreator(null);
    if (activeNav !== "home" && activeNav !== "explore" && activeNav !== "tags") {
      setActiveNav("home");
    }
    setIncludedTags((prev) => prev.filter((t) => t !== tagName));
    setExcludedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  // Apply staged search & tag query (Only runs when user hits "Go"!)
  const handleApplySearch = (overrideQuery?: string, overrideIncluded?: string[], overrideExcluded?: string[]) => {
    const q = overrideQuery !== undefined ? overrideQuery : searchQuery;
    const inc = overrideIncluded !== undefined ? overrideIncluded : includedTags;
    const exc = overrideExcluded !== undefined ? overrideExcluded : excludedTags;

    const parsed = parseSearchInput(q, inc, exc);
    setSearchQuery(parsed.query);
    setIncludedTags(parsed.includedTags);
    setExcludedTags(parsed.excludedTags);
    setAppliedQuery(parsed.query);
    setAppliedIncludedTags(parsed.includedTags);
    setAppliedExcludedTags(parsed.excludedTags);
    setCurrentPage(1);
    setShowAutocomplete(false);
    setViewingCreator(null);
    if (activeNav !== "home") {
      setActiveNav("home");
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setIncludedTags([]);
    setExcludedTags([]);
    setAppliedQuery("");
    setAppliedIncludedTags([]);
    setAppliedExcludedTags([]);
    setSelectedMediaType("all");
    setSelectedRating("all");
    setFeedTab("latest");
    setCurrentPage(1);
  };

  // Interactive API Actions
  const handleToggleFavorite = async (
    postId: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const res = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "favorite",
        userId: activeUserId,
        postId,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.favorited) {
        setFavoritePostIds((prev) => [...prev, postId]);
        showToast("Added to your Favorites ♥");
      } else {
        setFavoritePostIds((prev) => prev.filter((id) => id !== postId));
        showToast("Removed from Favorites");
      }
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                _count: {
                  ...p._count,
                  favorites: Math.max(
                    0,
                    (p._count?.favorites || 0) + (data.favorited ? 1 : -1)
                  ),
                },
              }
            : p
        )
      );
    }
  };

  const handleOpenPost = (p: Post) => {
    router.push(`/post/${p.id}`);
  };

  const handleOpenCreator = (c: User) => {
    router.push(`/user/${c.username}`);
  };

  const handleToggleFollow = async (targetUserId: string) => {
    if (targetUserId === activeUserId) {
      showToast("You are viewing your own creator profile!");
      return;
    }
    const res = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "follow",
        userId: activeUserId,
        targetUserId,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.following) {
        setFollowingIds((prev) => [...prev, targetUserId]);
        showToast("Following creator! Added to your Following feed.");
      } else if (data.requested) {
        showToast("Follow request sent. The creator must approve it.");
      } else {
        setFollowingIds((prev) => prev.filter((id) => id !== targetUserId));
        showToast("Unfollowed creator.");
      }
      await loadBootstrap(activeUserId);
    }
  };

  const handleAddToCollection = async (
    collectionId: string,
    payload: { postId?: string; albumId?: string; creatorId?: string }
  ) => {
    const res = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_to_collection",
        userId: activeUserId,
        collectionId,
        ...payload,
      }),
    });
    if (res.ok) {
      showToast("Saved to collection!");
      await loadBootstrap(activeUserId);
    }
  };

  const handleCreateCollection = async (
    title: string,
    description: string,
    isPublic: boolean
  ): Promise<Collection | null> => {
    const res = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_collection",
        userId: activeUserId,
        title,
        description,
        isPublic,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`Created collection "${title}"`);
      await loadBootstrap(activeUserId);
      return data.collection;
    }
    return null;
  };

  const handleToggleCollectionPrivacy = async (collectionId: string) => {
    await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_collection_privacy",
        collectionId,
      }),
    });
    showToast("Updated collection visibility");
    await loadBootstrap(activeUserId);
  };

  const handleRemoveCollectionItem = async (itemId: string) => {
    await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "remove_from_collection",
        itemId,
      }),
    });
    showToast("Removed item from collection");
    await loadBootstrap(activeUserId);
  };

  const handleReorderCollectionItem = async (
    itemId: string,
    direction: "up" | "down"
  ) => {
    await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reorder_collection_item",
        itemId,
        direction,
      }),
    });
    await loadBootstrap(activeUserId);
  };

  const handleSubmitReport = async (payload: {
    targetType: string;
    postId?: string;
    reportedUserId?: string;
    reason: string;
    details: string;
    contactEmail: string;
  }) => {
    await fetch("/api/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit_report",
        reporterId: activeUserId,
        ...payload,
      }),
    });
    showToast("Report submitted to Trust & Moderation.");
    await loadBootstrap(activeUserId);
  };

  // Direct Messaging API Handlers
  const handleSendMessage = async (payload: {
    receiverId: string;
    text: string;
    mediaUrl?: string;
    mediaType?: string;
    mediaDuration?: string;
    replyToId?: string | null;
    selfDestructSec?: number;
  }) => {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        userId: activeUserId,
        ...payload,
      }),
    });
    const data = await res.json();
    if (res.ok && data.message) {
      setMessages((prev) => [...prev, data.message]);
      // If self-destruct timer is set, schedule auto-delete
      if (payload.selfDestructSec && payload.selfDestructSec > 0) {
        const msgId = data.message.id;
        setTimeout(async () => {
          await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", messageId: msgId }),
          });
          setMessages((prev) => prev.filter((m) => m.id !== msgId));
        }, payload.selfDestructSec * 1000);
      }
    }
  };

  const handleEditMessage = async (messageId: string, text: string) => {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", messageId, text }),
    });
    const data = await res.json();
    if (res.ok && data.message) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? data.message : m))
      );
      showToast("Message edited");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", messageId }),
    });
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      showToast("Message deleted");
    }
  };

  const handlePinMessage = async (messageId: string) => {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pin", messageId }),
    });
    const data = await res.json();
    if (res.ok && data.message) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? data.message : m))
      );
      showToast(
        data.message.isPinned ? "Pinned message to top" : "Unpinned message"
      );
    }
  };

  const handleReactMessage = async (messageId: string, emoji: string) => {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "react",
        userId: activeUserId,
        messageId,
        emoji,
      }),
    });
    const data = await res.json();
    if (res.ok && data.message) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? data.message : m))
      );
    }
  };

  const handleForwardMessage = async (
    messageId: string,
    targetReceiverId: string
  ) => {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "forward",
        userId: activeUserId,
        messageId,
        targetReceiverId,
      }),
    });
    const data = await res.json();
    if (res.ok && data.message) {
      setMessages((prev) => [...prev, data.message]);
      showToast("Forwarded message!");
    }
  };

  const handleMarkConversationRead = useCallback(
    async (partnerId: string) => {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_read",
          userId: activeUserId,
          partnerId,
        }),
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === partnerId && m.receiverId === activeUserId
            ? { ...m, isRead: true }
            : m
        )
      );
    },
    [activeUserId]
  );

  // Notification API Handlers
  const handleMarkOneNotificationRead = async (notificationId: string) => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_one_read", notificationId }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllNotificationsRead = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "mark_all_read",
        userId: activeUserId,
      }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showToast("Marked all notifications as read");
  };

  const handleDeleteNotification = async (notificationId: string) => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", notificationId }),
    });
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const handleStartMessageWithUser = (targetUser: User) => {
    setActivePartnerId(targetUser.id);
    setViewingCreator(null);
    setActiveNav("messages");
  };

  const handleUpdateProfile = async (
    payload: Partial<User> & { userId: string }
  ) => {
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    showToast("Saved profile banner, avatar & bio!");
    await loadBootstrap(activeUserId);
  };

  const handleShare = (title: string, url: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast(`Share link copied for "${title}"!`);
  };

  const hasActiveFilters =
    appliedQuery.trim() !== "" ||
    appliedIncludedTags.length > 0 ||
    appliedExcludedTags.length > 0 ||
    includedTags.length > 0 ||
    excludedTags.length > 0 ||
    searchQuery.trim() !== "" ||
    selectedMediaType !== "all" ||
    selectedRating !== "all";

  const hasUnappliedChanges =
    searchQuery !== appliedQuery ||
    includedTags.length !== appliedIncludedTags.length ||
    !includedTags.every((t) => appliedIncludedTags.includes(t)) ||
    excludedTags.length !== appliedExcludedTags.length ||
    !excludedTags.every((t) => appliedExcludedTags.includes(t));

  const featuredCreators = users.filter((u) => u.featured);
  const curatedCollections = collections.filter((c) => c.isCurated);

  // When on the Messages page, render CuttieMessenger as a standalone full-screen application
  // without Cuttiebooru's header, left navigation sidebar, or mobile bottom nav.
  if (activeNav === "messages" && !viewingCreator && !currentUser) {
    return <main className="p-8"><a href="/signin" className="text-pink-400">Sign in to view messages</a></main>;
  }
  if (activeNav === "messages" && !viewingCreator) {
    return (
      <>
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs sm:text-sm font-bold shadow-2xl shadow-pink-500/30">
            <Check className="w-4 h-4 shrink-0" />
            <span>{toast}</span>
          </div>
        )}
        <MessagesView
          currentUser={currentUser}
          users={users}
          messages={messages}
          activePartnerId={activePartnerId}
          lightTheme={lightTheme}
          compactMode={false}
          onBackToSite={() => setActiveNav("home")}
          onToggleTheme={() => {
            const theme = lightTheme ? "dark" : "sakura";
            setCurrentTheme(theme);
            setLightTheme(theme === "sakura");
            try {
              applyThemeToDocument(theme);
            } catch (error) {
              showToast(error instanceof Error ? error.message : "Unable to save appearance.");
            }
          }}
          onSwitchUser={() => { window.location.href = "/signin"; }}
          onSelectPartner={(pid) => setActivePartnerId(pid)}
          onSelectCreatorProfile={(c) => {
            setActiveNav("home");
            setViewingCreator(c);
          }}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onPinMessage={handlePinMessage}
          onReactMessage={handleReactMessage}
          onForwardMessage={handleForwardMessage}
          onMarkConversationRead={handleMarkConversationRead}
        />
      </>
    );
  }

  return (
    <div
      className={`min-h-dvh flex flex-col transition-colors duration-200 ${
        lightTheme
          ? "bg-[#faf7fc] text-zinc-900"
          : "bg-[#0f1016] text-zinc-100"
      }`}
    >
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs sm:text-sm font-bold shadow-2xl shadow-pink-500/30">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Sticky Top Header (Responsive across Mobile, Tablet, Desktop) */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
          lightTheme
            ? "bg-white/85 border-purple-200/80"
            : "bg-[#12141d]/85 border-white/[0.07]"
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-2.5 sm:px-6 py-2 sm:min-h-16 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3">
          {/* Brand Logo & Mobile Menu Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setRailOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              onClick={() => {
                setViewingCreator(null);
                setActiveNav("home");
              }}
              className="flex items-center gap-2 cursor-pointer shrink-0 group"
            >
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/25 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="hidden xs:block">
                <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 bg-clip-text text-transparent">
                  Cuttiebooru
                </span>
                <span className="hidden xl:block text-[10px] text-zinc-400 -mt-1">
                  SFW, ecchi & explicit images and videos
                </span>
              </div>
            </div>
          </div>

          {/* Smart Search Bar with Multi-Tag Chips & Autocomplete */}
          <div className="relative order-last w-full min-w-0 sm:order-none sm:flex-1 max-w-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleApplySearch();
              }}
              className={`relative flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border transition-all ${
                lightTheme
                  ? "bg-purple-50/90 border-purple-200 focus-within:border-pink-500"
                  : "bg-[#1a1d2b] border-white/10 focus-within:border-pink-500/70"
              }`}
            >
              {/* Multi-Tag Chips inside Search Box */}
              {(includedTags.length > 0 || excludedTags.length > 0) && (
                <div aria-label="Selected search tags" className="w-full max-h-[min(4rem,12dvh)] overflow-y-auto flex flex-wrap items-center gap-1.5">
                  {includedTags.map((tName) => (
                    <span
                      key={tName}
                      className="inline-flex items-center gap-1 min-w-0 max-w-full px-2.5 py-0.5 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/40 text-xs font-bold animate-fade-in"
                    >
                      <span className="truncate" title={`#${tName}`}>#{tName}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIncludedTags((prev) => prev.filter((t) => t !== tName));
                        }}
                        className="p-0.5 shrink-0 hover:bg-pink-500/30 rounded-full text-pink-300 hover:text-white transition-colors"
                        title={`Remove #${tName}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {excludedTags.map((tName) => (
                    <span
                      key={`excluded-${tName}`}
                      className="inline-flex items-center gap-1 min-w-0 max-w-full px-2.5 py-0.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold"
                    >
                      <span className="truncate" title={`-#${tName}`}>-#{tName}</span>
                      <button
                        type="button"
                        onClick={() => setExcludedTags((prev) => prev.filter((tag) => tag !== tName))}
                        className="p-0.5 shrink-0 hover:bg-rose-500/30 rounded-full transition-colors"
                        title={`Remove excluded #${tName}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <Search className="w-4 h-4 text-pink-400 shrink-0 ml-1.5 pointer-events-none" />

              <input
                type="text"
                aria-label="Search posts"
                value={searchQuery}
                onFocus={() => setShowAutocomplete(true)}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && searchQuery === "" && includedTags.length > 0) {
                    setIncludedTags((prev) => prev.slice(0, prev.length - 1));
                  } else if (e.key === "Backspace" && searchQuery === "" && excludedTags.length > 0) {
                    setExcludedTags((prev) => prev.slice(0, prev.length - 1));
                  }
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={includedTags.length > 0 || excludedTags.length > 0 ? "Add keyword or tag..." : "Search creators, #tags, or -exclude..."}
                className="flex-1 min-w-[100px] bg-transparent py-1 px-1.5 text-base sm:text-sm text-white focus:outline-none placeholder:text-zinc-500"
              />

              {(searchQuery || includedTags.length > 0 || excludedTags.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setIncludedTags([]);
                    setExcludedTags([]);
                  }}
                  title="Clear tags and search"
                  className="p-1 text-zinc-400 hover:text-white shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="submit"
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  hasUnappliedChanges
                    ? "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-md shadow-pink-500/30 scale-105"
                    : "bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-white"
                }`}
              >
                Go
              </button>
            </form>

            {/* Autocomplete Dropdown */}
            {showAutocomplete && (
              <div
                className={`absolute left-0 right-0 mt-2 rounded-2xl border p-3.5 shadow-2xl z-40 space-y-3 max-h-[40dvh] overflow-y-auto ${
                  lightTheme
                    ? "bg-white border-purple-200 text-zinc-900"
                    : "bg-[#181b28] border-white/15 text-zinc-100"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    <span>Suggested Tags (+ Include / - Exclude)</span>
                    <span>Multi-tag</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {autocompleteResults.tags.map((t) => (
                      <div
                        key={t.id}
                        className="inline-flex items-center rounded-lg overflow-hidden border border-white/10 bg-white/[0.05] text-xs"
                      >
                        <button
                          type="button"
                          onMouseDown={() => toggleIncludeTag(t.name)}
                          className="px-2.5 py-1 hover:bg-pink-500/20 hover:text-pink-300 font-medium flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-pink-400" />#{t.name}
                        </button>
                        <button
                          type="button"
                          onMouseDown={() => toggleExcludeTag(t.name)}
                          title={`Exclude #${t.name}`}
                          className="px-1.5 py-1 bg-black/30 hover:bg-rose-500/30 text-zinc-400 hover:text-rose-300 border-l border-white/10"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {autocompleteResults.creators.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                      Matching Creators
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {autocompleteResults.creators.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => {
                            setViewingCreator(c);
                            setShowAutocomplete(false);
                          }}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-pink-500/15 text-left transition-colors"
                        >
                          <img
                            src={c.avatarUrl}
                            alt={c.displayName}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate flex items-center gap-1">
                              {c.displayName}
                              {c.isVerified && (
                                <BadgeCheck className="w-3 h-3 text-pink-400" />
                              )}
                            </p>
                            <p className="text-[10px] text-zinc-400 truncate">
                              @{c.username} • {c.niche}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Header Controls: Admin (if admin), Theme Toggle, Avatar Menu Modal Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {currentUser?.role === "admin" && (
              <a
                href="/admin"
                title="Open Dedicated Booru Admin Control Center"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Admin</span>
              </a>
            )}

            {/* Site Appearance Themes Button (Opens Theme Picker Modal) */}
            <button
              type="button"
              onClick={() => setShowAppearanceModal(true)}
              title="Site Appearance & Themes"
              className="p-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-pink-500/15 text-pink-400 transition-all"
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
              <a
                href="/signin"
                className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-colors"
              >
                Sign In
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Container: Left Sidebar + Primary Content Area */}
      <div className="max-w-[1600px] w-full mx-auto flex-1 flex gap-5 px-2.5 sm:px-6 pt-4 sm:pt-5 pb-24 md:pb-12">
        {/* Desktop Sidebar Navigation (Desktop Rail) */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 gap-5">
          <nav
            className={`p-2 rounded-3xl border space-y-1 ${
              lightTheme
                ? "bg-white border-purple-200/80 shadow-sm"
                : "bg-[#151722] border-white/[0.07]"
            }`}
          >
            {(
              [
                { id: "home", label: "Home Feed", icon: Home, badge: 0 },
                {
                  id: "explore",
                  label: "Explore",
                  icon: Compass,
                  badge: 0,
                },
                {
                  id: "notifications",
                  label: "Notifications",
                  icon: Bell,
                  badge: unreadNotificationsCount,
                },
                {
                  id: "messages",
                  label: "Messages",
                  icon: MessageCircle,
                  badge: unreadMessagesCount,
                },
                { id: "creators", label: "Creators", icon: Users, badge: 0 },
                {
                  id: "tags",
                  label: "Tags & Search",
                  icon: Hash,
                  badge: 0,
                },
                {
                  id: "collections",
                  label: "Collections",
                  icon: Bookmark,
                  badge: 0,
                },
                {
                  id: "upload",
                  label: "Upload Work",
                  icon: UploadIcon,
                  badge: 0,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id && !viewingCreator;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setViewingCreator(null);
                    setActiveNav(item.id);
                  }}
                  title={item.label}
                  className={`w-full flex items-center justify-center lg:justify-between px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all relative ${
                    isActive
                      ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                      : lightTheme
                      ? "text-zinc-700 hover:bg-purple-100/70"
                      : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? "bg-white text-pink-600"
                          : "bg-pink-500 text-white"
                      } lg:static absolute top-1 right-1`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <a
              href="/comics"
              title="Comics & Manga"
              className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <BookOpen className="w-4 h-4 shrink-0 text-pink-400" />
              <span className="hidden lg:inline">Comics & Manga</span>
            </a>

            <div className="pt-2 mt-2 border-t border-white/10 space-y-1">
              <a
                href={`/user/${currentUser?.username || "byron"}`}
                title="My User Page"
                className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-all"
              >
                <UserIcon className="w-4 h-4 shrink-0 text-purple-400" />
                <span className="hidden lg:inline">My User Page</span>
              </a>

              <a
                href="/settings"
                title="Account & Privacy Settings"
                className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-all"
              >
                <Settings className="w-4 h-4 shrink-0 text-zinc-400" />
                <span className="hidden lg:inline">Settings</span>
              </a>

              {currentUser?.role === "admin" && (
                <a
                  href="/admin"
                  title="Dedicated Admin Control Center"
                  className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-rose-400 hover:bg-rose-500/15 transition-all"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="hidden lg:inline">Admin Dashboard</span>
                </a>
              )}

              <a
                href="/signin"
                title="Sign In / Account Switcher"
                className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-pink-400 hover:bg-pink-500/15 transition-all"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span className="hidden lg:inline">Sign In / Switch</span>
              </a>
            </div>
          </nav>

          {/* Sidebar Trending Tags Quick Filter (Desktop Large) */}
          <div
            className={`hidden lg:block p-4 rounded-3xl border space-y-3 ${
              lightTheme
                ? "bg-white border-purple-200/80"
                : "bg-[#151722] border-white/[0.07]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                Trending Tags
              </span>
              <button
                type="button"
                onClick={() => {
                  setViewingCreator(null);
                  setActiveNav("tags");
                }}
                className="text-[11px] text-zinc-400 hover:text-pink-400"
              >
                All →
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags
                .filter((t) => t.trending)
                .slice(0, 8)
                .map((t) => {
                  const isInc = includedTags.includes(t.name);
                  const isExc = excludedTags.includes(t.name);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleIncludeTag(t.name)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                        isInc
                          ? "bg-pink-500 text-white border-pink-400"
                          : isExc
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40 line-through"
                          : "bg-white/[0.04] hover:bg-pink-500/15 text-zinc-300 border-white/10"
                      }`}
                    >
                      #{t.name}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Sidebar Trust Card */}
          <div
            className={`hidden lg:block p-4 rounded-3xl border space-y-2 ${
              lightTheme
                ? "bg-purple-50 border-purple-200"
                : "bg-gradient-to-b from-pink-500/10 to-purple-500/5 border-pink-500/20"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-pink-400">
              <ShieldCheck className="w-4 h-4" />
              Creator-First Platform
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Direct 1-on-1 creator messaging, verified attribution, and
              shareable collections.
            </p>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0">
          {viewingCreator ? (
            <CreatorProfileView
              creator={viewingCreator}
              currentUserId={activeUserId}
              posts={posts}
              albums={albums}
              allFollows={allFollows}
              favoritePostIds={favoritePostIds}
              isFollowing={followingIds.includes(viewingCreator.id)}
              lightTheme={lightTheme}
              onBack={() => setViewingCreator(null)}
              onSelectPost={handleOpenPost}
              onSelectCreator={handleOpenCreator}
              onSelectAlbum={(a) => setViewingAlbum(a)}
              onSelectTag={(t) => toggleIncludeTag(t)}
              onToggleFavorite={handleToggleFavorite}
              onToggleFollow={handleToggleFollow}
              onOpenSaveModal={(post, e) => {
                e.stopPropagation();
                setSaveTarget({ post });
              }}
              onSaveCreatorToCollection={(creator) =>
                setSaveTarget({ creator })
              }
              onReportCreator={(creator) => setReportTarget({ user: creator })}
              onShare={handleShare}
              onOpenFollowModal={(user, tab) =>
                setFollowModalState({ user, tab })
              }
              onOpenEditProfileModal={() => setIsEditProfileOpen(true)}
              onStartMessage={handleStartMessageWithUser}
            />
          ) : (
            <>
              {/* ==================== HOME PAGE ==================== */}
              {activeNav === "home" && (
                <div className="space-y-6">
                  {/* Admin Broadcast Announcement Banner */}
                  {dismissedAnnouncement !== undefined && dismissedAnnouncement !== announcementVersion && (
                    <div
                      className={`relative rounded-2xl border transition-all ${
                        lightTheme
                          ? "bg-purple-50/80 border-pink-300/60 shadow-sm"
                          : "bg-pink-500/[0.06] border-pink-500/20"
                      } px-4 py-3.5`}
                    >
                      {isEditingAnnouncement ? (
                        /* Admin Announcement Broadcaster Editor */
                        <form onSubmit={handleSaveAnnouncement} className="space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-pink-500/20">
                            <div className="flex items-center gap-2">
                              <Megaphone className="w-4 h-4 text-pink-400 animate-pulse" />
                              <span className="text-xs font-bold uppercase tracking-wider text-pink-400">
                                Admin Announcement Broadcaster
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsEditingAnnouncement(false)}
                              className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-zinc-300">
                              Announcement Headline / Title
                            </label>
                            <input
                              type="text"
                              value={announcementForm.title}
                              onChange={(e) =>
                                setAnnouncementForm({
                                  ...announcementForm,
                                  title: e.target.value,
                                })
                              }
                              placeholder="e.g., 🎉 Welcome to Cuttiebooru v2.0 & Tankōbon Manga Reader!"
                              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-zinc-300">
                              Announcement Message / Body
                            </label>
                            <textarea
                              value={announcementForm.message}
                              onChange={(e) =>
                                setAnnouncementForm({
                                  ...announcementForm,
                                  message: e.target.value,
                                })
                              }
                              placeholder="Write the message that all site visitors and members will see..."
                              rows={2}
                              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500 resize-none"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-bold text-zinc-300">
                                Optional Action Link URL
                              </label>
                              <input
                                type="text"
                                value={announcementForm.linkUrl}
                                onChange={(e) =>
                                  setAnnouncementForm({
                                    ...announcementForm,
                                    linkUrl: e.target.value,
                                  })
                                }
                                placeholder="e.g., /comics or /post/123"
                                className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-zinc-300">
                                Optional Button Label
                              </label>
                              <input
                                type="text"
                                value={announcementForm.linkLabel}
                                onChange={(e) =>
                                  setAnnouncementForm({
                                    ...announcementForm,
                                    linkLabel: e.target.value,
                                  })
                                }
                                placeholder="e.g., Read Manga Now"
                                className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={handleClearAnnouncement}
                              disabled={isSavingAnnouncement || !announcementBanner}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-semibold disabled:opacity-40 transition-colors"
                            >
                              Clear Announcement
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setIsEditingAnnouncement(false)}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSavingAnnouncement}
                                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-pink-500/25 transition-all flex items-center gap-1.5"
                              >
                                {isSavingAnnouncement
                                  ? "Publishing..."
                                  : "Broadcast to Site"}
                              </button>
                            </div>
                          </div>
                        </form>
                      ) : (
                        /* Broadcast Banner Display */
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center shrink-0 mt-0.5 text-pink-400 shadow-sm">
                              <Megaphone className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold tracking-tight text-white break-words">
                                  {parsedAnnouncement.title}
                                </p>
                                {parsedAnnouncement.isCustom && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                                    <Sparkles className="w-2.5 h-2.5 text-pink-400" /> Site Notice
                                  </span>
                                )}
                                {currentUser?.role === "admin" && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    Admin Broadcaster
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-zinc-300 leading-relaxed break-words whitespace-pre-line">
                                {parsedAnnouncement.message}
                              </p>

                              {parsedAnnouncement.linkUrl && (
                                <div className="pt-1">
                                  <a
                                    href={parsedAnnouncement.linkUrl}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-white text-xs font-bold transition-all border border-pink-500/30"
                                  >
                                    <span>
                                      {parsedAnnouncement.linkLabel ||
                                        "Learn More"}
                                    </span>
                                    <ChevronRight className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Controls: Admin Edit & User Dismiss */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {currentUser?.role === "admin" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAnnouncementForm({
                                    title: parsedAnnouncement.isCustom
                                      ? parsedAnnouncement.title
                                      : "",
                                    message: parsedAnnouncement.isCustom
                                      ? parsedAnnouncement.message
                                      : "",
                                    linkUrl: parsedAnnouncement.linkUrl || "",
                                    linkLabel: parsedAnnouncement.linkLabel || "",
                                  });
                                  setIsEditingAnnouncement(true);
                                }}
                                title="Edit or Broadcast Site Announcement"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-white text-xs font-bold transition-colors border border-pink-500/40"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">
                                  Edit Announcement
                                </span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={dismissAnnouncement}
                              aria-label="Dismiss Announcement"
                              className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                              title="Dismiss Announcement"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Featured Creators & Curated Collections Strip */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div
                      className={`xl:col-span-7 p-4 rounded-3xl border flex flex-col justify-between gap-3 ${
                        lightTheme
                          ? "bg-white border-purple-200"
                          : "bg-[#151722] border-white/[0.07]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Featured Creators
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveNav("creators")}
                          className="text-xs font-semibold text-zinc-400 hover:text-pink-400 flex items-center gap-0.5"
                        >
                          Browse All <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {featuredCreators.slice(0, 4).map((creator) => (
                          <div
                            key={creator.id}
                            onClick={() => setViewingCreator(creator)}
                            className="group p-2.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-pink-500/40 hover:bg-pink-500/10 cursor-pointer transition-all flex items-center gap-2.5"
                          >
                            <img
                              src={creator.avatarUrl}
                              alt={creator.displayName}
                              className="w-10 h-10 rounded-full object-cover ring-1 ring-pink-500/40 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate group-hover:text-pink-300 flex items-center gap-1">
                                {creator.displayName}
                                {creator.isVerified && (
                                  <BadgeCheck className="w-3 h-3 text-pink-400 shrink-0" />
                                )}
                              </p>
                              <p className="text-[10px] text-zinc-400 truncate">
                                {creator.niche}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      className={`xl:col-span-5 p-4 rounded-3xl border flex flex-col justify-between gap-3 ${
                        lightTheme
                          ? "bg-white border-purple-200"
                          : "bg-[#151722] border-white/[0.07]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                          <Bookmark className="w-3.5 h-3.5" />
                          Curated Collections
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveNav("collections")}
                          className="text-xs font-semibold text-zinc-400 hover:text-purple-400 flex items-center gap-0.5"
                        >
                          View Galleries <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {curatedCollections.slice(0, 2).map((col) => (
                          <div
                            key={col.id}
                            onClick={() => setActiveNav("collections")}
                            className="group relative h-16 rounded-2xl overflow-hidden border border-white/10 cursor-pointer"
                          >
                            <img
                              src={col.coverUrl}
                              alt={col.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent p-2.5 flex flex-col justify-center">
                              <span className="text-[10px] font-bold text-amber-300 uppercase">
                                {col.badgeText}
                              </span>
                              <p className="text-xs font-bold text-white truncate">
                                {col.title}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Feed Tabs + Filter Controls Bar */}
                  <div
                    className={`p-3.5 rounded-3xl border space-y-3 ${
                      lightTheme
                        ? "bg-white border-purple-200/80"
                        : "bg-[#151722] border-white/[0.07]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/25 border border-white/10 overflow-x-auto no-scrollbar">
                        {(
                          [
                            { id: "latest", label: "Latest" },
                            { id: "popular", label: "Popular" },
                            { id: "following", label: "Following" },
                            { id: "random", label: "Random" },
                          ] as const
                        ).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setFeedTab(t.id);
                              if (t.id === "random") {
                                setCurrentPage(1);
                                setRandomSeed(`${Date.now()}-${Math.random()}`);
                              }
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                              feedTab === t.id
                                ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            {t.id === "random" && (
                              <Shuffle className="w-3 h-3" />
                            )}
                            {t.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400 hidden sm:inline" />

                        {/* Booru Rating Filter (All | SFW | Questionable | 18+ Explicit) */}
                        <select
                          value={selectedRating}
                          onChange={(e) => {
                            setSelectedRating(e.target.value);
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none ${
                            selectedRating === "explicit"
                              ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                              : selectedRating === "questionable"
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                              : selectedRating === "sfw"
                              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                              : "bg-black/30 border-white/10 text-zinc-200"
                          }`}
                        >
                          <option value="all">All Ratings (SFW, Ecchi & Explicit)</option>
                          <option value="sfw">SFW (Safe Only)</option>
                          <option value="questionable">
                            Ecchi (Suggestive)
                          </option>
                          <option value="explicit">Explicit (18+)</option>
                        </select>

                        {/* Blur 18+ Previews Toggle */}
                        <button
                          type="button"
                          onClick={() => setBlurExplicit(!blurExplicit)}
                          title="Blur 18+ Explicit thumbnails until hovered"
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all ${
                            blurExplicit
                              ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                              : "bg-black/30 border-white/10 text-zinc-400 hover:text-white"
                          }`}
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>{blurExplicit ? "18+ Blurred" : "Blur 18+"}</span>
                        </button>

                        {/* Media Type Dropdown */}
                        <select
                          value={selectedMediaType}
                          onChange={(e) => {
                            setSelectedMediaType(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-xs font-medium text-zinc-200 focus:outline-none focus:border-pink-500"
                        >
                          <option value="all">All Media Types</option>
                          <option value="image">Images & Galleries</option>
                          <option value="video">MP4 Video Loops</option>
                        </select>

                        {(hasActiveFilters || selectedRating !== "all") && (
                          <button
                            type="button"
                            onClick={clearAllFilters}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Reset
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {currentUser ? (
                          <>
                            <button
                              type="button"
                              onClick={saveCurrentSearch}
                              disabled={savingSearch || hasUnappliedChanges}
                              title={
                                hasUnappliedChanges
                                  ? "Apply your search changes before saving"
                                  : "Save the current feed filters"
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-pink-300 text-xs font-bold disabled:opacity-50"
                            >
                              <Bookmark className="w-3.5 h-3.5" />
                              {savingSearch ? "Saving..." : "Save this search"}
                            </button>
                            <label className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                              <input
                                type="checkbox"
                                checked={savedSearchAlerts}
                                onChange={(event) =>
                                  setSavedSearchAlerts(event.target.checked)
                                }
                                className="accent-pink-500"
                              />
                              Alert me about new matches
                            </label>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            Sign in to save searches and alerts
                          </span>
                        )}
                      </div>
                      {currentUser && (
                        <button
                          type="button"
                          onClick={() => setShowSavedSearches((open) => !open)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300"
                        >
                          {showSavedSearches ? "Hide" : "Saved searches"} (
                          {savedSearches.length})
                        </button>
                      )}
                    </div>

                    {showSavedSearches && currentUser && (
                      <div className="space-y-2 border-t border-white/10 pt-3">
                        {savedSearches.length === 0 ? (
                          <p className="text-xs text-zinc-500">
                            Your saved searches will appear here.
                          </p>
                        ) : (
                          savedSearches.map((savedSearch) => (
                            <div
                              key={savedSearch.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/20 px-3 py-2"
                            >
                              <button
                                type="button"
                                onClick={() => applySavedSearch(savedSearch)}
                                className="min-w-0 flex-1 text-left text-xs font-semibold text-zinc-200 hover:text-pink-300"
                              >
                                <span className="block truncate">
                                  {savedSearch.name}
                                </span>
                                <span className="block text-[10px] font-normal text-zinc-500">
                                  {savedSearch.alertsEnabled
                                    ? "New-match alerts on"
                                    : "Alerts off"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleSavedSearchAlerts(savedSearch)
                                }
                                title={
                                  savedSearch.alertsEnabled
                                    ? "Turn off new-match alerts"
                                    : "Turn on new-match alerts"
                                }
                                aria-label={
                                  savedSearch.alertsEnabled
                                    ? `Turn off alerts for ${savedSearch.name}`
                                    : `Turn on alerts for ${savedSearch.name}`
                                }
                                className={`p-2 rounded-lg ${
                                  savedSearch.alertsEnabled
                                    ? "text-pink-300 bg-pink-500/15"
                                    : "text-zinc-500 hover:text-zinc-200"
                                }`}
                              >
                                <Bell className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteSavedSearch(savedSearch)}
                                title={`Delete ${savedSearch.name}`}
                                aria-label={`Delete ${savedSearch.name}`}
                                className="p-2 rounded-lg text-zinc-500 hover:text-rose-300 hover:bg-rose-500/10"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Popular Tag Chips Bar (SFW + 18+ Booru Tags) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                      <span className="text-[11px] font-semibold text-zinc-400 shrink-0 pr-1">
                        Popular Booru Tags:
                      </span>
                      {tags.slice(0, 16).map((tag) => {
                        const isInc = includedTags.includes(tag.name);
                        const isExc = excludedTags.includes(tag.name);
                        const style = getTagCategoryStyle(tag.category);
                        return (
                          <div
                            key={tag.id}
                            className={`inline-flex items-center rounded-xl text-xs font-semibold border shrink-0 transition-all ${
                              isInc
                                ? "bg-pink-500 text-white border-pink-400 shadow-sm shadow-pink-500/30"
                                : isExc
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                : `${style.bg} ${style.border} ${style.text} hover:opacity-85`
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleIncludeTag(tag.name)}
                              className="px-2.5 py-1 flex items-center gap-1"
                              title={`Add #${tag.name} to search chips`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>#{tag.name}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleExcludeTag(tag.name)}
                              title={`Exclude #${tag.name}`}
                              className="pr-2 pl-1 py-1 opacity-60 hover:opacity-100 hover:text-rose-300"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Active Multi-Tag Filter Indicator Pills */}
                    {(includedTags.length > 0 || excludedTags.length > 0) && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-zinc-400 font-medium">
                            Tags to Search:
                          </span>
                          {includedTags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 font-semibold"
                            >
                              +#{t}
                              <button
                                type="button"
                                onClick={() => toggleIncludeTag(t)}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          {excludedTags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold"
                            >
                              -#{t} (Excluded)
                              <button
                                type="button"
                                onClick={() => toggleExcludeTag(t)}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Prominent Go Button for Tag Row */}
                        <button
                          type="button"
                          onClick={() => handleApplySearch()}
                          className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow ${
                            hasUnappliedChanges
                              ? "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-pink-500/30 scale-105"
                              : "bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white"
                          }`}
                        >
                          <span>Go</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Responsive Paginated Image & Video Grid */}
                  {loadingPosts ? (
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="aspect-[4/5] rounded-2xl bg-white/5 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="p-12 rounded-3xl border border-white/10 bg-[#151722] text-center space-y-3">
                      <p className="text-base font-bold">
                        No works matched your current tag or rating filter.
                      </p>
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="px-4 py-2 rounded-xl bg-pink-500 text-white text-xs font-bold"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {posts.map((post) => (
                          <ImageCard
                            key={post.id}
                            post={post}
                            isFavorited={favoritePostIds.includes(post.id)}
                            lightTheme={lightTheme}
                            blurExplicit={blurExplicit}
                            onSelectPost={handleOpenPost}
                            onSelectCreator={handleOpenCreator}
                            onSelectTag={(t) => toggleIncludeTag(t)}
                            onToggleFavorite={handleToggleFavorite}
                            onOpenSaveModal={(p, e) => {
                              e.stopPropagation();
                              setSaveTarget({ post: p });
                            }}
                          />
                        ))}
                      </div>

                      {/* Server-Side Pagination Controls Bar */}
                      <div
                        className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                          lightTheme
                            ? "bg-white border-purple-200"
                            : "bg-[#151722] border-white/[0.07]"
                        }`}
                      >
                        <div className="flex items-center gap-3 text-xs text-zinc-400">
                          <span>
                            Page{" "}
                            <strong className="text-white">
                              {currentPage}
                            </strong>{" "}
                            of{" "}
                            <strong className="text-white">
                              {totalPagesCount}
                            </strong>{" "}
                            ({totalPostsCount} matching booru posts)
                          </span>
                          <select
                            value={postsPerPage}
                            onChange={(e) => {
                              setPostsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-black/30 border border-white/10 text-zinc-200 font-semibold"
                          >
                            <option value={8}>8 / page</option>
                            <option value={12}>12 / page</option>
                            <option value={24}>24 / page</option>
                            <option value={36}>36 / page</option>
                          </select>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            disabled={currentPage <= 1}
                            onClick={() =>
                              setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 disabled:opacity-30 text-xs font-bold flex items-center gap-1"
                          >
                            <ChevronLeft className="w-4 h-4" /> Prev
                          </button>

                          {Array.from({
                            length: Math.min(7, totalPagesCount),
                          }).map((_, idx) => {
                            const pageNum = idx + 1;
                            return (
                              <button
                                key={pageNum}
                                type="button"
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                                  currentPage === pageNum
                                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                                    : "bg-white/5 text-zinc-400 hover:text-white"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            disabled={currentPage >= totalPagesCount}
                            onClick={() =>
                              setCurrentPage((p) =>
                                Math.min(totalPagesCount, p + 1)
                              )
                            }
                            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 disabled:opacity-30 text-xs font-bold flex items-center gap-1"
                          >
                            Next <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ==================== NOTIFICATIONS PAGE (TWITTER STYLE) ==================== */}
              {activeNav === "notifications" && (
                <NotificationsView
                  notifications={notifications}
                  followingIds={followingIds}
                  lightTheme={lightTheme}
                  onSelectPost={handleOpenPost}
                  onSelectCreator={handleOpenCreator}
                  onToggleFollow={handleToggleFollow}
                  onStartMessage={handleStartMessageWithUser}
                  onMarkOneRead={handleMarkOneNotificationRead}
                  onMarkAllRead={handleMarkAllNotificationsRead}
                  onDeleteNotification={handleDeleteNotification}
                />
              )}

              {/* ==================== MESSAGES PAGE (TWITTER DM + TELEGRAM) ==================== */}
              {activeNav === "messages" && (
                <MessagesView
                  currentUser={currentUser}
                  users={users}
                  messages={messages}
                  activePartnerId={activePartnerId}
                  lightTheme={lightTheme}
                  onSelectPartner={(pid) => setActivePartnerId(pid)}
                  onSelectCreatorProfile={(c) => setViewingCreator(c)}
                  onSendMessage={handleSendMessage}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onPinMessage={handlePinMessage}
                  onReactMessage={handleReactMessage}
                  onForwardMessage={handleForwardMessage}
                  onMarkConversationRead={handleMarkConversationRead}
                />
              )}

              {/* ==================== EXPLORE PAGE ==================== */}
              {activeNav === "explore" && (
                <div className="space-y-8 pb-12">
                  <ExploreView
                    rating={selectedRating}
                    onRatingChange={setSelectedRating}
                    lightTheme={lightTheme}
                    blurExplicit={blurExplicit}
                    favoritePostIds={favoritePostIds}
                    followingIds={followingIds}
                    currentUserId={currentUser?.id}
                    onSelectPost={handleOpenPost}
                    onSelectCreator={handleOpenCreator}
                    onSelectTag={(tag) => {
                      setIncludedTags([tag]);
                      setExcludedTags([]);
                      setSearchQuery("");
                      handleApplySearch("", [tag], []);
                      setActiveNav("home");
                    }}
                    onToggleFavorite={handleToggleFavorite}
                    onOpenSaveModal={(post, event) => {
                      event.stopPropagation();
                      setSaveTarget({ post });
                    }}
                    onFollow={handleToggleFollow}
                  />

                  <div className="space-y-4">
                    <h2 className="text-lg font-extrabold flex items-center gap-2">
                      <FolderHeart className="w-5 h-5 text-pink-400" />
                      Featured Creator Albums ({albums.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {albums.map((album) => (
                        <div
                          key={album.id}
                          onClick={() => setViewingAlbum(album)}
                          className="group rounded-3xl overflow-hidden border border-white/10 bg-[#161822] hover:border-pink-500/50 cursor-pointer transition-all"
                        >
                          <div className="relative h-48 overflow-hidden">
                            <img
                              src={album.coverUrl}
                              alt={album.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-pink-500/90 text-white">
                              {album.category}
                            </span>
                            <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/75 text-white border border-white/15">
                              {album._count?.posts ?? album.posts?.length ?? 0}{" "}
                              files
                            </span>
                          </div>
                          <div className="p-4 space-y-2">
                            <h3 className="font-bold text-base group-hover:text-pink-400 transition-colors">
                              {album.title}
                            </h3>
                            <p className="text-xs text-zinc-400 line-clamp-2">
                              {album.description}
                            </p>
                            <div className="pt-2 flex items-center gap-2 text-xs text-zinc-300">
                              <img
                                src={album.creator.avatarUrl}
                                alt={album.creator.displayName}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span>by {album.creator.displayName}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== CREATORS DIRECTORY ==================== */}
              {activeNav === "creators" && (
                <div className="space-y-6 pb-12">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-extrabold flex items-center gap-2">
                        <Users className="w-6 h-6 text-pink-400" />
                        Creator Directory
                      </h1>
                      <p className="text-xs sm:text-sm text-zinc-400">
                        Discover verified cosplayers, character illustrators,
                        photographers, and indie figure makers.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-semibold">
                      {[
                        "all",
                        "Cute Art",
                        "Cosplay",
                        "Photography",
                        "Indie",
                      ].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setCreatorNicheFilter(n);
                            setCreatorsPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-xl transition-all ${
                            creatorNicheFilter === n
                              ? "bg-pink-500 text-white"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {n === "all" ? "All Niches" : n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const filteredCreators = users.filter(
                      (u) =>
                        creatorNicheFilter === "all" ||
                        u.niche === creatorNicheFilter
                    );
                    const perPage = 6;
                    const totalCreatorPages = Math.max(
                      1,
                      Math.ceil(filteredCreators.length / perPage)
                    );
                    const safeCreatorPage = Math.min(
                      creatorsPage,
                      totalCreatorPages
                    );
                    const pagedCreators = filteredCreators.slice(
                      (safeCreatorPage - 1) * perPage,
                      safeCreatorPage * perPage
                    );

                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {pagedCreators.map((creator) => {
                            const isFollowing = followingIds.includes(
                              creator.id
                            );
                            const followersCount = allFollows.filter(
                              (f) => f.followingId === creator.id
                            ).length;
                            const followingCount = allFollows.filter(
                              (f) => f.followerId === creator.id
                            ).length;

                            return (
                              <div
                                key={creator.id}
                                className={`rounded-3xl overflow-hidden border transition-all flex flex-col justify-between ${
                                  lightTheme
                                    ? "bg-white border-purple-200"
                                    : "bg-[#161822] border-white/10 hover:border-pink-500/40"
                                }`}
                              >
                                <div>
                                  <div
                                    onClick={() => setViewingCreator(creator)}
                                    className="relative h-28 bg-gradient-to-r from-pink-500/30 to-purple-600/30 cursor-pointer"
                                  >
                                    {creator.headerUrl && (
                                      <img
                                        src={creator.headerUrl}
                                        alt={creator.displayName}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#161822] via-transparent to-transparent" />
                                  </div>

                                  <div className="px-5 pb-5 -mt-8 relative z-10 space-y-3">
                                    <div className="flex items-end justify-between gap-2">
                                      <img
                                        onClick={() =>
                                          setViewingCreator(creator)
                                        }
                                        src={creator.avatarUrl}
                                        alt={creator.displayName}
                                        className="w-16 h-16 rounded-full object-cover ring-4 ring-[#161822] cursor-pointer"
                                      />
                                      <div className="flex items-center gap-1.5">
                                        {creator.id !== activeUserId && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleStartMessageWithUser(
                                                creator
                                              )
                                            }
                                            title={`Message @${creator.username}`}
                                            className="p-2 rounded-full bg-white/5 hover:bg-pink-500/20 border border-white/15 text-pink-400"
                                          >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleToggleFollow(creator.id)
                                          }
                                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            isFollowing
                                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                              : "bg-pink-500 hover:bg-pink-600 text-white"
                                          }`}
                                        >
                                          {isFollowing
                                            ? "Following"
                                            : "+ Follow"}
                                        </button>
                                      </div>
                                    </div>

                                    <div
                                      onClick={() => setViewingCreator(creator)}
                                      className="cursor-pointer"
                                    >
                                      <h3 className="font-bold text-base flex items-center gap-1.5 hover:text-pink-400">
                                        {creator.displayName}
                                        {creator.isVerified && (
                                          <BadgeCheck className="w-4 h-4 text-pink-400" />
                                        )}
                                      </h3>
                                      <p className="text-xs text-zinc-400">
                                        @{creator.username} • {creator.niche}
                                      </p>
                                    </div>

                                    <p className="text-xs text-zinc-300 line-clamp-2">
                                      {creator.bio}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs pt-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setFollowModalState({
                                            user: creator,
                                            tab: "following",
                                          })
                                        }
                                        className="hover:underline"
                                      >
                                        <strong className="text-white">
                                          {followingCount}
                                        </strong>{" "}
                                        <span className="text-zinc-400">
                                          Following
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setFollowModalState({
                                            user: creator,
                                            tab: "followers",
                                          })
                                        }
                                        className="hover:underline"
                                      >
                                        <strong className="text-white">
                                          {followersCount}
                                        </strong>{" "}
                                        <span className="text-zinc-400">
                                          Followers
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="px-5 py-3 bg-black/20 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
                                  <span>
                                    {creator._count?.createdPosts ?? 0} works •{" "}
                                    {creator._count?.albums ?? 0} albums
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setViewingCreator(creator)}
                                    className="text-pink-400 font-semibold hover:underline"
                                  >
                                    View Profile →
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {totalCreatorPages > 1 && (
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10 text-xs">
                            <span className="text-zinc-400">
                              Page <strong>{safeCreatorPage}</strong> of{" "}
                              <strong>{totalCreatorPages}</strong> (
                              {filteredCreators.length} creators)
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={safeCreatorPage <= 1}
                                onClick={() =>
                                  setCreatorsPage((p) => Math.max(1, p - 1))
                                }
                                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 disabled:opacity-30 font-bold"
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                disabled={safeCreatorPage >= totalCreatorPages}
                                onClick={() =>
                                  setCreatorsPage((p) =>
                                    Math.min(totalCreatorPages, p + 1)
                                  )
                                }
                                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 disabled:opacity-30 font-bold"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ==================== TAGS DIRECTORY (SFW + 18+ PAGINATED) ==================== */}
              {activeNav === "tags" && (
                <div className="space-y-6 pb-12">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-extrabold flex items-center gap-2">
                        <Hash className="w-6 h-6 text-pink-400" />
                        Booru Tag Directory
                      </h1>
                      <p className="text-xs sm:text-sm text-zinc-400">
                        Combine multiple booru tags with{" "}
                        <strong>+ Include</strong> or filter out tags with{" "}
                        <strong>- Exclude</strong>.
                      </p>
                    </div>

                    <input
                      type="text"
                      value={tagSearchInput}
                      onChange={(e) => {
                        setTagSearchInput(e.target.value);
                        setTagsPage(1);
                      }}
                      placeholder="Filter tags by name..."
                      className="px-4 py-2 rounded-2xl bg-black/40 border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[{ id: "all", label: "All Tags" }, ...TAG_CATEGORIES].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setTagCategoryFilter(cat.id);
                          setTagsPage(1);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          tagCategoryFilter === cat.id
                            ? cat.id === "content"
                              ? "bg-rose-500 text-white"
                              : "bg-pink-500 text-white"
                            : "bg-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const filteredTags = tags.filter(
                      (t) =>
                        (tagCategoryFilter === "all" ||
                          t.category === tagCategoryFilter) &&
                        (t.name
                          .toLowerCase()
                          .includes(tagSearchInput.toLowerCase()) ||
                          t.displayName
                            .toLowerCase()
                            .includes(tagSearchInput.toLowerCase()))
                    );
                    const perPage = 12;
                    const totalTagPages = Math.max(
                      1,
                      Math.ceil(filteredTags.length / perPage)
                    );
                    const safeTagPage = Math.min(tagsPage, totalTagPages);
                    const pagedTags = filteredTags.slice(
                      (safeTagPage - 1) * perPage,
                      safeTagPage * perPage
                    );

                    return (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {pagedTags.map((tag) => {
                            const isInc = includedTags.includes(tag.name);
                            const isExc = excludedTags.includes(tag.name);
                            const style = getTagCategoryStyle(tag.category);
                            return (
                              <div
                                key={tag.id}
                                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                                  lightTheme
                                    ? "bg-white border-purple-200"
                                    : `${style.bg} ${style.border}`
                                }`}
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2 min-w-0">
                                    <span
                                      className={`font-bold text-sm truncate min-w-0 ${style.text}`}
                                      title={`#${tag.name}`}
                                    >
                                      #{tag.name}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 ${style.badge}`}
                                    >
                                      {tag.category}
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold text-zinc-200">
                                    {tag.displayName}
                                  </p>
                                  <p className="text-xs text-zinc-400">
                                    {tag.description}
                                  </p>
                                </div>

                                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                                  <span className="text-[11px] text-zinc-400">
                                    {tag._count?.posts ?? tag.usageCount} posts
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => toggleIncludeTag(tag.name)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                                        isInc
                                          ? "bg-pink-500 text-white"
                                          : "bg-pink-500/15 text-pink-300 hover:bg-pink-500/25"
                                      }`}
                                    >
                                      <Plus className="w-3 h-3" /> Include
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleExcludeTag(tag.name)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                                        isExc
                                          ? "bg-rose-500 text-white"
                                          : "bg-white/5 text-zinc-400 hover:bg-rose-500/20 hover:text-rose-300"
                                      }`}
                                    >
                                      <Minus className="w-3 h-3" /> Exclude
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {totalTagPages > 1 && (
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10 text-xs">
                            <span className="text-zinc-400">
                              Page <strong>{safeTagPage}</strong> of{" "}
                              <strong>{totalTagPages}</strong> (
                              {filteredTags.length} booru tags)
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={safeTagPage <= 1}
                                onClick={() =>
                                  setTagsPage((p) => Math.max(1, p - 1))
                                }
                                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 disabled:opacity-30 font-bold"
                              >
                                Prev
                              </button>
                              {Array.from({ length: Math.min(7, totalTagPages) }).map(
                                (_, idx) => {
                                  const pageNum = Math.max(1, Math.min(safeTagPage - 3, totalTagPages - 6)) + idx;
                                  return (
                                    <button
                                      key={pageNum}
                                      type="button"
                                      onClick={() => setTagsPage(pageNum)}
                                      className={`w-8 h-8 rounded-xl font-bold ${
                                        safeTagPage === pageNum
                                          ? "bg-pink-500 text-white"
                                          : "bg-white/5 text-zinc-400"
                                      }`}
                                    >
                                      {pageNum}
                                    </button>
                                  );
                                }
                              )}
                              <button
                                type="button"
                                disabled={safeTagPage >= totalTagPages}
                                onClick={() =>
                                  setTagsPage((p) =>
                                    Math.min(totalTagPages, p + 1)
                                  )
                                }
                                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 disabled:opacity-30 font-bold"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ==================== COLLECTIONS PAGE ==================== */}
              {activeNav === "collections" && (
                <CollectionsView
                  collections={collections}
                  currentUser={currentUser}
                  lightTheme={lightTheme}
                  onSelectPost={handleOpenPost}
                  onSelectAlbum={(a) => setViewingAlbum(a)}
                  onSelectCreator={handleOpenCreator}
                  onCreateCollection={handleCreateCollection}
                  onTogglePrivacy={handleToggleCollectionPrivacy}
                  onRemoveItem={handleRemoveCollectionItem}
                  onReorderItem={handleReorderCollectionItem}
                  onShare={handleShare}
                />
              )}

              {/* ==================== UPLOAD PAGE ==================== */}
              {activeNav === "upload" && !currentUser && <a href="/signin" className="text-pink-400">Sign in to upload your work</a>}
              {activeNav === "upload" && currentUser && (
                <UploadView
                  currentUser={currentUser}
                  users={users}
                  albums={albums}
                  tags={tags}
                  lightTheme={lightTheme}
                  onPostCreated={async (newPost) => {
                    showToast(`Published "${newPost.title}"!`);
                    await loadBootstrap(activeUserId);
                    await loadPosts(false);
                    router.push(`/post/${newPost.id}`);
                  }}
                />
              )}
            </>
          )}
        </main>
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
                <button
                  type="button"
                  onClick={() => {
                    setViewingCreator(null);
                    setActiveNav("home");
                    setRailOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "home" && !viewingCreator
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Home Feed</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewingCreator(null);
                    setActiveNav("explore");
                    setRailOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "explore" && !viewingCreator
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore</span>
                </button>

                <a
                  href="/comics"
                  onClick={() => setRailOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-300 hover:bg-white/5 transition-all"
                >
                  <BookOpen className="w-4 h-4 text-pink-400" />
                  <span>Comics & Manga</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setViewingCreator(null);
                    setActiveNav("upload");
                    setRailOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "upload" && !viewingCreator
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <UploadIcon className="w-4 h-4" />
                  <span>Upload Work</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewingCreator(null);
                    setActiveNav("messages");
                    setRailOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "messages" && !viewingCreator
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-4 h-4" />
                    <span>Messages</span>
                  </div>
                  {unreadMessagesCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-purple-500 text-white text-[10px] font-bold">
                      {unreadMessagesCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewingCreator(null);
                    setActiveNav("notifications");
                    setRailOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "notifications" && !viewingCreator
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </div>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[10px] font-bold">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewingCreator(null);
                    setActiveNav("tags");
                    setRailOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "tags" && !viewingCreator
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span>Tags Directory</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewingCreator(null);
                    setActiveNav("creators");
                    setRailOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "creators" && !viewingCreator
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Creators</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewingCreator(null);
                    setActiveNav("collections");
                    setRailOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    activeNav === "collections" && !viewingCreator
                      ? "bg-pink-600 text-white"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Saved Collections</span>
                </button>

                <div className="pt-2 border-t border-white/10 space-y-1">
                  <a
                    href={`/user/${currentUser?.username || "byron"}`}
                    onClick={() => setRailOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-300 hover:bg-white/5"
                  >
                    <UserIcon className="w-4 h-4 text-purple-400" />
                    <span>My User Page</span>
                  </a>

                  <a
                    href="/settings"
                    onClick={() => setRailOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-300 hover:bg-white/5"
                  >
                    <Settings className="w-4 h-4 text-zinc-400" />
                    <span>Settings</span>
                  </a>

                  {currentUser?.role === "admin" && (
                    <a
                      href="/admin"
                      onClick={() => setRailOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-300 bg-rose-500/10 hover:bg-rose-500/20"
                    >
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>Admin Control Center</span>
                    </a>
                  )}
                </div>
              </nav>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-white/10">
              <a
                href="/signin"
                onClick={() => setRailOpen(false)}
                className="w-full py-2 px-3 rounded-xl bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Switch / Sign In</span>
              </a>
            </div>
          </aside>
        </div>
      )}

      {/* =========================================================================
          AVATAR ICON MODAL (Contains all things that don't fit on the 5-item mobile nav)
      ========================================================================= */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-end sm:justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowAvatarModal(false)}
          />

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
                        <ShieldCheck className="w-3 h-3 text-rose-400" /> Admin
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
              <button
                type="button"
                onClick={() => {
                  setViewingCreator(null);
                  setActiveNav("notifications");
                  setShowAvatarModal(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-pink-400" />
                  <span>Notifications & Alerts</span>
                </div>
                {unreadNotificationsCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[10px] font-bold">
                    {unreadNotificationsCount}
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                )}
              </button>

              {currentUser && (
                <a
                  href={`/user/${currentUser.username}`}
                  onClick={() => setShowAvatarModal(false)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <UserIcon className="w-4 h-4 text-purple-400" />
                    <span>My User Page</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </a>
              )}

              <a
                href="/comics?tab=dashboard"
                onClick={() => setShowAvatarModal(false)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-pink-400" />
                  <span>Manga Creator Studio</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setViewingCreator(null);
                  setActiveNav("collections");
                  setShowAvatarModal(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span>My Saved Collections</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewingCreator(null);
                  setActiveNav("tags");
                  setShowAvatarModal(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-cyan-400" />
                  <span>Tags & Taxonomy</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewingCreator(null);
                  setActiveNav("creators");
                  setShowAvatarModal(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Top Creators</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              <a
                href="/settings"
                onClick={() => setShowAvatarModal(false)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <span>Account & Privacy Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </a>

              {currentUser?.role === "admin" && (
                <a
                  href="/admin"
                  onClick={() => setShowAvatarModal(false)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Admin Dashboard</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400" />
                </a>
              )}

            </div>

            {/* 1-Click Access to All 3 Accounts */}
            <div className="pt-2 border-t border-white/10">
              <QuickUserSwitcher
                currentUsername={currentUser?.username}
                onSwitched={(u) => {
                  setCurrentUser(u);
                  setActiveUserId(u.id);
                  setShowAvatarModal(false);
                  loadBootstrap(u.id);
                  loadPosts(false);
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
      <nav
        aria-label="Mobile navigation"
        className={`md:hidden fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-xl px-2 py-1.5 grid grid-cols-5 justify-items-center ${
          lightTheme
            ? "bg-white/95 border-purple-200"
            : "bg-[#0d0f18]/95 border-white/10"
        }`}
      >
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => {
            setViewingCreator(null);
            setActiveNav("home");
          }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-colors ${
            activeNav === "home" && !viewingCreator ? "text-pink-400 font-extrabold" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>

        {/* 2. Explore */}
        <button
          type="button"
          onClick={() => {
            setViewingCreator(null);
            setActiveNav("explore");
          }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-colors ${
            activeNav === "explore" && !viewingCreator ? "text-pink-400 font-extrabold" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Explore</span>
        </button>

        {/* 3. Upload Work (Prominent Center Action) */}
        <button
          type="button"
          onClick={() => {
            setViewingCreator(null);
            setActiveNav("upload");
          }}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold text-white transition-transform hover:scale-105"
        >
          <div className="w-8 h-8 -mt-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <UploadIcon className="w-4 h-4 text-white" />
          </div>
          <span>Upload</span>
        </button>

        {/* 4. Messages */}
        <button
          type="button"
          onClick={() => {
            setViewingCreator(null);
            setActiveNav("messages");
          }}
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-colors ${
            activeNav === "messages" && !viewingCreator ? "text-pink-400 font-extrabold" : "text-zinc-400 hover:text-white"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Messages</span>
          {unreadMessagesCount > 0 && (
            <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-purple-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadMessagesCount}
            </span>
          )}
        </button>

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
        onSelectTheme={(t) => {
          setCurrentTheme(t);
          setLightTheme(t === "sakura");
        }}
      />

      {/* Modals: Album Viewer, Save to Collection, Report, Followers/Following, Twitter Edit Profile */}
      <AlbumViewerModal
        album={viewingAlbum}
        allPosts={posts}
        lightTheme={lightTheme}
        onClose={() => setViewingAlbum(null)}
        onSelectPost={handleOpenPost}
        onSelectCreator={handleOpenCreator}
        onSaveAlbumToCollection={(a) => setSaveTarget({ album: a })}
        onShare={handleShare}
      />

      <SaveToCollectionModal
        isOpen={Boolean(saveTarget)}
        targetPost={saveTarget?.post}
        targetAlbum={saveTarget?.album}
        targetCreator={saveTarget?.creator}
        collections={collections}
        currentUserId={activeUserId}
        lightTheme={lightTheme}
        onClose={() => setSaveTarget(null)}
        onAddToCollection={handleAddToCollection}
        onCreateCollection={handleCreateCollection}
      />

      <ReportModal
        isOpen={Boolean(reportTarget)}
        targetPost={reportTarget?.post}
        targetUser={reportTarget?.user}
        lightTheme={lightTheme}
        onClose={() => setReportTarget(null)}
        onSubmitReport={handleSubmitReport}
      />

      <FollowListModal
        isOpen={Boolean(followModalState)}
        targetUser={followModalState?.user || null}
        initialTab={followModalState?.tab || "followers"}
        allFollows={allFollows}
        currentUserFollowingIds={followingIds}
        currentUserId={activeUserId}
        lightTheme={lightTheme}
        onClose={() => setFollowModalState(null)}
        onSelectUser={(u) => setViewingCreator(u)}
        onToggleFollow={handleToggleFollow}
        onStartMessage={handleStartMessageWithUser}
      />

      <TwitterEditProfileModal
        isOpen={isEditProfileOpen}
        user={currentUser}
        lightTheme={lightTheme}
        onClose={() => setIsEditProfileOpen(false)}
        onSaveProfile={handleUpdateProfile}
      />
    </div>
  );
}
