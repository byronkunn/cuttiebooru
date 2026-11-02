"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Upload,
  Plus,
  X,
  FolderHeart,
  ShieldCheck,
  Image as ImageIcon,
  Film,
  CheckCircle2,
  Hash,
  Flame,
  AlertTriangle,
  FolderOpen,
} from "lucide-react";
import { User, Album, Tag, Post } from "@/types/cuttiebooru";
import { getTagCategoryStyle } from "@/lib/tag-taxonomy";

interface UploadViewProps {
  currentUser: User | null;
  users: User[];
  albums: Album[];
  tags: Tag[];
  lightTheme: boolean;
  onPostCreated: (post: Post) => void;
}

export function UploadView({
  currentUser,
  users,
  albums,
  tags,
  lightTheme,
  onPostCreated,
}: UploadViewProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [videoDuration] = useState("0:15");
  const [rating, setRating] = useState<"" | "sfw" | "questionable" | "explicit">("");
  const [creatorId, setCreatorId] = useState(
    currentUser?.id || users[0]?.id || "user_byron"
  );

  // Booru Tag System State: Chips + Auto-Suggestion
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);

  const [sourceUrl, setSourceUrl] = useState("");
  const [attribution, setAttribution] = useState("");
  const [albumMode, setAlbumMode] = useState<"none" | "existing" | "new">(
    "none"
  );
  const [albumId, setAlbumId] = useState(albums[0]?.id || "");
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [newAlbumDescription, setNewAlbumDescription] = useState("");
  const [permissionConfirmed, setPermissionConfirmed] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Optional browser for existing ./sfw/image and ./sfw/video files
  const [showSfwBrowser, setShowSfwBrowser] = useState(false);
  const [sfwAssets, setSfwAssets] = useState<{
    images: string[];
    videos: string[];
  }>({ images: [], videos: [] });
  const [sfwBrowserTab, setSfwBrowserTab] = useState<"images" | "videos">(
    "images"
  );

  const tagContainerRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser?.id) {
      setCreatorId(currentUser.id);
    }
  }, [currentUser?.id]);

  // Close tag suggestion dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tagContainerRef.current &&
        !tagContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadSfwLibrary = async () => {
    if (sfwAssets.images.length === 0 && sfwAssets.videos.length === 0) {
      try {
        const res = await fetch("/api/upload");
        const data = await res.json();
        if (res.ok) {
          setSfwAssets({
            images: data.images || [],
            videos: data.videos || [],
          });
        }
      } catch {
        // ignore
      }
    }
    setShowSfwBrowser((prev) => !prev);
  };

  // Upload local file to /sfw/image or /sfw/video
  const handlePrimaryFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setErrorMsg("");

    const isVid =
      file.type.startsWith("video/") ||
      /\.(mp4|webm|mov)$/i.test(file.name);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", isVid ? "video" : "image");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setMediaUrl(data.url);
        setMediaType(data.mediaType === "video" ? "video" : "image");
        if (data.mediaType === "video") {
          addTag("video");
        }
      } else {
        setErrorMsg(data.error || "Failed to upload file");
      }
    } catch {
      setErrorMsg("Error uploading file to server");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleGalleryFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingFile(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const formData = new FormData();
      formData.append("file", f);
      formData.append(
        "folder",
        f.type.startsWith("video/") ? "video" : "image"
      );
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          uploadedUrls.push(data.url);
        }
      } catch {
        // ignore individual error
      }
    }
    if (uploadedUrls.length > 0) {
      if (!mediaUrl) {
        setMediaUrl(uploadedUrls[0]);
        setGalleryUrls((prev) => [...prev, ...uploadedUrls.slice(1)]);
      } else {
        setGalleryUrls((prev) => [...prev, ...uploadedUrls]);
      }
    }
    setUploadingFile(false);
  };

  // Normalize tag string into booru snake_case format
  const normalizeTagName = (raw: string) =>
    raw
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/\s+/g, "_");

  const addTag = (rawName: string) => {
    const clean = normalizeTagName(rawName);
    if (!clean) return;
    setSelectedTags((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setTagQuery("");
    setShowSuggestions(false);
    setActiveSuggestionIdx(-1);
    tagInputRef.current?.focus();
  };

  const removeTag = (tagName: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tagName));
  };

  // Compute auto-suggestions matching tagQuery when typing
  const matchingSuggestions = useMemo(() => {
    const cleanQ = normalizeTagName(tagQuery);
    if (!cleanQ) return [];
    return tags
      .filter((t) => {
        if (selectedTags.includes(t.name)) return false;
        return (
          t.name.toLowerCase().includes(cleanQ) ||
          t.displayName.toLowerCase().includes(cleanQ) ||
          t.category.toLowerCase().includes(cleanQ)
        );
      })
      .slice(0, 8);
  }, [tags, tagQuery, selectedTags]);

  const cleanTypedTag = normalizeTagName(tagQuery);
  const canCreateCustomTag =
    cleanTypedTag.length > 0 &&
    !selectedTags.includes(cleanTypedTag) &&
    !tags.some((t) => t.name.toLowerCase() === cleanTypedTag);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalOptions =
      matchingSuggestions.length + (canCreateCustomTag ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggestions(true);
      setActiveSuggestionIdx((prev) =>
        prev < totalOptions - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIdx((prev) =>
        prev > 0 ? prev - 1 : Math.max(0, totalOptions - 1)
      );
    } else if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (e.key === "Tab" && !tagQuery.trim()) return;
      e.preventDefault();
      // If user explicitly navigated down to a suggestion item:
      if (
        showSuggestions &&
        activeSuggestionIdx >= 0 &&
        matchingSuggestions[activeSuggestionIdx]
      ) {
        addTag(matchingSuggestions[activeSuggestionIdx].name);
      } else if (
        showSuggestions &&
        canCreateCustomTag &&
        activeSuggestionIdx === matchingSuggestions.length
      ) {
        addTag(cleanTypedTag);
      } else if (cleanTypedTag) {
        // Hitting enter on typed tag creates and displays chip immediately
        addTag(cleanTypedTag);
      }
    } else if (
      e.key === "Backspace" &&
      !tagQuery &&
      selectedTags.length > 0
    ) {
      removeTag(selectedTags[selectedTags.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveSuggestionIdx(-1);
    }
  };

  const getTagCategory = (tagName: string) =>
    tags.find((t) => t.name === tagName)?.category || "general";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!title.trim() || !mediaUrl.trim()) {
      setErrorMsg("Please provide a title and upload or select a media file.");
      return;
    }

    if (!rating) {
      setErrorMsg("Please choose a content rating for this upload.");
      return;
    }

    if (selectedTags.length === 0) {
      setErrorMsg("Please add at least one booru tag before publishing.");
      return;
    }

    if (!permissionConfirmed) {
      setErrorMsg(
        "Please confirm that you have permission to share this work."
      );
      return;
    }

    setSubmitting(true);
    try {
      const allFiles = [mediaUrl.trim(), ...galleryUrls];
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          mediaUrl,
          thumbnailUrl: mediaUrl,
          galleryUrls: allFiles,
          mediaType,
          videoDuration,
          rating,
          creatorId,
          uploaderId: currentUser?.id || creatorId,
          sourceUrl,
          attribution,
          permissionConfirmed,
          albumId: albumMode === "existing" ? albumId : null,
          newAlbumTitle: albumMode === "new" ? newAlbumTitle : "",
          newAlbumDescription: albumMode === "new" ? newAlbumDescription : "",
          tags: selectedTags,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Upload failed");
      } else {
        setSuccessMsg("Published to Cuttiebooru!");
        onPostCreated(data.post);
      }
    } catch {
      setErrorMsg("Network error while publishing.");
    } finally {
      setSubmitting(false);
    }
  };

  const isVideoFile =
    mediaType === "video" || /\.(mp4|webm|mov)$/i.test(mediaUrl);

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <div
        className={`rounded-3xl border p-5 sm:p-8 shadow-2xl space-y-6 ${
          lightTheme
            ? "bg-white border-purple-200 text-zinc-900"
            : "bg-[#161822] border-white/[0.08] text-zinc-100"
        }`}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">
                Upload images & videos (SFW, ecchi & explicit)
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Upload high-res images or MP4 videos, set content rating, and
                tag with booru auto-suggestions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadSfwLibrary}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-pink-500/15 border border-white/10 hover:border-pink-500/40 text-xs font-bold text-pink-300 transition-all self-start sm:self-auto"
          >
            <FolderOpen className="w-4 h-4" />
            {showSfwBrowser
              ? "Hide ./sfw Media Vault"
              : "Browse ./sfw Folder Media"}
          </button>
        </div>

        {/* Optional ./sfw Folder Media Picker (Real files from ./sfw/image and ./sfw/video) */}
        {showSfwBrowser && (
          <div className="p-4 rounded-2xl bg-black/40 border border-pink-500/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSfwBrowserTab("images")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    sfwBrowserTab === "images"
                      ? "bg-pink-500 text-white"
                      : "bg-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  ./sfw/image ({sfwAssets.images.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSfwBrowserTab("videos")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    sfwBrowserTab === "videos"
                      ? "bg-purple-600 text-white"
                      : "bg-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  ./sfw/video ({sfwAssets.videos.length})
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowSfwBrowser(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-56 overflow-y-auto p-1">
              {(sfwBrowserTab === "images"
                ? sfwAssets.images
                : sfwAssets.videos
              ).map((fileUrl) => (
                <button
                  key={fileUrl}
                  type="button"
                  onClick={() => {
                    setMediaUrl(fileUrl);
                    const isVid = sfwBrowserTab === "videos";
                    setMediaType(isVid ? "video" : "image");
                    if (isVid && !selectedTags.includes("video")) {
                      setSelectedTags((prev) => [...prev, "video"]);
                    }
                    setShowSfwBrowser(false);
                  }}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 group transition-all ${
                    mediaUrl === fileUrl
                      ? "border-pink-500 ring-2 ring-pink-500/40"
                      : "border-white/10 hover:border-pink-400"
                  }`}
                >
                  {sfwBrowserTab === "videos" ? (
                    <video
                      src={fileUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={fileUrl}
                      alt={fileUrl}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Media Upload & Preview Column */}
            <div className="lg:col-span-5 space-y-4">
              <div
                onClick={() => {
                  if (!mediaUrl) primaryFileInputRef.current?.click();
                }}
                className={`relative aspect-[4/5] w-full rounded-2xl overflow-hidden border-2 ${
                  mediaUrl
                    ? "border-white/15 bg-black"
                    : "border-dashed border-pink-500/40 bg-black/40 cursor-pointer hover:border-pink-500 hover:bg-pink-500/5"
                } flex flex-col items-center justify-center transition-all`}
              >
                {mediaUrl ? (
                  <>
                    {isVideoFile ? (
                      <video
                        src={mediaUrl}
                        controls
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        alt="Upload preview"
                        className="w-full h-full object-contain bg-black"
                      />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMediaUrl("");
                      }}
                      title="Remove media"
                      className="absolute top-3 right-3 p-2 rounded-full bg-black/80 hover:bg-rose-500 text-white border border-white/15 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-black/80 text-pink-300 border border-pink-500/30">
                      {rating.toUpperCase()} • {isVideoFile ? "VIDEO" : "IMAGE"}
                    </span>
                  </>
                ) : (
                  <div className="p-6 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center mx-auto text-pink-400">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold">
                        {uploadingFile
                          ? "Uploading to ./sfw..."
                          : "Click to Upload Image or MP4 Video"}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Supports PNG, JPG, WEBP, GIF, MP4, WEBM (saved directly
                        to ./sfw)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => primaryFileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="py-2.5 px-3 rounded-xl border border-pink-500/40 bg-pink-500/15 hover:bg-pink-500/25 text-xs font-bold text-pink-300 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingFile ? "Uploading..." : "Upload Local File"}
                </button>

                <button
                  type="button"
                  onClick={() => galleryFileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="py-2.5 px-3 rounded-xl border border-purple-500/40 bg-purple-500/15 hover:bg-purple-500/25 text-xs font-bold text-purple-300 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Gallery Files ({galleryUrls.length})
                </button>

                <input
                  ref={primaryFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handlePrimaryFileUpload}
                  className="hidden"
                />
                <input
                  ref={galleryFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleGalleryFileUpload}
                  className="hidden"
                />
              </div>

              {galleryUrls.length > 0 && (
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                  <span className="text-xs font-bold text-zinc-300 block">
                    Additional Gallery Files ({galleryUrls.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {galleryUrls.map((u, idx) => (
                      <div
                        key={idx}
                        className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/15 group"
                      >
                        <img
                          src={u}
                          alt={`Gallery ${idx + 2}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setGalleryUrls(
                              galleryUrls.filter((_, i) => i !== idx)
                            )
                          }
                          className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-rose-400 hover:bg-rose-500 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Metadata & Booru Tagging Column */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    Post Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter post title..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

              </div>

              {/* Content Rating Selector (SFW / Questionable / 18+ Explicit) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">
                  Content rating *
                </label>
                <p className="text-xs text-zinc-400">Choose the rating that matches the media. Tags describe its contents separately.</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRating("sfw");
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      rating === "sfw"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow"
                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    SFW (Safe)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRating("questionable");
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      rating === "questionable"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow"
                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Ecchi (Suggestive)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRating("explicit");
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      rating === "explicit"
                        ? "bg-rose-500/25 border-rose-500 text-rose-300 shadow"
                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Flame className="w-4 h-4" />
                    Explicit (18+)
                  </button>
                </div>
              </div>

              {/* Media Path & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7 space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    Media File Path / URL *
                  </label>
                  <input
                    type="text"
                    required
                    value={mediaUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMediaUrl(val);
                      if (/\.(mp4|webm|mov)$/i.test(val)) {
                        setMediaType("video");
                      }
                    }}
                    placeholder="/sfw/image/... or upload file on the left"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="sm:col-span-5 space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    Media Format
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaType("image")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 ${
                        mediaType === "image"
                          ? "bg-pink-500/20 border-pink-500 text-pink-300"
                          : "bg-white/5 border-white/10 text-zinc-400"
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaType("video")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 ${
                        mediaType === "video"
                          ? "bg-purple-500/20 border-purple-500 text-purple-300"
                          : "bg-white/5 border-white/10 text-zinc-400"
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" />
                      Video
                    </button>
                  </div>
                </div>
              </div>

              {/* ==================== BOORU TAG SYSTEM WITH AUTO-SUGGESTION & REMOVABLE CHIPS ==================== */}
              <div
                ref={tagContainerRef}
                className="p-4 rounded-2xl bg-black/35 border border-white/15 space-y-3 relative"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                    <Hash className="w-4 h-4" />
                    Booru Tags ({selectedTags.length} added)
                  </label>
                  {selectedTags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTags([])}
                      className="text-[11px] text-zinc-400 hover:text-rose-400 font-semibold transition-colors"
                    >
                      Clear all tags
                    </button>
                  )}
                </div>

                {/* Relative container wrapping chips box, search input, and dropdown */}
                <div className="relative">
                  {/* Selected / Created Tag Chips Box */}
                  <div
                    onClick={() => tagInputRef.current?.focus()}
                    className="min-h-[54px] p-2.5 rounded-xl bg-black/60 border border-white/15 focus-within:border-pink-500 flex flex-wrap items-center gap-2 cursor-text transition-colors"
                  >
                    {selectedTags.map((tag) => {
                      const cat = getTagCategory(tag);
                      const style = getTagCategoryStyle(cat);
                      return (
                        <span
                          key={tag}
                          className={`inline-flex min-w-0 max-w-full items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-bold border shadow-sm transition-all select-none ${style.bg} ${style.border} ${style.text}`}
                        >
                          <span className="truncate" title={`#${tag}`}>#{tag}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTag(tag);
                            }}
                            title={`Delete #${tag} chip`}
                            aria-label={`Delete #${tag} chip`}
                            className="w-4 h-4 shrink-0 rounded-md hover:bg-rose-500 hover:text-white text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}

                    <input
                      ref={tagInputRef}
                      type="text"
                      value={tagQuery}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={(e) => {
                        setTagQuery(e.target.value);
                        setShowSuggestions(true);
                        setActiveSuggestionIdx(-1);
                      }}
                      onKeyDown={handleTagKeyDown}
                      placeholder={
                        selectedTags.length === 0
                          ? "Type to search or add booru tags (e.g. 18+, thighhighs, succubus, solo)..."
                          : "Add another tag (press Enter)..."
                      }
                      className="flex-1 min-w-[180px] bg-transparent text-base sm:text-sm text-white focus:outline-none py-1"
                    />

                    {cleanTypedTag && (
                      <button
                        type="button"
                        onClick={() => addTag(cleanTypedTag)}
                        className="max-w-full px-2.5 py-1 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3 shrink-0" />
                        <span className="truncate" title={`Add #${cleanTypedTag}`}>Add #{cleanTypedTag}</span>
                      </button>
                    )}
                  </div>

                  {/* Auto-Suggestion Dropdown (shown when user searches/types) */}
                  {showSuggestions &&
                    tagQuery.trim().length > 0 &&
                    (matchingSuggestions.length > 0 || canCreateCustomTag) && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-2xl border border-pink-500/40 bg-[#131520] shadow-2xl overflow-hidden divide-y divide-white/[0.06] max-h-64 overflow-y-auto">
                        <div className="px-3 py-1.5 bg-black/50 text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex flex-wrap gap-1 items-center justify-between">
                          <span>Booru Tag Suggestions</span>
                          <span>Press Enter to add • ↑↓ to navigate</span>
                        </div>

                        {matchingSuggestions.map((sug, idx) => {
                          const isHighlighted = idx === activeSuggestionIdx;
                          const style = getTagCategoryStyle(sug.category);
                          return (
                            <button
                              key={sug.id}
                              type="button"
                              onClick={() => addTag(sug.name)}
                              className={`w-full px-3.5 py-2 flex items-center justify-between text-left text-xs transition-colors ${
                                isHighlighted
                                  ? "bg-pink-500/20 text-white"
                                  : "hover:bg-white/5 text-zinc-200"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`font-bold truncate ${style.text}`}
                                >
                                  #{sug.name}
                                </span>
                                <span className="text-zinc-400 truncate">
                                  {sug.displayName}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${style.badge}`}
                                >
                                  {sug.category}
                                </span>
                                <span className="text-[11px] text-zinc-500">
                                  {sug._count?.posts ?? sug.usageCount} posts
                                </span>
                              </div>
                            </button>
                          );
                        })}

                        {canCreateCustomTag && (
                          <button
                            type="button"
                            onClick={() => addTag(cleanTypedTag)}
                            className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs transition-colors ${
                              activeSuggestionIdx === matchingSuggestions.length
                                ? "bg-pink-500/30 text-white"
                                : "bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 font-bold"
                            }`}
                          >
                            <span className="flex flex-wrap min-w-0 items-center gap-1.5">
                              <Plus className="w-4 h-4 shrink-0" />
                              <span>Create & add new booru tag</span>
                              <span className="underline truncate" title={`#${cleanTypedTag}`}>#{cleanTypedTag}</span>
                            </span>
                            <span className="shrink-0 ml-2 px-2 py-0.5 rounded bg-pink-500 text-white text-[10px] uppercase font-bold">
                              Press Enter
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                </div>
              </div>

              {/* Description & Attribution */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">
                  Description & Notes
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add resolution notes, character lore, cosplay credits, or lighting setup..."
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    Creator Profile
                  </label>
                  <select
                    value={creatorId}
                    onChange={(e) => setCreatorId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
                  >
                    {users.filter((u) => u.id === currentUser?.id).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} (@{u.username})
                        {u.id === currentUser?.id ? " — Signed In" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="upload-artist" className="text-xs font-bold text-zinc-300">
                    Artist name / credit
                  </label>
                  <input
                    type="text"
                    id="upload-artist"
                    maxLength={200}
                    value={attribution}
                    onChange={(e) => setAttribution(e.target.value)}
                    placeholder="Original artist's name or @handle"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                  <p className="text-xs text-zinc-400">If this is not your artwork, credit the original artist here. Uploading does not make you its artist.</p>
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="upload-source" className="text-xs font-bold text-zinc-300">Original source URL</label>
                <input id="upload-source" type="url" maxLength={2048} value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://example.com/original-artwork"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-base sm:text-sm text-white focus:outline-none focus:border-pink-500" />
                <p className="text-xs text-zinc-400">Link to the original artwork or artist&apos;s page. Credit and a link do not replace permission to share.</p>
              </div>

              {/* Album Assignment */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <FolderHeart className="w-4 h-4 text-pink-400" />
                    Album Organization
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {(["none", "existing", "new"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setAlbumMode(m)}
                        className={`px-2.5 py-1 rounded-lg font-semibold ${
                          albumMode === m
                            ? "bg-pink-500/20 text-pink-300 border border-pink-500/40"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {m === "none"
                          ? "Standalone"
                          : m === "existing"
                          ? "Existing Album"
                          : "+ New Album"}
                      </button>
                    ))}
                  </div>
                </div>

                {albumMode === "existing" && (
                  <select
                    value={albumId}
                    onChange={(e) => setAlbumId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
                  >
                    {albums.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} (by @{a.creator.username})
                      </option>
                    ))}
                  </select>
                )}

                {albumMode === "new" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newAlbumTitle}
                      onChange={(e) => setNewAlbumTitle(e.target.value)}
                      placeholder="New Album Title..."
                      className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={newAlbumDescription}
                      onChange={(e) => setNewAlbumDescription(e.target.value)}
                      placeholder="Album description..."
                      className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              {/* Permission Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissionConfirmed}
                  onChange={(e) => setPermissionConfirmed(e.target.checked)}
                  className="mt-0.5 rounded accent-pink-500"
                />
                <span className="text-xs text-emerald-200 leading-relaxed flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  I confirm that I have permission to upload this content and
                  that 18+ works are accurately rated.
                </span>
              </label>

              {errorMsg && (
                <p className="text-xs font-semibold text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                  {errorMsg}
                </p>
              )}

              {successMsg && (
                <p className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {successMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || uploadingFile}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-pink-500/25 transition-all disabled:opacity-50"
              >
                {submitting
                  ? "Publishing to Cuttiebooru..."
                  : "Publish Post to Booru Feed"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
