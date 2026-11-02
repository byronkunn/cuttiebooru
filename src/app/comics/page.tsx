"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import JSZip from "jszip";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Plus,
  Share2,
  Bookmark,
  Layers,
  Upload,
  X,
  CheckCircle2,
  Trash2,
  Columns,
  Clock,
  Play,
  Flame,
  Send,
  MessageSquare,
  FileArchive,
} from "lucide-react";
import {
  ComicSeriesItem,
  ComicChapterItem,
  ComicReadingProgress,
  ContinueReadingItem,
  ChapterCommentItem,
  User,
} from "@/types/cuttiebooru";
import { SiteShell } from "@/components/SiteShell";

const GENRE_OPTIONS = [
  "All",
  "Ecchi",
  "Fantasy",
  "Romance",
  "Cyberpunk",
  "Sci-Fi",
  "Action",
  "Slice of Life",
  "Comedy",
  "Supernatural",
  "Gothic",
];

function ComicsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Core Data
  const [seriesList, setSeriesList] = useState<ComicSeriesItem[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<ComicSeriesItem | null>(null);
  const [activeChapter, setActiveChapter] = useState<ComicChapterItem | null>(null);
  const [readingProgress, setReadingProgress] = useState<ComicReadingProgress | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [continueReading, setContinueReading] = useState<ContinueReadingItem[]>([]);

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<"browse" | "dashboard">("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("All");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"updated" | "follows" | "title">("updated");

  // Reader State
  const [currentPage, setCurrentPage] = useState(0);
  const [readingMode, setReadingMode] = useState<"rtl" | "ltr" | "vertical" | "spread">("rtl");

  // Chapter Discussion & Reactions
  const [chapterComments, setChapterComments] = useState<ChapterCommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [selectedReaction, setSelectedReaction] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Archive & File Upload Progress
  const [uploadStatusText, setUploadStatusText] = useState("");

  // Modals & Forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // Create Series Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newGenres, setNewGenres] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newDirection, setNewDirection] = useState<"rtl" | "ltr" | "vertical">("rtl");
  const [newStatus, setNewStatus] = useState<"ongoing" | "completed">("ongoing");
  const [newCoverUrl, setNewCoverUrl] = useState("");
  const [seriesPermission, setSeriesPermission] = useState(true);

  // Add Chapter Form State
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapterPages, setChapterPages] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [chapterPermission, setChapterPermission] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Load Session User
  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setCurrentUser(d.user);
      })
      .catch(() => {});
  }, []);

  // Load Series List
  const loadSeriesList = useCallback(async () => {
    try {
      const res = await fetch("/api/comics");
      const data = await res.json();
      if (res.ok) {
        if (data.series) setSeriesList(data.series);
        if (data.continueReading) setContinueReading(data.continueReading);
      }
    } catch {
      setErrorMsg("Failed to load manga and comic series.");
    }
  }, []);

  useEffect(() => {
    loadSeriesList();
  }, [loadSeriesList]);

  // Load Single Series
  const loadSeriesDetail = useCallback(async (seriesId: string) => {
    try {
      const res = await fetch(`/api/comics?id=${encodeURIComponent(seriesId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Series not found");
      setSelectedSeries(data.series);
      setIsFollowing(!!data.following);
      setReadingProgress(data.progress || null);
      if (data.series.direction) {
        setReadingMode(data.series.direction as "rtl" | "ltr" | "vertical");
      }
      return data;
    } catch (e) {
      setErrorMsg((e as Error).message);
      return null;
    }
  }, []);

  const handleSelectSeries = useCallback((s: ComicSeriesItem) => {
    setSelectedSeries(s);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", `/comics?series=${s.id}`);
    }
    loadSeriesDetail(s.id);
  }, [loadSeriesDetail]);

  const urlSeriesId = searchParams.get("series");
  const urlChapterId = searchParams.get("chapter");

  // Parse URL Search Parameters (e.g. ?series=id&chapter=id)
  useEffect(() => {
    if (urlSeriesId) {
      loadSeriesDetail(urlSeriesId).then((data) => {
        if (data?.series && urlChapterId) {
          const ch = data.series.chapters?.find((c: ComicChapterItem) => c.id === urlChapterId);
          if (ch) {
            setActiveChapter(ch);
            setCurrentPage(0);
          }
        }
      });
    } else {
      setSelectedSeries(null);
      setActiveChapter(null);
    }
  }, [urlSeriesId, urlChapterId, loadSeriesDetail]);

  // API Call Helper
  const callComicsApi = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/comics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Operation failed");
    return json;
  };

  // Upload Media Helper (Uses /api/upload)
  const handleUploadFile = async (file: File, isCover: boolean) => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", isCover ? "image" : "comic");

    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url as string;
  };

  // Upload Multiple Page Images or .ZIP / .CBZ Archives
  const handlePageFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingFiles(true);
    setUploadStatusText("Processing uploaded files...");
    setErrorMsg("");

    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const nameLower = file.name.toLowerCase();
        // Handle .ZIP or .CBZ Comic Archive
        if (nameLower.endsWith(".zip") || nameLower.endsWith(".cbz")) {
          setUploadStatusText(`Unpacking ${file.name}...`);
          const zip = await JSZip.loadAsync(file);
          const entries: { name: string; obj: JSZip.JSZipObject }[] = [];
          zip.forEach((relativePath, zipEntry) => {
            if (
              !zipEntry.dir &&
              !relativePath.startsWith("__MACOSX") &&
              !relativePath.startsWith(".") &&
              /\.(png|jpe?g|webp|gif|avif)$/i.test(relativePath)
            ) {
              entries.push({ name: relativePath, obj: zipEntry });
            }
          });

          if (entries.length === 0) {
            throw new Error(`No image files found inside ${file.name}.`);
          }

          // Sort pages in natural numerical order (p1, p2, p10, etc.)
          entries.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
          );

          // Auto-suggest chapter title and number if empty
          if (!chapterTitle) {
            const cleanName = file.name.replace(/\.(zip|cbz)$/i, "").replace(/[_-]/g, " ");
            const matchNum = cleanName.match(/(?:ch(?:apter)?\.?\s*|#)(\d+)/i);
            if (matchNum && matchNum[1]) {
              setChapterNumber(parseInt(matchNum[1], 10));
            }
            setChapterTitle(cleanName);
          }

          for (let i = 0; i < entries.length; i++) {
            setUploadStatusText(`Extracting & uploading page ${i + 1} of ${entries.length}...`);
            const entry = entries[i];
            const blob = await entry.obj.async("blob");
            const ext = entry.name.split(".").pop()?.toLowerCase() || "jpg";
            const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
            const pageFile = new File([blob], `page_${i + 1}.${ext}`, { type: mime });
            const url = await handleUploadFile(pageFile, false);
            urls.push(url);
          }
        } else if (file.type.startsWith("image/")) {
          setUploadStatusText(`Uploading ${file.name}...`);
          const url = await handleUploadFile(file, false);
          urls.push(url);
        } else {
          throw new Error("Only images (PNG, JPG, WEBP) or comic archives (.ZIP, .CBZ) are allowed.");
        }
      }
      setChapterPages((prev) => [...prev, ...urls]);
      showToast(`Added ${urls.length} page(s) successfully!`);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setUploadingFiles(false);
      setUploadStatusText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Upload Cover Image
  const handleCoverFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await handleUploadFile(file, true);
      setNewCoverUrl(url);
      showToast("Cover image uploaded");
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  // Drag-and-drop page reordering
  const handleReorderPages = (fromIdx: number, toIdx: number) => {
    setChapterPages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return updated;
    });
  };

  // Open Chapter in Reader
  const openChapter = (chap: ComicChapterItem, startPage = 0) => {
    setActiveChapter(chap);
    setChapterComments(chap.comments || []);
    setCommentText("");
    setSelectedReaction("");
    setCurrentPage(Math.max(0, Math.min(startPage, chap.pages.length - 1)));
    if (selectedSeries) {
      window.history.pushState(
        {},
        "",
        `/comics?series=${encodeURIComponent(selectedSeries.id)}&chapter=${encodeURIComponent(chap.id)}`
      );
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Post Chapter Comment
  const handlePostChapterComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChapter) return;
    if (!currentUser) {
      router.push("/signin");
      return;
    }
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch("/api/comics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chapter_comment",
          chapterId: activeChapter.id,
          content: commentText.trim(),
          reaction: selectedReaction,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post comment");
      setChapterComments((prev) => [data.comment, ...prev]);
      setCommentText("");
      setSelectedReaction("");
      showToast("Comment posted!");
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Close Reader back to Series
  const closeReader = useCallback(() => {
    setActiveChapter(null);
    if (selectedSeries) {
      window.history.pushState(
        {},
        "",
        `/comics?series=${encodeURIComponent(selectedSeries.id)}`
      );
    }
  }, [selectedSeries]);

  // Navigate to Page & Save Progress
  const handleGoToPage = useCallback((newPage: number) => {
    if (!activeChapter) return;
    const bounded = Math.max(0, Math.min(newPage, activeChapter.pages.length - 1));
    setCurrentPage(bounded);

    if (readingMode === "vertical") {
      const el = document.querySelector(`[data-page-index="${bounded}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeChapter, readingMode]);

  // Auto-Save Reading Progress
  useEffect(() => {
    if (!activeChapter || !selectedSeries || !currentUser || !activeChapter.published) return;
    const timer = setTimeout(() => {
      callComicsApi({
        action: "progress",
        seriesId: selectedSeries.id,
        chapterId: activeChapter.id,
        page: currentPage,
      }).catch(() => {});
    }, 400);

    return () => clearTimeout(timer);
  }, [activeChapter, selectedSeries, currentUser, currentPage]);

  // Vertical Scroll IntersectionObserver (For Webcomics)
  useEffect(() => {
    if (!activeChapter || readingMode !== "vertical") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const idx = Number((visible.target as HTMLElement).dataset.pageIndex);
          if (!isNaN(idx)) setCurrentPage(idx);
        }
      },
      { rootMargin: "-10% 0px -50% 0px", threshold: [0.1, 0.5] }
    );

    const nodes = document.querySelectorAll("[data-page-index]");
    nodes.forEach((n) => observer.observe(n));

    return () => observer.disconnect();
  }, [activeChapter, readingMode]);

  // Keyboard Navigation for Reader
  useEffect(() => {
    if (!activeChapter) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape") {
        closeReader();
      } else if (readingMode === "spread") {
        const isRtl = selectedSeries?.direction === "rtl";
        if (isRtl) {
          if (e.key === "ArrowLeft") handleGoToPage(currentPage === 0 ? 1 : currentPage + 2);
          else if (e.key === "ArrowRight") handleGoToPage(currentPage <= 2 ? 0 : currentPage - 2);
        } else {
          if (e.key === "ArrowRight" || e.key === "PageDown") handleGoToPage(currentPage === 0 ? 1 : currentPage + 2);
          else if (e.key === "ArrowLeft" || e.key === "PageUp") handleGoToPage(currentPage <= 2 ? 0 : currentPage - 2);
        }
      } else if (readingMode === "rtl") {
        // RTL Manga: Left Arrow goes forward, Right Arrow goes backward
        if (e.key === "ArrowLeft") handleGoToPage(currentPage + 1);
        else if (e.key === "ArrowRight") handleGoToPage(currentPage - 1);
      } else {
        // LTR Comic & Vertical: Right Arrow goes forward, Left Arrow goes backward
        if (e.key === "ArrowRight" || e.key === "PageDown") handleGoToPage(currentPage + 1);
        else if (e.key === "ArrowLeft" || e.key === "PageUp") handleGoToPage(currentPage - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeChapter, currentPage, readingMode, closeReader, handleGoToPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle Follow Series
  const handleToggleFollow = async () => {
    if (!selectedSeries) return;
    if (!currentUser) {
      router.push("/signin");
      return;
    }
    try {
      const res = await callComicsApi({
        action: "follow",
        seriesId: selectedSeries.id,
      });
      setIsFollowing(res.following);
      showToast(res.following ? "Following series! You will be notified of new chapters." : "Unfollowed series.");
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  // Submit New Series
  const handleCreateSeriesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCoverUrl) {
      setErrorMsg("Please provide a title and upload a cover image.");
      return;
    }
    setBusy(true);
    setErrorMsg("");

    try {
      const res = await callComicsApi({
        action: "create_series",
        title: newTitle,
        description: newDescription,
        genres: newGenres,
        tags: newTags,
        direction: newDirection,
        status: newStatus,
        coverUrl: newCoverUrl,
        permissionConfirmed: seriesPermission,
      });

      setShowCreateModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewCoverUrl("");
      showToast("Series created successfully!");
      await loadSeriesList();
      if (res.series?.id) {
        await loadSeriesDetail(res.series.id);
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Submit New Chapter (Draft or Publish)
  const handleCreateChapterSubmit = async (isPublish: boolean) => {
    if (!selectedSeries) return;
    if (!chapterTitle.trim() || chapterPages.length === 0) {
      setErrorMsg("Please provide a chapter title and add at least one page image.");
      return;
    }
    setBusy(true);
    setErrorMsg("");

    try {
      await callComicsApi({
        action: "create_chapter",
        seriesId: selectedSeries.id,
        title: chapterTitle,
        number: chapterNumber,
        pages: chapterPages,
        published: isPublish,
        permissionConfirmed: chapterPermission,
      });

      setShowAddChapterModal(false);
      setChapterTitle("");
      setChapterPages([]);
      showToast(isPublish ? "Chapter published live!" : "Draft chapter saved!");
      await loadSeriesDetail(selectedSeries.id);
      await loadSeriesList();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Publish a Draft Chapter
  const handlePublishDraft = async (chapterId: string) => {
    if (!selectedSeries) return;
    try {
      await callComicsApi({
        action: "publish_chapter",
        seriesId: selectedSeries.id,
        chapterId,
      });
      showToast("Draft published successfully!");
      await loadSeriesDetail(selectedSeries.id);
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  // Delete a Chapter
  const handleDeleteChapter = async (chapterId: string) => {
    if (!selectedSeries || !window.confirm("Are you sure you want to delete this chapter?")) return;
    try {
      await callComicsApi({
        action: "delete_chapter",
        seriesId: selectedSeries.id,
        chapterId,
      });
      showToast("Chapter deleted.");
      await loadSeriesDetail(selectedSeries.id);
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  // Share Link to Clipboard
  const handleShareLink = (url: string, title: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast(`Link to "${title}" copied to clipboard!`);
    }
  };

  // Filtered and Sorted Series
  const filteredSeries = useMemo(() => {
    return seriesList
      .filter((s) => {
        const matchesSearch =
          !searchQuery.trim() ||
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.creator?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.creator?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.tags?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesGenre =
          genreFilter === "All" ||
          s.genres?.toLowerCase().includes(genreFilter.toLowerCase());

        const matchesDirection =
          directionFilter === "all" || s.direction === directionFilter;

        const matchesStatus =
          statusFilter === "all" || s.status === statusFilter;

        return matchesSearch && matchesGenre && matchesDirection && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "follows") {
          return (b._count?.follows ?? 0) - (a._count?.follows ?? 0);
        }
        if (sortBy === "title") {
          return a.title.localeCompare(b.title);
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [seriesList, searchQuery, genreFilter, directionFilter, statusFilter, sortBy]);

  // User's Owned Series (For Creator Dashboard)
  const mySeries = useMemo(() => {
    if (!currentUser) return [];
    return seriesList.filter(
      (s) => s.creatorId === currentUser.id || currentUser.role === "admin"
    );
  }, [seriesList, currentUser]);

  const isOwnerOrAdmin =
    !!currentUser &&
    (selectedSeries?.creatorId === currentUser.id || currentUser.role === "admin");

  return (
    <SiteShell activeNav="comics" currentUser={currentUser}>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/20 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-pink-200" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Manga & Comics Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Manga & Comics</span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Read manga, webtoons, and doujin series with RTL/LTR/Vertical reading direction
              </p>
            </div>
          </div>

          {/* Tab Controls & Create Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("browse");
                  setSelectedSeries(null);
                  setActiveChapter(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "browse" && !selectedSeries
                    ? "bg-pink-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Browse
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("dashboard");
                  setSelectedSeries(null);
                  setActiveChapter(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  activeTab === "dashboard"
                    ? "bg-purple-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Creator Studio
                {mySeries.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                    {mySeries.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!currentUser) router.push("/signin");
                else setShowCreateModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-pink-500/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create Series</span>
            </button>
          </div>
        </div>
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg("")}
              className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =========================================================================
            VIEW 1: MANGA / COMIC READER (Full Screen / Immersion Mode)
        ========================================================================= */}
        {activeChapter && selectedSeries ? (
          <div className="space-y-4 animate-fade-in">
            {/* Sticky Reader Toolbar */}
            <div className="sticky top-16 z-30 p-3 rounded-2xl bg-[#151722]/95 backdrop-blur-md border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeReader}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Series</span>
                </button>

                <div className="hidden sm:block text-xs font-semibold text-zinc-400 truncate max-w-xs">
                  {selectedSeries.title}
                </div>
              </div>

              {/* Chapter Selector Dropdown */}
              <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
                <select
                  value={activeChapter.id}
                  onChange={(e) => {
                    const target = (selectedSeries.chapters || []).find((c) => c.id === e.target.value);
                    if (target) openChapter(target, 0);
                  }}
                  className="min-w-0 max-w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                >
                  {(selectedSeries.chapters || []).map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      Ch. {ch.number}: {ch.title} {!ch.published ? "(Draft)" : ""}
                    </option>
                  ))}
                </select>

                {/* Reading Mode Switcher */}
                <div className="flex flex-wrap items-center p-0.5 rounded-xl bg-black/40 border border-white/10 text-[11px] font-bold max-w-full">
                  <button
                    type="button"
                    onClick={() => setReadingMode("rtl")}
                    title="Right-to-Left (Manga style)"
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      readingMode === "rtl"
                        ? "bg-pink-600 text-white shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    RTL (Manga)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadingMode("ltr")}
                    title="Left-to-Right (Western Comic style)"
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      readingMode === "ltr"
                        ? "bg-purple-600 text-white shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    LTR (Comic)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadingMode("spread")}
                    title="Dual-page spread (Tankōbon physical manga style)"
                    className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                      readingMode === "spread"
                        ? "bg-amber-600 text-white shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Columns className="w-3 h-3" />
                    <span>Spread</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadingMode("vertical")}
                    title="Vertical continuous scroll (Webcomic style)"
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      readingMode === "vertical"
                        ? "bg-emerald-600 text-white shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Vertical (Webtoon)
                  </button>
                </div>
              </div>

              {/* Page Counter & Share */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-black/60 border border-white/10 text-xs font-bold text-zinc-300">
                  {readingMode === "spread" && currentPage > 0 ? (
                    <>
                      Pages <strong className="text-pink-400">{currentPage + 1}-{Math.min(currentPage + 2, activeChapter.pages.length)}</strong> / {activeChapter.pages.length}
                    </>
                  ) : (
                    <>
                      Page <strong className="text-pink-400">{currentPage + 1}</strong> / {activeChapter.pages.length}
                    </>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    handleShareLink(
                      `${window.location.origin}/comics?series=${selectedSeries.id}&chapter=${activeChapter.id}`,
                      `${selectedSeries.title} - ${activeChapter.title}`
                    )
                  }
                  title="Share chapter"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Reader Canvas Container */}
            <div className="min-h-[70vh] rounded-3xl bg-[#090b10] border border-white/[0.08] p-2 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
              {readingMode === "vertical" ? (
                /* Vertical Continuous Webcomic Mode */
                <div className="w-full max-w-3xl space-y-2 py-4">
                  {activeChapter.pages.map((p, idx) => (
                    <div
                      key={p.id}
                      data-page-index={idx}
                      className="w-full rounded-2xl overflow-hidden bg-black shadow-lg"
                    >
                      <img
                        src={p.url}
                        alt={`Page ${idx + 1}`}
                        loading={idx > 2 ? "lazy" : "eager"}
                        className="w-full h-auto object-contain block mx-auto"
                      />
                    </div>
                  ))}
                </div>
              ) : readingMode === "spread" ? (
                /* Dual-Page Spread View (Tankōbon physical manga style) */
                <div className="relative w-full max-w-5xl flex items-center justify-center select-none py-2">
                  {currentPage === 0 ? (
                    /* Single Cover Page */
                    <div className="relative max-h-[82vh] flex flex-col items-center justify-center">
                      <span className="text-[11px] font-bold text-pink-400 mb-1.5 uppercase tracking-wider">
                        Cover Page
                      </span>
                      <img
                        src={activeChapter.pages[0]?.url}
                        alt="Cover Page"
                        className="max-h-[78vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
                      />
                      <div
                        onClick={() => handleGoToPage(1)}
                        title="Turn to first spread"
                        className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-15 bg-pink-500/20 rounded-2xl transition-opacity"
                      />
                    </div>
                  ) : (
                    /* Two-Page Spread Pair */
                    <div className="flex items-center justify-center gap-1 sm:gap-2 max-h-[82vh] w-full">
                      {(() => {
                        const isRtl = selectedSeries.direction === "rtl";
                        const rightIdx = isRtl ? currentPage : currentPage + 1;
                        const leftIdx = isRtl ? currentPage + 1 : currentPage;
                        const leftPage = activeChapter.pages[leftIdx];
                        const rightPage = activeChapter.pages[rightIdx];

                        return (
                          <>
                            {/* Left Page */}
                            <div className="relative flex-1 flex flex-col items-end justify-center max-h-[80vh]">
                              {leftPage ? (
                                <>
                                  <img
                                    src={leftPage.url}
                                    alt={`Page ${leftIdx + 1}`}
                                    className="max-h-[78vh] w-auto max-w-full object-contain rounded-l-2xl shadow-xl border-y border-l border-white/10"
                                  />
                                  <span className="text-[10px] text-zinc-500 mt-1 font-mono">
                                    p. {leftIdx + 1}
                                  </span>
                                </>
                              ) : (
                                <div className="h-[45vh] w-48 rounded-l-2xl border border-dashed border-white/10 flex items-center justify-center text-xs text-zinc-600">
                                  End of Chapter
                                </div>
                              )}
                              <div
                                onClick={() =>
                                  isRtl
                                    ? handleGoToPage(currentPage + 2)
                                    : handleGoToPage(currentPage <= 2 ? 0 : currentPage - 2)
                                }
                                title={isRtl ? "Next spread" : "Previous spread"}
                                className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-15 bg-pink-500/20 rounded-l-2xl transition-opacity"
                              />
                            </div>

                            {/* Center Spine Divider */}
                            <div className="w-px h-[65vh] bg-gradient-to-b from-transparent via-white/20 to-transparent shrink-0" />

                            {/* Right Page */}
                            <div className="relative flex-1 flex flex-col items-start justify-center max-h-[80vh]">
                              {rightPage ? (
                                <>
                                  <img
                                    src={rightPage.url}
                                    alt={`Page ${rightIdx + 1}`}
                                    className="max-h-[78vh] w-auto max-w-full object-contain rounded-r-2xl shadow-xl border-y border-r border-white/10"
                                  />
                                  <span className="text-[10px] text-zinc-500 mt-1 font-mono">
                                    p. {rightIdx + 1}
                                  </span>
                                </>
                              ) : (
                                <div className="h-[45vh] w-48 rounded-r-2xl border border-dashed border-white/10 flex items-center justify-center text-xs text-zinc-600">
                                  End of Chapter
                                </div>
                              )}
                              <div
                                onClick={() =>
                                  isRtl
                                    ? handleGoToPage(currentPage <= 2 ? 0 : currentPage - 2)
                                    : handleGoToPage(currentPage + 2)
                                }
                                title={isRtl ? "Previous spread" : "Next spread"}
                                className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-15 bg-purple-500/20 rounded-r-2xl transition-opacity"
                              />
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                /* Paginated Image View (RTL Manga / LTR Comic) */
                <div className="relative w-full max-w-4xl flex items-center justify-center">
                  {activeChapter.pages[currentPage] ? (
                    <div className="relative max-h-[82vh] flex items-center justify-center select-none">
                      <img
                        src={activeChapter.pages[currentPage].url}
                        alt={`Page ${currentPage + 1}`}
                        className="max-h-[80vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl border border-white/5"
                      />

                      {/* Clickable Screen Halves for Page Flipping */}
                      <div
                        onClick={() =>
                          readingMode === "rtl"
                            ? handleGoToPage(currentPage + 1)
                            : handleGoToPage(currentPage - 1)
                        }
                        title={readingMode === "rtl" ? "Next page" : "Previous page"}
                        className="absolute inset-y-0 left-0 w-1/3 cursor-pointer opacity-0 hover:opacity-20 bg-pink-500/20 transition-opacity"
                      />
                      <div
                        onClick={() =>
                          readingMode === "rtl"
                            ? handleGoToPage(currentPage - 1)
                            : handleGoToPage(currentPage + 1)
                        }
                        title={readingMode === "rtl" ? "Previous page" : "Next page"}
                        className="absolute inset-y-0 right-0 w-1/3 cursor-pointer opacity-0 hover:opacity-20 bg-purple-500/20 transition-opacity"
                      />
                    </div>
                  ) : (
                    <div className="p-12 text-center text-zinc-400 text-sm">
                      No page image available.
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Pagination Controls for RTL / LTR / Spread */}
              {readingMode !== "vertical" && (
                <div
                  className={`flex items-center gap-3 mt-6 pt-4 border-t border-white/10 ${
                    readingMode === "rtl" ? "flex-row-reverse" : ""
                  }`}
                >
                  <button
                    type="button"
                    disabled={currentPage <= 0}
                    onClick={() => {
                      if (readingMode === "spread") {
                        handleGoToPage(currentPage <= 2 ? 0 : currentPage - 2);
                      } else {
                        handleGoToPage(currentPage - 1);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <div className="text-xs font-bold text-zinc-400 px-3">
                    {readingMode === "spread" && currentPage > 0
                      ? `${currentPage + 1}-${Math.min(currentPage + 2, activeChapter.pages.length)} / ${activeChapter.pages.length}`
                      : `${currentPage + 1} / ${activeChapter.pages.length}`}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage >= activeChapter.pages.length - 1}
                    onClick={() => {
                      if (readingMode === "spread") {
                        handleGoToPage(currentPage === 0 ? 1 : currentPage + 2);
                      } else {
                        handleGoToPage(currentPage + 1);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-30 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-pink-500/20"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Chapter Navigation Footer (Prev Chapter / Next Chapter) */}
            <div className="p-4 rounded-2xl bg-[#151722] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                Reading: <strong className="text-white">{activeChapter.title}</strong>
              </div>

              <div className="flex items-center gap-2">
                {(() => {
                  const sortedChaps = [...(selectedSeries.chapters || [])].sort((a, b) => a.number - b.number);
                  const currIdx = sortedChaps.findIndex((c) => c.id === activeChapter.id);
                  const prevChap = currIdx > 0 ? sortedChaps[currIdx - 1] : null;
                  const nextChap = currIdx >= 0 && currIdx < sortedChaps.length - 1 ? sortedChaps[currIdx + 1] : null;

                  return (
                    <>
                      {prevChap && (
                        <button
                          type="button"
                          onClick={() => openChapter(prevChap, 0)}
                          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 flex items-center gap-1"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Ch. {prevChap.number}</span>
                        </button>
                      )}
                      {nextChap && (
                        <button
                          type="button"
                          onClick={() => openChapter(nextChap, 0)}
                          className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold flex items-center gap-1 shadow"
                        >
                          <span>Next: Ch. {nextChap.number}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Chapter Discussion & Reaction Badges */}
            <div className="p-6 rounded-3xl bg-[#141622] border border-white/10 shadow-xl space-y-6">
              {/* Reactions Bar */}
              <div className="space-y-3 pb-4 border-b border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-pink-400" />
                    <span>Chapter Reactions</span>
                  </h3>
                  <span className="text-xs text-zinc-400">Tap to react to Ch. {activeChapter.number}</span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {[
                    { id: "hype", label: "🔥 Hype", color: "from-orange-500/20 to-rose-500/20 border-orange-500/40 text-orange-300" },
                    { id: "wholesome", label: "💖 Wholesome", color: "from-pink-500/20 to-purple-500/20 border-pink-500/40 text-pink-300" },
                    { id: "twist", label: "😱 Plot Twist", color: "from-amber-500/20 to-yellow-500/20 border-amber-500/40 text-amber-300" },
                    { id: "funny", label: "😂 Funny", color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300" },
                    { id: "art", label: "🎨 Peak Art", color: "from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-300" },
                  ].map((r) => {
                    const count = (chapterComments || []).filter((c) => c.reaction === r.id).length;
                    const isSelected = selectedReaction === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedReaction(isSelected ? "" : r.id)}
                        className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                          isSelected
                            ? "bg-pink-600 border-pink-400 text-white shadow-lg shadow-pink-500/25 scale-105"
                            : `bg-gradient-to-r ${r.color} hover:scale-105`
                        }`}
                      >
                        <span>{r.label}</span>
                        {count > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comments Submission Form */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span>Discussion & Theories ({(chapterComments || []).length})</span>
                </div>

                {currentUser ? (
                  <form onSubmit={handlePostChapterComment} className="flex gap-3">
                    <img
                      src={currentUser.avatarUrl || "/sfw/avatar/0738955ca929985f39921b4876053170.png"}
                      alt={currentUser.username}
                      className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={
                            selectedReaction
                              ? `Add a comment with your ${selectedReaction} reaction...`
                              : "Discuss this chapter with other readers..."
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 pr-24"
                        />
                        <button
                          type="submit"
                          disabled={submittingComment || !commentText.trim()}
                          className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow"
                        >
                          <Send className="w-3 h-3" />
                          <span>{submittingComment ? "..." : "Post"}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 flex items-center justify-between">
                    <span>Sign in to react and leave comments on this chapter.</span>
                    <button
                      type="button"
                      onClick={() => router.push("/signin")}
                      className="px-3 py-1 rounded-lg bg-pink-600 text-white text-xs font-bold"
                    >
                      Sign In
                    </button>
                  </div>
                )}

                {/* Comments Stream */}
                <div className="space-y-3 pt-2">
                  {(chapterComments || []).length === 0 ? (
                    <div className="text-center py-6 text-zinc-500 text-xs">
                      No comments yet on this chapter. Be the first to share your thoughts!
                    </div>
                  ) : (
                    (chapterComments || []).map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-2xl bg-black/30 border border-white/[0.06] flex items-start gap-3"
                      >
                        <img
                          src={c.author?.avatarUrl || "/sfw/avatar/0738955ca929985f39921b4876053170.png"}
                          alt={c.author?.username || "user"}
                          className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">
                              {c.author?.displayName || c.author?.username}
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              @{c.author?.username}
                            </span>
                            {c.reaction && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                                {c.reaction === "hype"
                                  ? "🔥 Hype"
                                  : c.reaction === "wholesome"
                                  ? "💖 Wholesome"
                                  : c.reaction === "twist"
                                  ? "😱 Plot Twist"
                                  : c.reaction === "funny"
                                  ? "😂 Funny"
                                  : c.reaction === "art"
                                  ? "🎨 Peak Art"
                                  : c.reaction}
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-500 ml-auto">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-200 leading-relaxed break-words">
                            {c.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : selectedSeries ? (
          /* =========================================================================
              VIEW 2: SERIES DETAIL PAGE
          ========================================================================= */
          <div className="space-y-6 animate-fade-in">
            <button
              type="button"
              onClick={() => {
                setSelectedSeries(null);
                window.history.pushState({}, "", "/comics");
              }}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Comics Directory</span>
            </button>

            {/* Series Header Card */}
            <div className="p-6 rounded-3xl bg-[#141622] border border-white/10 shadow-2xl flex flex-col md:flex-row gap-6 relative overflow-hidden">
              {/* Cover Artwork */}
              <div className="w-48 sm:w-56 shrink-0 aspect-[3/4] rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-xl mx-auto md:mx-0">
                <img
                  src={selectedSeries.coverUrl}
                  alt={selectedSeries.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Series Info & Actions */}
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/40">
                      {selectedSeries.direction === "rtl"
                        ? "Manga (RTL)"
                        : selectedSeries.direction === "ltr"
                        ? "Comic (LTR)"
                        : "Webcomic (Vertical)"}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        selectedSeries.status === "completed"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-purple-500/20 text-purple-300 border-purple-500/40"
                      }`}
                    >
                      {selectedSeries.status}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {selectedSeries.chapters?.length ?? selectedSeries._count?.chapters ?? 0} chapter(s)
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {selectedSeries.title}
                  </h2>

                  <div className="flex items-center gap-2">
                    {selectedSeries.creator?.avatarUrl && (
                      <img
                        src={selectedSeries.creator.avatarUrl}
                        alt={selectedSeries.creator.displayName}
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-pink-500/40"
                      />
                    )}
                    <span className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                      by {selectedSeries.creator?.displayName || "Creator"}{" "}
                      <span className="text-pink-400 font-normal">
                        @{selectedSeries.creator?.username}
                      </span>
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-3xl whitespace-pre-line pt-1">
                    {selectedSeries.description || "No description provided."}
                  </p>

                  {/* Genres & Tags Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {selectedSeries.genres?.split(",").map((g, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/5 text-purple-300 border border-white/10"
                      >
                        {g.trim()}
                      </span>
                    ))}
                    {selectedSeries.tags?.split(",").map((t, idx) => (
                      <span
                        key={`t-${idx}`}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-black/40 text-zinc-400 border border-white/5"
                      >
                        #{t.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-white/[0.08]">
                  {/* Continue Reading Button */}
                  {readingProgress &&
                    (selectedSeries.chapters || []).some((c) => c.id === readingProgress.chapterId) && (
                      <button
                        type="button"
                        onClick={() => {
                          const chap = (selectedSeries.chapters || []).find(
                            (c) => c.id === readingProgress.chapterId
                          );
                          if (chap) openChapter(chap, readingProgress.page);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-pink-500/25 transition-all"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Continue Reading (Page {readingProgress.page + 1})</span>
                      </button>
                    )}

                  {/* Read from Beginning */}
                  {(selectedSeries.chapters || []).length > 0 && selectedSeries.chapters?.[0] && (
                    <button
                      type="button"
                      onClick={() => selectedSeries.chapters?.[0] && openChapter(selectedSeries.chapters[0], 0)}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <span>Read Chapter 1</span>
                    </button>
                  )}

                  {/* Follow Series */}
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                      isFollowing
                        ? "bg-purple-600/20 text-purple-300 border-purple-500/40"
                        : "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10"
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{isFollowing ? "Following ✓" : "Follow Series"}</span>
                  </button>

                  {/* Share Series Link */}
                  <button
                    type="button"
                    onClick={() =>
                      handleShareLink(
                        `${window.location.origin}/comics?series=${selectedSeries.id}`,
                        selectedSeries.title
                      )
                    }
                    className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all border border-white/10"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>

                  {/* Creator Action: Add Chapter */}
                  {isOwnerOrAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        const chaps = selectedSeries.chapters || [];
                        const nextNum =
                          chaps.length > 0 ? Math.max(0, ...chaps.map((c) => c.number)) + 1 : 1;
                        setChapterNumber(nextNum);
                        setChapterTitle(`Chapter ${nextNum}`);
                        setChapterPages([]);
                        setShowAddChapterModal(true);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all ml-auto shadow-md shadow-emerald-600/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload Chapter</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Chapters Directory */}
            <div className="p-6 rounded-3xl bg-[#141622] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold uppercase tracking-wider text-pink-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Chapters & Episodes ({selectedSeries.chapters?.length ?? selectedSeries._count?.chapters ?? 0})
                </h3>
                <span className="text-xs text-zinc-400">
                  Select a chapter below to launch reader
                </span>
              </div>

              {!selectedSeries.chapters ? (
                <div className="p-8 text-center text-zinc-400 text-sm animate-pulse">
                  Loading chapters...
                </div>
              ) : selectedSeries.chapters.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-sm">
                  No chapters uploaded yet.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {selectedSeries.chapters.map((chap) => (
                    <div
                      key={chap.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                    >
                      <div
                        onClick={() => openChapter(chap, 0)}
                        className="cursor-pointer group space-y-0.5 flex-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-black/40 text-pink-400 border border-pink-500/30">
                            #{chap.number}
                          </span>
                          <span className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                            {chap.title}
                          </span>
                          {!chap.published && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Draft Preview
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 flex items-center gap-3">
                          <span>{chap.pages.length} pages</span>
                          <span>•</span>
                          <span>
                            {chap.publishedAt
                              ? new Date(chap.publishedAt).toLocaleDateString()
                              : "Unpublished"}
                          </span>
                        </div>
                      </div>

                      {/* Actions for Chapter */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openChapter(chap, 0)}
                          className="px-3 py-1.5 rounded-xl bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white text-xs font-bold transition-all border border-pink-500/30"
                        >
                          Read
                        </button>

                        {isOwnerOrAdmin && !chap.published && (
                          <button
                            type="button"
                            onClick={() => handlePublishDraft(chap.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-bold transition-all border border-emerald-500/30"
                          >
                            Publish
                          </button>
                        )}

                        {isOwnerOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteChapter(chap.id)}
                            title="Delete chapter"
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white text-xs transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "dashboard" ? (
          /* =========================================================================
              VIEW 3: CREATOR STUDIO & DASHBOARD
          ========================================================================= */
          <div className="space-y-6 animate-fade-in">
            <div className="p-6 rounded-3xl bg-gradient-to-r from-[#171927] to-[#1a1525] border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Creator Studio: Manga & Comics
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  Manage your serialized titles, draft chapters, reading direction, and reader notifications.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-500/20 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Series</span>
              </button>
            </div>

            {mySeries.length === 0 ? (
              <div className="p-12 rounded-3xl bg-[#141622] border border-white/10 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-pink-400 mx-auto opacity-60" />
                <h3 className="text-base font-bold text-white">No Series Created Yet</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Start serializing your manga, comic book, or webtoon with multi-page chapter uploads.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold"
                >
                  Create Series Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mySeries.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-3xl bg-[#141622] border border-white/10 hover:border-pink-500/30 transition-all flex flex-col justify-between gap-3 shadow-lg"
                  >
                    <div className="flex gap-3">
                      <img
                        src={s.coverUrl}
                        alt={s.title}
                        className="w-20 h-28 object-cover rounded-xl border border-white/10 shrink-0"
                      />
                      <div className="min-w-0 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                          {s.direction.toUpperCase()}
                        </span>
                        <h4 className="text-sm font-bold text-white truncate">{s.title}</h4>
                        <p className="text-xs text-zinc-400">
                          {s._count?.chapters ?? s.chapters?.length ?? 0} chapter(s) • {s._count?.follows ?? 0} followers
                        </p>
                        <p className="text-[11px] text-zinc-500 line-clamp-2">{s.description}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleSelectSeries(s)}
                        className="text-xs font-bold text-pink-400 hover:text-pink-300"
                      >
                        Manage & Add Chapters →
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleShareLink(
                            `${window.location.origin}/comics?series=${s.id}`,
                            s.title
                          )
                        }
                        title="Share series link"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
              VIEW 4: COMICS & MANGA DISCOVERY (Default Grid)
          ========================================================================= */
          <div className="space-y-6">
            {/* Continue Reading Shelf */}
            {continueReading.length > 0 && (
              <div className="p-5 rounded-3xl bg-gradient-to-r from-pink-950/30 via-[#151724] to-purple-950/30 border border-pink-500/20 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-pink-400" />
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                      Continue Reading
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-400">Jump back into your in-progress manga</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {continueReading.map((item) => {
                    const totalPages = item.chapter?.pages?.length || 1;
                    const pct = Math.min(100, Math.round(((item.page + 1) / totalPages) * 100));
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-black/40 border border-white/10 hover:border-pink-500/40 transition-all flex gap-3 group relative overflow-hidden"
                      >
                        <div className="w-16 h-22 rounded-xl overflow-hidden bg-zinc-900 shrink-0 aspect-[3/4]">
                          <img
                            src={item.series?.coverUrl}
                            alt={item.series?.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-pink-300">
                              {item.series?.title}
                            </h4>
                            <p className="text-[11px] text-zinc-400 truncate">
                              Ch. {item.chapter?.number}: {item.chapter?.title}
                            </p>
                          </div>

                          <div className="space-y-1.5 pt-2">
                            <div className="flex items-center justify-between text-[10px] text-zinc-400">
                              <span>Page {item.page + 1} / {totalPages}</span>
                              <span className="text-pink-400 font-bold">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectSeries(item.series);
                                openChapter(item.chapter, item.page);
                              }}
                              className="w-full mt-1.5 py-1 px-2.5 rounded-lg bg-pink-600/30 hover:bg-pink-600 text-pink-200 hover:text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Resume</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter and Discovery Bar */}
            <div className="p-4 rounded-3xl bg-[#141622] border border-white/10 space-y-3.5 shadow-lg">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search series by title, creator, or tags..."
                  className="flex-1 px-4 py-2 rounded-2xl bg-black/40 border border-white/15 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                />

                {/* Filter Selectors */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={directionFilter}
                    onChange={(e) => setDirectionFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs font-bold text-zinc-200 focus:outline-none"
                  >
                    <option value="all">All Reading Formats</option>
                    <option value="rtl">Manga (Right-to-Left)</option>
                    <option value="ltr">Comic (Left-to-Right)</option>
                    <option value="vertical">Webcomic (Vertical)</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs font-bold text-zinc-200 focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as "updated" | "follows" | "title"
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs font-bold text-zinc-200 focus:outline-none"
                  >
                    <option value="updated">Recently Updated</option>
                    <option value="follows">Most Followed</option>
                    <option value="title">Alphabetical (A-Z)</option>
                  </select>
                </div>
              </div>

              {/* Genre Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[11px] font-bold text-zinc-400 shrink-0 pr-1">
                  Genres:
                </span>
                {GENRE_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenreFilter(g)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      genreFilter === g
                        ? "bg-pink-600 text-white shadow-md shadow-pink-500/20"
                        : "bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of Series Cards */}
            {filteredSeries.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-[#141622] border border-white/10 space-y-2">
                <BookOpen className="w-8 h-8 text-pink-400 mx-auto opacity-50" />
                <p className="text-sm font-bold text-white">No series match your search filters.</p>
                <p className="text-xs text-zinc-400">Try adjusting your genre or search terms.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredSeries.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSeries(s)}
                    className="group relative rounded-2xl overflow-hidden bg-[#151722] border border-white/10 hover:border-pink-500/50 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/10 flex flex-col justify-between"
                  >
                    {/* Cover Image Container */}
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-900">
                      <img
                        src={s.coverUrl}
                        alt={s.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-black/75 text-pink-300 border border-pink-500/30">
                          {s.direction === "rtl"
                            ? "MANGA"
                            : s.direction === "ltr"
                            ? "COMIC"
                            : "WEBTOON"}
                        </span>
                        {s.status === "completed" && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/80 text-white">
                            END
                          </span>
                        )}
                      </div>

                      {/* Chapter count pill */}
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/80 text-white border border-white/10">
                        {s._count?.chapters ?? s.chapters?.length ?? 0} Ch.
                      </span>
                    </div>

                    {/* Meta Footer */}
                    <div className="p-3 space-y-1">
                      <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-pink-300 transition-colors">
                        {s.title}
                      </h3>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {s.creator?.displayName || "Creator"}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {s.genres || "Anime / Manga"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* =========================================================================
          MODAL: CREATE NEW SERIES
      ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-[#141624] border border-white/15 p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-pink-400" />
                <span>Create Manga or Comic Series</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSeriesSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Series Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Succubus After Dark"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Description</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Synopsis, premise, characters, and notes..."
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Reading Direction *</label>
                  <select
                    value={newDirection}
                    onChange={(e) =>
                      setNewDirection(
                        e.target.value as "rtl" | "ltr" | "vertical"
                      )
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="rtl">Manga (Right-to-Left)</option>
                    <option value="ltr">Comic (Left-to-Right)</option>
                    <option value="vertical">Webcomic (Vertical Scroll)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Publication Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(e.target.value as "ongoing" | "completed")
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Genres (comma separated)</label>
                  <input
                    type="text"
                    value={newGenres}
                    onChange={(e) => setNewGenres(e.target.value)}
                    placeholder="Ecchi, Fantasy, Romance"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Tags</label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="succubus, lingerie, 18+"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Cover Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Cover Image *</label>
                <div className="flex items-center gap-3">
                  {newCoverUrl ? (
                    <img
                      src={newCoverUrl}
                      alt="Cover preview"
                      className="w-16 h-20 object-cover rounded-xl border border-white/20"
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-pink-300 border border-pink-500/30 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Cover Image</span>
                  </button>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileSelected}
                    className="hidden"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 pt-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={seriesPermission}
                  onChange={(e) => setSeriesPermission(e.target.checked)}
                  className="rounded border-white/20 mt-0.5"
                />
                <span>I confirm that I own or have permission to publish this creative work.</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !newCoverUrl}
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg"
                >
                  {busy ? "Creating..." : "Create Series"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: UPLOAD CHAPTER (Multi-Page Drag & Reorder)
      ========================================================================= */}
      {showAddChapterModal && selectedSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-[#141624] border border-white/15 p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-400" />
                  <span>Upload Chapter — {selectedSeries.title}</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Select multiple page images, drag to arrange page order, and publish.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddChapterModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Chapter Title *</label>
                  <input
                    type="text"
                    required
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    placeholder="e.g. Chapter 1: The Awakening"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Chapter Number *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Upload Pages Trigger & Archive Uploader */}
              <div className="p-5 rounded-2xl bg-black/40 border border-dashed border-white/20 text-center space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.zip,.cbz,application/zip,application/x-cbz,application/x-zip-compressed"
                  onChange={handlePageFilesSelected}
                  className="hidden"
                />

                <div className="space-y-1">
                  <p className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                    <FileArchive className="w-4 h-4 text-purple-400" />
                    <span>Upload Chapter Pages or Comic Archive</span>
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Supports selecting individual images (PNG, JPG, WEBP) or dropping a <strong className="text-pink-300">.ZIP / .CBZ</strong> archive
                  </p>
                </div>

                {uploadingFiles ? (
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center gap-2 text-xs font-bold text-purple-300 animate-pulse">
                    <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    <span>{uploadStatusText || "Processing chapter pages..."}</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white text-xs font-bold transition-all border border-pink-500/40 flex items-center gap-1.5 shadow"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Select Images or .ZIP / .CBZ</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Page Previews & Drag-to-Order */}
              {chapterPages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                    <span>
                      Pages ({chapterPages.length}) • Drag or use arrows to adjust page order
                    </span>
                    <button
                      type="button"
                      onClick={() => setChapterPages([])}
                      className="text-rose-400 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-56 overflow-y-auto p-2 bg-black/30 rounded-2xl border border-white/10">
                    {chapterPages.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        draggable
                        onDragStart={() => setDragIdx(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragIdx !== null) handleReorderPages(dragIdx, idx);
                          setDragIdx(null);
                        }}
                        className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black border border-white/15 group cursor-move select-none"
                      >
                        <img
                          src={url}
                          alt={`Page ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />

                        {/* Page number badge */}
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/80 text-white">
                          p. {idx + 1}
                        </span>

                        {/* Remove Page Button */}
                        <button
                          type="button"
                          onClick={() =>
                            setChapterPages((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-black/80 text-rose-300 hover:bg-rose-500 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>

                        {/* Move Left / Right Buttons for Touch */}
                        <div className="absolute inset-x-0 bottom-6 flex justify-between px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleReorderPages(idx, idx - 1)}
                            className="p-1 rounded bg-black/80 text-white disabled:opacity-30"
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            disabled={idx === chapterPages.length - 1}
                            onClick={() => handleReorderPages(idx, idx + 1)}
                            className="p-1 rounded bg-black/80 text-white disabled:opacity-30"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-start gap-2 pt-1 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={chapterPermission}
                  onChange={(e) => setChapterPermission(e.target.checked)}
                  className="rounded border-white/20 mt-0.5"
                />
                <span>I confirm that I have permission to upload and publish these chapter pages.</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddChapterModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || chapterPages.length === 0}
                  onClick={() => handleCreateChapterSubmit(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={busy || chapterPages.length === 0}
                  onClick={() => handleCreateChapterSubmit(true)}
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-pink-500/20"
                >
                  {busy ? "Uploading..." : "Publish Chapter Live"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SiteShell>
  );
}

export default function ComicsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0e15]" />}>
      <ComicsContent />
    </Suspense>
  );
}
