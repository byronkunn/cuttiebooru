"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Send,
  Image as ImageIcon,
  Film,
  Mic,
  Smile,
  Paperclip,
  Pin,
  Reply,
  Forward,
  Edit3,
  Trash2,
  Check,
  CheckCheck,
  X,
  ArrowLeft,
  BadgeCheck,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Flame,
  PanelRightOpen,
  PanelRightClose,
  Square,
  Sun,
  Moon,
  ExternalLink,
  MessageCircle,
  Volume2,
  Home,
  Compass,
  Upload as UploadIcon,
  User as UserIcon,
  BookOpen,
  Bookmark,
  Hash,
  Users,
  Settings,
  ShieldAlert,
  Bell,
} from "lucide-react";
import { DirectMessage, User } from "@/types/cuttiebooru";
import { QuickUserSwitcher } from "./QuickUserSwitcher";

interface MessagesViewProps {
  currentUser: User | null;
  users: User[];
  messages: DirectMessage[];
  activePartnerId: string;
  lightTheme: boolean;
  compactMode?: boolean;
  onBackToSite?: () => void;
  onToggleTheme?: () => void;
  onSwitchUser?: (userId: string) => void;
  onSelectPartner: (partnerId: string) => void;
  onSelectCreatorProfile: (creator: User) => void;
  onSendMessage: (payload: {
    receiverId: string;
    text: string;
    mediaUrl?: string;
    mediaType?: string;
    mediaDuration?: string;
    replyToId?: string | null;
    selfDestructSec?: number;
  }) => Promise<void>;
  onEditMessage: (messageId: string, text: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onPinMessage: (messageId: string) => Promise<void>;
  onReactMessage: (messageId: string, emoji: string) => Promise<void>;
  onForwardMessage: (
    messageId: string,
    targetReceiverId: string
  ) => Promise<void>;
  onMarkConversationRead: (partnerId: string) => Promise<void>;
}

const REACTION_EMOJIS = ["❤️", "🔥", "✨", "👏", "🥰", "😂"];

export function MessagesView({
  currentUser,
  users,
  messages,
  activePartnerId,
  lightTheme,
  compactMode = false,
  onBackToSite,
  onToggleTheme,
  onSelectPartner,
  onSelectCreatorProfile,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onReactMessage,
  onForwardMessage,
  onMarkConversationRead,
}: MessagesViewProps) {
  const myId = currentUser?.id || "user_hana";
  const router = useRouter();
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Mobile navigation state: false = conversation list, true = active 1-on-1 chat
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [chatFilterTab, setChatFilterTab] = useState<
    "all" | "unread" | "verified"
  >("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [inChatSearch, setInChatSearch] = useState("");
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [infoDrawerTab, setInfoDrawerTab] = useState<
    "media" | "voice" | "pinned"
  >("media");

  // Composer State
  const [textInput, setTextInput] = useState("");
  const [attachedUrl, setAttachedUrl] = useState("");
  const [attachedType, setAttachedType] = useState<"" | "image" | "video">("");
  const [attachedDuration, setAttachedDuration] = useState("");
  const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<DirectMessage | null>(
    null
  );
  const [selfDestructSec] = useState<number>(0);
  const [showStickerTray, setShowStickerTray] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [forwardingMessage, setForwardingMessage] =
    useState<DirectMessage | null>(null);

  // Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Media Lightbox State
  const [lightboxMsg, setLightboxMsg] = useState<DirectMessage | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxVideoPlaying, setLightboxVideoPlaying] = useState(false);

  // Highlighted message when clicking a reply quote
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Other users available for 1-on-1 chat
  const partners = useMemo(
    () => users.filter((u) => u.id !== myId),
    [users, myId]
  );

  const selectedPartner =
    partners.find((p) => p.id === activePartnerId) || partners[0] || null;

  // Mark messages read when opening conversation
  useEffect(() => {
    if (selectedPartner) {
      const hasUnread = messages.some(
        (m) =>
          m.senderId === selectedPartner.id &&
          m.receiverId === myId &&
          !m.isRead
      );
      if (hasUnread) {
        onMarkConversationRead(selectedPartner.id);
      }
    }
  }, [selectedPartner, messages, myId, onMarkConversationRead]);

  // Voice recording timer
  useEffect(() => {
    if (!isRecordingVoice) {
      setRecordSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecordingVoice]);

  // Filter conversation messages with selectedPartner
  const conversationMessages = useMemo(() => {
    if (!selectedPartner) return [];
    return messages.filter(
      (m) =>
        (m.senderId === myId && m.receiverId === selectedPartner.id) ||
        (m.senderId === selectedPartner.id && m.receiverId === myId)
    );
  }, [messages, myId, selectedPartner]);

  const displayedMessages = useMemo(() => {
    if (!inChatSearch.trim()) return conversationMessages;
    const q = inChatSearch.toLowerCase();
    return conversationMessages.filter((m) =>
      m.text.toLowerCase().includes(q)
    );
  }, [conversationMessages, inChatSearch]);

  // Pinned messages in current conversation
  const pinnedMessagesList = useMemo(
    () => conversationMessages.filter((m) => m.isPinned),
    [conversationMessages]
  );
  const latestPinnedMessage =
    pinnedMessagesList.length > 0
      ? pinnedMessagesList[pinnedMessagesList.length - 1]
      : null;

  // Shared media (images & videos) in current conversation for Lightbox & Shared Media Drawer
  const sharedMediaMessages = useMemo(
    () =>
      conversationMessages.filter(
        (m) =>
          m.mediaUrl && (m.mediaType === "image" || m.mediaType === "video")
      ),
    [conversationMessages]
  );

  const sharedVoiceMessages = useMemo(
    () => conversationMessages.filter((m) => m.mediaType === "voice"),
    [conversationMessages]
  );

  // Scroll to bottom when conversation changes or new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages.length, selectedPartner?.id]);

  // Filtered partners in the left sidebar
  const filteredPartners = useMemo(() => {
    const query = userSearchQuery.trim().toLowerCase();
    return partners.filter((partner) => {
      const matchesSearch =
        partner.displayName
          .toLowerCase()
          .includes(query) ||
        partner.username
          .toLowerCase()
          .includes(query) ||
        messages.some((message) =>
          ((message.senderId === partner.id && message.receiverId === myId) ||
            (message.senderId === myId && message.receiverId === partner.id)) &&
          message.text.toLowerCase().includes(query)
        );
      if (!matchesSearch) return false;

      if (chatFilterTab === "verified") {
        return partner.isVerified;
      }
      if (chatFilterTab === "unread") {
        const hasUnread = messages.some(
          (m) =>
            m.senderId === partner.id && m.receiverId === myId && !m.isRead
        );
        return hasUnread;
      }
      return true;
    });
  }, [partners, userSearchQuery, chatFilterTab, messages, myId]);

  // Handle local file upload for Image or Video (saved into ./sfw via /api/upload)
  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith(`${type}/`)) { alert(`Choose a valid ${type} file.`); return; }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "private");
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setAttachedUrl(data.url);
        setAttachedType(data.mediaType === "video" ? "video" : "image");
        setAttachedDuration(data.mediaType === "video" ? "0:15" : "");
        setShowAttachMenu(false);
        return;
      }
    } catch {
      // fallback
    }
    alert("Upload failed. Please sign in and try again.");
  };

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;

    if (editingMessage) {
      if (textInput.trim()) {
        await onEditMessage(editingMessage.id, textInput.trim());
      }
      setEditingMessage(null);
      setTextInput("");
      return;
    }

    if (!textInput.trim() && !attachedUrl) return;

    await onSendMessage({
      receiverId: selectedPartner.id,
      text: textInput.trim(),
      mediaUrl: attachedUrl,
      mediaType: attachedType,
      mediaDuration: attachedDuration,
      replyToId: replyingTo?.id || null,
      selfDestructSec,
    });

    setTextInput("");
    setAttachedUrl("");
    setAttachedType("");
    setAttachedDuration("");
    setReplyingTo(null);
  };

  const handleSendVoiceNote = async () => {
    if (!selectedPartner) return;
    const mins = Math.floor(recordSeconds / 60);
    const secs = String(recordSeconds % 60).padStart(2, "0");
    const durationStr = `${mins}:${secs === "00" ? "08" : secs}`;
    setIsRecordingVoice(false);

    await onSendMessage({
      receiverId: selectedPartner.id,
      text: "Voice message",
      mediaType: "voice",
      mediaDuration: durationStr,
      replyToId: replyingTo?.id || null,
      selfDestructSec,
    });
    setReplyingTo(null);
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`chat-msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(msgId);
      setTimeout(() => setHighlightedMsgId(null), 2000);
    }
  };

  // Lightbox navigation
  const lightboxIdx = lightboxMsg
    ? sharedMediaMessages.findIndex((m) => m.id === lightboxMsg.id)
    : -1;
  const prevMediaMsg =
    lightboxIdx > 0 ? sharedMediaMessages[lightboxIdx - 1] : null;
  const nextMediaMsg =
    lightboxIdx >= 0 && lightboxIdx < sharedMediaMessages.length - 1
      ? sharedMediaMessages[lightboxIdx + 1]
      : null;

  return (
    <div
      className={`w-full flex flex-col select-none ${
        compactMode
          ? "h-[520px] rounded-b-none"
          : "h-dvh w-screen fixed inset-0 z-40"
      } ${
        lightTheme
          ? "bg-[#f8f5fc] text-zinc-900"
          : "bg-[#0d0f17] text-zinc-100"
      }`}
    >
      {/* ==================== STANDALONE MESSENGER TOP BAR (MOBILE & TABLET & DESKTOP) ==================== */}
      {!compactMode && (
        <header
          className={`h-14 px-3 sm:px-5 border-b flex items-center justify-between gap-2 shrink-0 ${
            lightTheme
              ? "bg-white border-purple-200"
              : "bg-[#121521] border-white/[0.08]"
          }`}
        >
          {/* Left: Prominent Link Back to Cuttiebooru Main Site + Messenger Branding */}
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            {onBackToSite && (
              <button
                type="button"
                onClick={onBackToSite}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-pink-500/25 transition-all shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Cuttiebooru</span>
              </button>
            )}

            <div className="flex items-center gap-2 truncate">
              <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="font-black text-sm sm:text-base tracking-tight bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  CuttieMessenger
                </span>
                <span className="hidden md:inline text-[11px] text-zinc-400 ml-2">
                  Direct 1-on-1 Creator Chat & Media Lightbox
                </span>
              </div>
            </div>
          </div>

          {/* Right: Signed-In User Link to /signin + Theme Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/signin"
              title="Sign in or switch account on Sign In page"
              aria-label="Sign in or switch account"
              className={`py-1.5 text-xs font-bold flex items-center gap-2 transition-colors ${
                lightTheme
                  ? "text-zinc-800 hover:text-pink-400"
                  : "text-zinc-200 hover:text-pink-400"
              }`}
            >
              {currentUser && (
                <img
                  src={currentUser.avatarUrl}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              )}
              <span className="max-w-[72px] sm:max-w-[120px] md:max-w-[180px] truncate">
                {currentUser?.displayName || currentUser?.username || "Sign In"}
              </span>
            </a>

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                title="Toggle Dark / Light Messenger Theme"
                className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-pink-500/15 text-pink-400 transition-colors"
              >
                {lightTheme ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </header>
      )}

      {/* ==================== MAIN MULTI-PANE MESSENGER WORKSPACE ==================== */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* LEFT PANE: CONVERSATIONS LIST (Full width on mobile when in list view; fixed width on tablet/desktop) */}
        <aside
          className={`${
            mobileShowChat ? "hidden md:flex" : "flex"
          } w-full ${
            compactMode
              ? "md:w-56"
              : "md:w-80 lg:w-[350px] xl:w-[380px]"
          } flex-col border-r shrink-0 ${!compactMode ? "pb-16 md:pb-0" : ""} ${
            lightTheme
              ? "bg-white border-purple-200"
              : "bg-[#121521] border-white/[0.08]"
          }`}
        >
          {/* Search & Folder Filter Tabs (All | Unread | Verified) */}
          <div className="p-3 sm:p-4 border-b border-white/[0.08] space-y-3 shrink-0">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search creators or messages..."
                className={`w-full pl-9 pr-8 py-2 rounded-2xl border text-xs sm:text-sm focus:outline-none transition-all ${
                  lightTheme
                    ? "bg-purple-50/90 border-purple-200 text-zinc-900 focus:border-pink-500"
                    : "bg-[#1a1e2e] border-white/10 text-white focus:border-pink-500"
                }`}
              />
              {userSearchQuery && (
                <button
                  type="button"
                  onClick={() => setUserSearchQuery("")}
                  className="absolute right-2.5 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {!compactMode && (
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/20 border border-white/[0.06] text-xs font-bold">
                {(
                  [
                    { id: "all", label: "All Chats" },
                    { id: "unread", label: "Unread" },
                    { id: "verified", label: "Verified" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setChatFilterTab(tab.id)}
                    className={`py-1.5 rounded-lg transition-all ${
                      chatFilterTab === tab.id
                        ? "bg-pink-500 text-white shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable Conversation Threads */}
          <div className="overflow-y-auto flex-1 divide-y divide-white/[0.05]">
            {filteredPartners.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No conversations match this filter.
              </div>
            ) : (
              filteredPartners.map((partner) => {
                const thread = messages.filter(
                  (m) =>
                    (m.senderId === myId && m.receiverId === partner.id) ||
                    (m.senderId === partner.id && m.receiverId === myId)
                );
                const lastMsg =
                  thread.length > 0 ? thread[thread.length - 1] : null;
                const unreadCount = thread.filter(
                  (m) => m.senderId === partner.id && !m.isRead
                ).length;
                const hasPinned = thread.some((m) => m.isPinned);
                const isSelected = selectedPartner?.id === partner.id;

                return (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => {
                      onSelectPartner(partner.id);
                      setMobileShowChat(true);
                    }}
                    className={`w-full p-3.5 sm:px-4 flex items-start gap-3 text-left transition-all relative ${
                      isSelected
                        ? lightTheme
                          ? "bg-pink-50 border-r-4 border-pink-500"
                          : "bg-pink-500/[0.11] border-r-4 border-pink-500"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={partner.avatarUrl}
                        alt={partner.displayName}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-pink-500/30"
                      />
                      <span className="w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#121521] absolute bottom-0 right-0" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-sm truncate flex items-center gap-1">
                          {partner.displayName}
                          {partner.isVerified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                          )}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {hasPinned && (
                            <Pin className="w-3 h-3 text-pink-400 rotate-45" />
                          )}
                          {lastMsg && (
                            <span className="text-[10px] text-zinc-400">
                              {new Date(lastMsg.createdAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-400 truncate">
                        @{partner.username} · {partner.niche}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <p
                          className={`text-xs truncate ${
                            unreadCount > 0
                              ? "font-bold text-pink-300"
                              : "text-zinc-400"
                          }`}
                        >
                          {lastMsg
                            ? lastMsg.mediaType === "image"
                              ? `📷 Photo · ${lastMsg.text || "Image"}`
                              : lastMsg.mediaType === "video"
                              ? `🎬 Video · ${lastMsg.text || "Video"}`
                              : lastMsg.mediaType === "voice"
                              ? `🎤 Voice note (${lastMsg.mediaDuration})`
                              : lastMsg.text
                            : "Tap to start chatting..."}
                        </p>

                        {unreadCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500 text-white shrink-0">
                            {unreadCount}
                          </span>
                        ) : (
                          lastMsg &&
                          lastMsg.senderId === myId &&
                          (lastMsg.isRead ? (
                            <CheckCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          ))
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ==================== CENTER PANE: 1-ON-1 CHAT WORKSPACE ==================== */}
        {selectedPartner ? (
          <section
            className={`${
              mobileShowChat ? "flex" : "hidden md:flex"
            } flex-1 flex-col min-w-0 h-full relative ${
              lightTheme ? "bg-[#faf7fc]" : "bg-[#0d0f17]"
            }`}
          >
            {/* Chat Header (Responsive for Mobile, Tablet, Desktop) */}
            <div
              className={`px-3 sm:px-5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
                lightTheme
                  ? "bg-white border-purple-200"
                  : "bg-[#141826] border-white/[0.08]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Mobile Back to Chats List Button */}
                <button
                  type="button"
                  onClick={() => setMobileShowChat(false)}
                  className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-pink-400 shrink-0"
                  title="Back to conversation list"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div
                  onClick={() => setShowInfoDrawer(!showInfoDrawer)}
                  className="flex items-center gap-2.5 cursor-pointer group min-w-0"
                >
                  <div className="relative shrink-0">
                    <img
                      src={selectedPartner.avatarUrl}
                      alt={selectedPartner.displayName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-pink-500/40"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#141826] absolute bottom-0 right-0" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm group-hover:text-pink-400 truncate flex items-center gap-1">
                      {selectedPartner.displayName}
                      {selectedPartner.isVerified && (
                        <BadgeCheck className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      )}
                    </h3>
                    <p className="text-[11px] text-emerald-400 font-medium truncate">
                      online · @{selectedPartner.username}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Header Action Controls */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Search in Conversation */}
                <button
                  type="button"
                  onClick={() => setShowInChatSearch(!showInChatSearch)}
                  title="Search messages in this chat"
                  className={`p-2 rounded-xl border transition-all ${
                    showInChatSearch
                      ? "bg-pink-500/20 text-pink-300 border-pink-500/40"
                      : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
                  }`}
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Toggle Contact & Shared Media Info Drawer (Works on ALL screens!) */}
                {!compactMode && (
                  <button
                    type="button"
                    onClick={() => setShowInfoDrawer(!showInfoDrawer)}
                    title="Shared Media & Contact Info"
                    className={`p-2 rounded-xl border transition-all ${
                      showInfoDrawer
                        ? "bg-pink-500/20 text-pink-300 border-pink-500/40"
                        : "bg-white/5 text-zinc-300 border-white/10 hover:text-white"
                    }`}
                  >
                    {showInfoDrawer ? (
                      <PanelRightClose className="w-4 h-4" />
                    ) : (
                      <PanelRightOpen className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* In-Chat Search Bar */}
            {showInChatSearch && (
              <div className="px-4 py-2 bg-black/35 border-b border-white/10 flex items-center gap-2 shrink-0">
                <Search className="w-3.5 h-3.5 text-pink-400" />
                <input
                  type="text"
                  value={inChatSearch}
                  onChange={(e) => setInChatSearch(e.target.value)}
                  placeholder="Find text in this 1-on-1 conversation..."
                  className="flex-1 min-w-0 bg-transparent text-base sm:text-sm focus:outline-none text-white"
                />
                {inChatSearch && (
                  <button
                    type="button"
                    onClick={() => setInChatSearch("")}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Telegram Sticky Pinned Message Banner */}
            {latestPinnedMessage && (
              <div
                onClick={() => scrollToMessage(latestPinnedMessage.id)}
                className="px-4 py-2 bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-transparent border-b border-pink-500/25 flex items-center justify-between gap-3 cursor-pointer hover:bg-pink-500/20 transition-colors shrink-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-1 h-7 rounded-full bg-pink-500 shrink-0" />
                  <Pin className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 block">
                      Pinned Message ({pinnedMessagesList.length})
                    </span>
                    <p className="text-xs text-zinc-200 truncate">
                      {latestPinnedMessage.text || "Pinned Media Attachment"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPinMessage(latestPinnedMessage.id);
                  }}
                  title="Unpin message"
                  className="p-1 rounded-lg hover:bg-white/10 text-zinc-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Scrollable Messages Stream */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
              {displayedMessages.map((msg) => {
                const isMine = msg.senderId === myId;
                let reactionsMap: Record<string, string[]> = {};
                try {
                  reactionsMap = JSON.parse(msg.reactions || "{}");
                } catch {
                  reactionsMap = {};
                }

                return (
                  <div
                    key={msg.id}
                    id={`chat-msg-${msg.id}`}
                    className={`group flex flex-col ${
                      isMine ? "items-end" : "items-start"
                    } transition-all duration-300 ${
                      highlightedMsgId === msg.id
                        ? "ring-2 ring-pink-500 rounded-3xl p-1.5 bg-pink-500/10"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex items-end gap-2 max-w-[92%] sm:max-w-[78%] lg:max-w-[68%] ${
                        isMine ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {!isMine && (
                        <img
                          src={msg.sender.avatarUrl}
                          alt={msg.sender.displayName}
                          className="w-7 h-7 rounded-full object-cover shrink-0 mb-1"
                        />
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`relative rounded-2xl p-3 shadow-md space-y-2 ${
                          isMine
                            ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-br-sm"
                            : lightTheme
                            ? "bg-white border border-purple-200 text-zinc-900 rounded-bl-sm"
                            : "bg-[#1b1f30] text-zinc-100 border border-white/10 rounded-bl-sm"
                        }`}
                      >
                        {/* Forwarded Header */}
                        {msg.forwardedFromId && (
                          <div className="text-[11px] font-semibold opacity-85 flex items-center gap-1 border-b border-white/15 pb-1">
                            <Forward className="w-3 h-3" />
                            Forwarded from @{msg.forwardedFromId}
                          </div>
                        )}

                        {/* Telegram Quoted Reply Preview */}
                        {msg.replyTo && (
                          <div
                            onClick={() => scrollToMessage(msg.replyTo!.id)}
                            className="p-2 rounded-xl bg-black/25 border-l-2 border-pink-300 cursor-pointer text-xs space-y-0.5 hover:bg-black/35 transition-colors"
                          >
                            <span className="font-bold text-[11px] text-pink-200 block">
                              {msg.replyTo.sender?.displayName || "Reply"}
                            </span>
                            <p className="truncate opacity-85 text-[11px]">
                              {msg.replyTo.text || "Media attachment"}
                            </p>
                          </div>
                        )}

                        {/* Image or Video Media Attachment (Click opens Full-Screen Lightbox!) */}
                        {msg.mediaUrl &&
                          (msg.mediaType === "image" ||
                            msg.mediaType === "video") && (
                            <div
                              onClick={() => {
                                setLightboxMsg(msg);
                                setLightboxZoom(1);
                                setLightboxVideoPlaying(
                                  msg.mediaType === "video"
                                );
                              }}
                              className="relative rounded-xl overflow-hidden cursor-pointer group/media border border-white/15 bg-black/40 max-h-80"
                            >
                              {msg.mediaType === "video" ||
                              /\.(mp4|webm|mov)$/i.test(msg.mediaUrl) ? (
                                <video
                                  src={msg.mediaUrl}
                                  muted
                                  loop
                                  playsInline
                                  preload="metadata"
                                  className="w-full max-h-80 object-cover group-hover/media:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <img
                                  src={msg.mediaUrl}
                                  alt="Chat attachment"
                                  className="w-full max-h-80 object-cover group-hover/media:scale-105 transition-transform duration-300"
                                />
                              )}
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="px-3 py-1.5 rounded-full bg-black/80 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md">
                                  <ZoomIn className="w-3.5 h-3.5 text-pink-400" />
                                  Open Media Lightbox
                                </span>
                              </div>
                              {msg.mediaType === "video" && (
                                <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-purple-600/90 text-white text-[11px] font-bold flex items-center gap-1 shadow">
                                  <Play className="w-3 h-3 fill-current" />
                                  {msg.mediaDuration || "0:15"}
                                </span>
                              )}
                            </div>
                          )}

                        {/* Telegram Voice Note Waveform Player */}
                        {msg.mediaType === "voice" && (
                          <div className="flex items-center gap-3 min-w-[210px] sm:min-w-[240px] py-1">
                            <button
                              type="button"
                              onClick={() =>
                                setPlayingVoiceId(
                                  playingVoiceId === msg.id ? null : msg.id
                                )
                              }
                              className="w-9 h-9 rounded-full bg-white text-pink-600 flex items-center justify-center shadow shrink-0"
                            >
                              {playingVoiceId === msg.id ? (
                                <Pause className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              )}
                            </button>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-end gap-0.5 h-5">
                                {[
                                  40, 75, 55, 95, 65, 85, 45, 90, 60, 100, 70,
                                  50, 80, 60, 40, 75, 50,
                                ].map((h, i) => (
                                  <span
                                    key={i}
                                    style={{ height: `${h}%` }}
                                    className={`flex-1 rounded-full transition-all ${
                                      playingVoiceId === msg.id
                                        ? "bg-amber-300 animate-pulse"
                                        : "bg-white/75"
                                    }`}
                                  />
                                ))}
                              </div>
                              <div className="flex justify-between text-[10px] opacity-85">
                                <span>
                                  {playingVoiceId === msg.id
                                    ? "Playing voice note..."
                                    : "Voice Note"}
                                </span>
                                <span>{msg.mediaDuration || "0:12"}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Message Text */}
                        {msg.text && (
                          <p className="text-xs sm:text-sm leading-relaxed break-words">
                            {msg.text}
                          </p>
                        )}

                        {/* Timestamp, Edited, Pinned, Self-Destruct & Read Receipt */}
                        <div className="flex items-center justify-end gap-1.5 text-[10px] opacity-80 pt-0.5">
                          {msg.selfDestructSec > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-amber-200 font-bold">
                              <Flame className="w-3 h-3" />
                              {msg.selfDestructSec}s
                            </span>
                          )}
                          {msg.isPinned && <Pin className="w-3 h-3" />}
                          {msg.isEdited && <span>edited</span>}
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMine &&
                            (msg.isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Emoji Reaction Pills on Message */}
                    {Object.keys(reactionsMap).length > 0 && (
                      <div
                        className={`flex flex-wrap gap-1 mt-1 ${
                          isMine ? "mr-1" : "ml-9"
                        }`}
                      >
                        {Object.entries(reactionsMap).map(([emoji, uIds]) => {
                          const iReacted = uIds.includes(myId);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => onReactMessage(msg.id, emoji)}
                              className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border transition-all ${
                                iReacted
                                  ? "bg-pink-500/25 border-pink-500 text-pink-200"
                                  : "bg-white/5 border-white/10 text-zinc-300"
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px] font-bold">
                                {uIds.length}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Telegram Action Bar (Visible on hover on desktop & tap on mobile) */}
                    <div
                      className={`opacity-85 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex flex-wrap items-center gap-0.5 sm:gap-1 mt-1 px-2 py-1 rounded-full bg-black/80 border border-white/15 backdrop-blur-md text-zinc-300 ${
                        isMine ? "mr-1" : "ml-9"
                      }`}
                    >
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => onReactMessage(msg.id, emoji)}
                          className="hover:scale-125 transition-transform px-1 text-xs"
                          title={`React ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                      <div className="h-3 w-px bg-white/20 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(msg);
                          setEditingMessage(null);
                        }}
                        title="Reply"
                        className="p-1 hover:text-pink-400"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onPinMessage(msg.id)}
                        title={msg.isPinned ? "Unpin" : "Pin message"}
                        className={`p-1 ${
                          msg.isPinned
                            ? "text-pink-400"
                            : "hover:text-pink-400"
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setForwardingMessage(msg)}
                        title="Forward message"
                        className="p-1 hover:text-purple-400"
                      >
                        <Forward className="w-3.5 h-3.5" />
                      </button>
                      {isMine && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessage(msg);
                            setTextInput(msg.text);
                            setReplyingTo(null);
                          }}
                          title="Edit message"
                          className="p-1 hover:text-sky-400"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteMessage(msg.id)}
                        title="Delete message"
                        className="p-1 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply / Edit Banner + Media Preview Above Composer */}
            {(replyingTo || editingMessage || attachedUrl) && (
              <div className="px-4 py-2.5 bg-[#1b1e2e] border-t border-white/10 space-y-2 shrink-0">
                {replyingTo && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Reply className="w-4 h-4 text-pink-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-pink-400 block">
                          Replying to {replyingTo.sender.displayName}
                        </span>
                        <p className="text-zinc-300 truncate">
                          {replyingTo.text || "Media attachment"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1 text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {editingMessage && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-sky-400" />
                      <span className="font-bold text-sky-400">
                        Editing message
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMessage(null);
                        setTextInput("");
                      }}
                      className="p-1 text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {attachedUrl && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={attachedUrl}
                        alt="Attachment preview"
                        className="w-12 h-12 rounded-xl object-cover border border-pink-500/40"
                      />
                      <div>
                        <span className="text-xs font-bold text-pink-300 uppercase block">
                          Attached {attachedType || "Media"}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Ready to send with Lightbox support
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedUrl("");
                        setAttachedType("");
                      }}
                      className="p-1.5 rounded-lg bg-white/10 text-zinc-300 hover:text-rose-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Popover Sticker Tray */}
            {showStickerTray && (
              <div className="px-4 py-3 bg-[#191c2b] border-t border-white/10 space-y-2 shrink-0">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-bold text-pink-400">
                    Send Emoji
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowStickerTray(false)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={async () => {
                        setShowStickerTray(false);
                        await onSendMessage({
                          receiverId: selectedPartner.id,
                          text: emoji,
                        });
                      }}
                      className="p-2 rounded-xl border border-white/10 bg-white/[0.04] hover:border-pink-500/50 flex items-center gap-2 text-left"
                    >
                      <span className="text-2xl">{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popover Media Upload Menu (Upload Image, Upload Video, or Quick Sample) */}
            {showAttachMenu && (
              <div className="px-4 py-3 bg-[#191c2b] border-t border-white/10 space-y-3 shrink-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-pink-400">
                    Upload Image or Video to Chat (With Lightbox)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(false)}
                  >
                    <X className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => imageFileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 text-xs font-bold flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Upload Image File
                  </button>
                  <button
                    type="button"
                    onClick={() => videoFileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Film className="w-4 h-4" />
                    Upload Video File
                  </button>
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelected(e, "image")}
                    className="hidden"
                  />
                  <input
                    ref={videoFileInputRef}
                    type="file"
                    accept="video/*,image/*"
                    onChange={(e) => handleFileSelected(e, "video")}
                    className="hidden"
                  />
                </div>

                {/* Quick SFW Library Attachments */}
                <div className="space-y-1.5 pt-1 border-t border-white/[0.08]">
                  <span className="text-[11px] font-semibold text-zinc-400 block">
                    Or select from Booru artwork & video library:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      {
                        title: "Anime Art",
                        url: "/sfw/image/148a0f0eae39998a954d56c2290dc65e.png",
                        type: "image" as const,
                      },
                      {
                        title: "Manga Art",
                        url: "/sfw/image/sample_2ccb3796c550e474c5162e781392f1aa.jpg",
                        type: "image" as const,
                      },
                      {
                        title: "Video Loop",
                        url: "/sfw/video/18a140f0b65bb1dfa2b7aeaff6fc366e.mp4",
                        type: "video" as const,
                        thumb: "/sfw/video/thumb_18a140f0b65bb1dfa2b7aeaff6fc366e.jpg",
                      },
                      {
                        title: "Cosplay Clip",
                        url: "/sfw/video/1face9fa56fedfdaf2a600710e3ab977.mp4",
                        type: "video" as const,
                        thumb: "/sfw/video/thumb_1face9fa56fedfdaf2a600710e3ab977.jpg",
                      },
                    ].map((sample) => (
                      <button
                        key={sample.url}
                        type="button"
                        onClick={() => {
                          setAttachedUrl(sample.url);
                          setAttachedType(sample.type);
                          setAttachedDuration(sample.type === "video" ? "0:14" : "");
                          setShowAttachMenu(false);
                        }}
                        className="group/sample relative aspect-video rounded-xl overflow-hidden border border-white/10 hover:border-pink-500 transition-all bg-black"
                      >
                        <img
                          src={sample.thumb || sample.url}
                          alt={sample.title}
                          className="w-full h-full object-cover group-hover/sample:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover/sample:bg-black/20 flex items-end p-1">
                          <span className="text-[9px] font-bold text-white truncate drop-shadow">
                            {sample.title}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Message Composer Bar */}
            <form
              onSubmit={handleSubmitMessage}
              className={`p-2.5 sm:p-3 border-t flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                lightTheme
                  ? "bg-white border-purple-200"
                  : "bg-[#141826] border-white/[0.08]"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(!showAttachMenu);
                  setShowStickerTray(false);
                }}
                title="Upload Image or Video"
                className="p-2.5 rounded-full bg-white/5 hover:bg-pink-500/20 text-pink-400 transition-colors shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowStickerTray(!showStickerTray);
                  setShowAttachMenu(false);
                }}
                title="Stickers & Reactions"
                className="p-2.5 rounded-full bg-white/5 hover:bg-purple-500/20 text-purple-400 transition-colors shrink-0"
              >
                <Smile className="w-4 h-4" />
              </button>

              {isRecordingVoice ? (
                <div className="flex-1 flex items-center justify-between px-3 sm:px-4 py-2 rounded-full bg-rose-500/20 border border-rose-500/40 text-xs text-rose-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="font-bold">
                      Recording... 0:{String(recordSeconds).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(false)}
                      className="text-zinc-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendVoiceNote}
                      className="px-3 py-1 rounded-full bg-rose-500 text-white font-bold flex items-center gap-1"
                    >
                      <Square className="w-3 h-3 fill-current" /> Send
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={`Write a message to @${selectedPartner.username}...`}
                    className={`flex-1 min-w-0 px-4 py-2.5 rounded-full border text-xs sm:text-sm focus:outline-none ${
                      lightTheme
                        ? "bg-purple-50 border-purple-200 text-zinc-900 focus:border-pink-500"
                        : "bg-[#1c2033] border-white/10 text-white focus:border-pink-500"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => setIsRecordingVoice(true)}
                    title="Record Telegram Voice Note"
                    className="p-2.5 rounded-full bg-white/5 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400 transition-colors shrink-0"
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <button
                    type="submit"
                    disabled={!textInput.trim() && !attachedUrl}
                    className="p-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25 disabled:opacity-40 transition-all shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </>
              )}
            </form>
          </section>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div className="space-y-2 max-w-xs">
              <Sparkles className="w-8 h-8 text-pink-400 mx-auto" />
              <h3 className="text-base font-bold">Select a chat</h3>
              <p className="text-xs text-zinc-400">
                Choose a creator on the left to start a 1-on-1 conversation.
              </p>
            </div>
          </div>
        )}

        {/* ==================== RIGHT PANE: SHARED MEDIA & USER INFO DRAWER (Responsive Overlay on Mobile/Tablet, Docked on Desktop) ==================== */}
        {!compactMode && showInfoDrawer && selectedPartner && (
          <aside
            className={`fixed inset-y-0 right-0 z-40 w-full sm:w-80 xl:static xl:w-80 flex flex-col border-l overflow-y-auto p-4 space-y-5 shadow-2xl xl:shadow-none ${
              lightTheme
                ? "bg-white border-purple-200 text-zinc-900"
                : "bg-[#121521] border-white/[0.08] text-zinc-100"
            }`}
          >
            {/* Top Close Button for Mobile/Tablet Slide-over */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-pink-400">
                User Info & Shared Media
              </span>
              <button
                type="button"
                onClick={() => setShowInfoDrawer(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Partner Banner & Avatar Card */}
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20">
              <div className="h-20 bg-gradient-to-r from-pink-500/30 to-purple-600/30 relative">
                {selectedPartner.headerUrl && (
                  <img
                    src={selectedPartner.headerUrl}
                    alt={selectedPartner.displayName}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="px-4 pb-4 -mt-8 relative z-10 text-center space-y-2">
                <img
                  src={selectedPartner.avatarUrl}
                  alt={selectedPartner.displayName}
                  className="w-16 h-16 rounded-full object-cover mx-auto ring-4 ring-[#121521]"
                />
                <div>
                  <h4 className="font-bold text-sm flex items-center justify-center gap-1">
                    {selectedPartner.displayName}
                    {selectedPartner.isVerified && (
                      <BadgeCheck className="w-4 h-4 text-pink-400" />
                    )}
                  </h4>
                  <p className="text-xs text-zinc-400">
                    @{selectedPartner.username} · {selectedPartner.niche}
                  </p>
                </div>
                <p className="text-xs text-zinc-300 line-clamp-3">
                  {selectedPartner.bio}
                </p>
                <button
                  type="button"
                  onClick={() => onSelectCreatorProfile(selectedPartner)}
                  className="w-full py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-xs font-bold text-pink-300 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Open Creator Profile on Site</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tabs inside Info Drawer: Media | Voice | Pinned */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/25 border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setInfoDrawerTab("media")}
                className={`py-1.5 rounded-lg ${
                  infoDrawerTab === "media"
                    ? "bg-pink-500 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Media ({sharedMediaMessages.length})
              </button>
              <button
                type="button"
                onClick={() => setInfoDrawerTab("voice")}
                className={`py-1.5 rounded-lg ${
                  infoDrawerTab === "voice"
                    ? "bg-pink-500 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Voice ({sharedVoiceMessages.length})
              </button>
              <button
                type="button"
                onClick={() => setInfoDrawerTab("pinned")}
                className={`py-1.5 rounded-lg ${
                  infoDrawerTab === "pinned"
                    ? "bg-pink-500 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Pinned ({pinnedMessagesList.length})
              </button>
            </div>

            {/* Tab 1: Shared Photos & Videos Grid (Click opens Lightbox!) */}
            {infoDrawerTab === "media" && (
              <div className="space-y-2">
                {sharedMediaMessages.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">
                    No photos or videos shared yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {sharedMediaMessages.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setLightboxMsg(m);
                          setLightboxZoom(1);
                          setLightboxVideoPlaying(m.mediaType === "video");
                        }}
                        className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group"
                      >
                        <img
                          src={m.mediaUrl}
                          alt="Shared media"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                        {m.mediaType === "video" && (
                          <span className="absolute bottom-1 right-1 p-1 rounded-full bg-black/75 text-white">
                            <Play className="w-2.5 h-2.5 fill-current" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Voice Notes */}
            {infoDrawerTab === "voice" && (
              <div className="space-y-2">
                {sharedVoiceMessages.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">
                    No voice notes recorded yet.
                  </p>
                ) : (
                  sharedVoiceMessages.map((vm) => (
                    <div
                      key={vm.id}
                      onClick={() => {
                        setShowInfoDrawer(false);
                        scrollToMessage(vm.id);
                      }}
                      className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                        Voice ({vm.mediaDuration})
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(vm.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Pinned Messages */}
            {infoDrawerTab === "pinned" && (
              <div className="space-y-2">
                {pinnedMessagesList.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">
                    No pinned messages in this chat.
                  </p>
                ) : (
                  pinnedMessagesList.map((pm) => (
                    <div
                      key={pm.id}
                      onClick={() => {
                        setShowInfoDrawer(false);
                        scrollToMessage(pm.id);
                      }}
                      className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 space-y-1 cursor-pointer text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-pink-400 font-bold">
                        <span>@{pm.sender.username}</span>
                        <Pin className="w-3 h-3" />
                      </div>
                      <p className="text-zinc-200 line-clamp-2">
                        {pm.text || "Pinned media attachment"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </aside>
        )}
      </div>


      {/* ==================== FORWARD MESSAGE MODAL ==================== */}
      {forwardingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#171925] p-5 space-y-4 text-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2 text-purple-400">
                <Forward className="w-4 h-4" />
                Forward Message To...
              </h3>
              <button
                type="button"
                onClick={() => setForwardingMessage(null)}
                className="p-1 rounded-lg bg-white/5 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {partners.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={async () => {
                    await onForwardMessage(forwardingMessage.id, p.id);
                    setForwardingMessage(null);
                    onSelectPartner(p.id);
                  }}
                  className="w-full p-2.5 rounded-2xl hover:bg-pink-500/20 border border-white/10 flex items-center gap-3 text-left transition-all"
                >
                  <img
                    src={p.avatarUrl}
                    alt={p.displayName}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-xs font-bold">{p.displayName}</p>
                    <p className="text-[10px] text-zinc-400">@{p.username}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MESSAGING MEDIA LIGHTBOX ==================== */}
      {lightboxMsg && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-3 sm:p-5 select-none">
          {/* Top Lightbox Controls: Sender info, Zoom In/Out/Reset, Download, Close */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={lightboxMsg.sender.avatarUrl}
                alt={lightboxMsg.sender.displayName}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-pink-500 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate flex items-center gap-1">
                  {lightboxMsg.sender.displayName}
                  <span className="text-xs text-zinc-400 font-normal">
                    @{lightboxMsg.sender.username}
                  </span>
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  Shared in Direct Messages ·{" "}
                  {new Date(lightboxMsg.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() =>
                  setLightboxZoom((z) =>
                    Math.max(0.5, Number((z - 0.25).toFixed(2)))
                  )
                }
                title="Zoom Out"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-zinc-300 min-w-[44px] text-center">
                {Math.round(lightboxZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setLightboxZoom((z) =>
                    Math.min(3, Number((z + 0.25).toFixed(2)))
                  )
                }
                title="Zoom In"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxZoom(1)}
                title="Reset Zoom"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <a
                href={lightboxMsg.mediaUrl}
                download={`cuttiebooru-dm-${lightboxMsg.id}.jpg`}
                target="_blank"
                rel="noreferrer"
                title="Download Media"
                className="p-2 rounded-xl bg-white/10 hover:bg-pink-500 text-white"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxMsg(null)}
                title="Close Lightbox"
                className="p-2 rounded-xl bg-pink-500 text-white hover:bg-pink-600 ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Media Viewport with Previous / Next Navigation */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden my-2 sm:my-4">
            {prevMediaMsg && (
              <button
                type="button"
                onClick={() => {
                  setLightboxMsg(prevMediaMsg);
                  setLightboxZoom(1);
                }}
                className="absolute left-2 sm:left-4 z-10 p-2.5 sm:p-3 rounded-full bg-black/75 hover:bg-pink-500 text-white border border-white/15 transition-all"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            <div className="relative flex items-center justify-center max-h-full max-w-full overflow-auto">
              {lightboxMsg.mediaType === "video" ||
              /\.(mp4|webm|mov)$/i.test(lightboxMsg.mediaUrl) ? (
                <video
                  key={lightboxMsg.mediaUrl}
                  src={lightboxMsg.mediaUrl}
                  controls
                  autoPlay={lightboxVideoPlaying}
                  loop
                  playsInline
                  style={{ transform: `scale(${lightboxZoom})` }}
                  className="max-h-[70dvh] w-auto object-contain rounded-xl transition-transform duration-200"
                />
              ) : (
                <img
                  src={lightboxMsg.mediaUrl}
                  alt={lightboxMsg.text || "Shared media"}
                  style={{ transform: `scale(${lightboxZoom})` }}
                  className="max-h-[70dvh] w-auto object-contain rounded-xl transition-transform duration-200"
                />
              )}
            </div>

            {nextMediaMsg && (
              <button
                type="button"
                onClick={() => {
                  setLightboxMsg(nextMediaMsg);
                  setLightboxZoom(1);
                }}
                className="absolute right-2 sm:right-4 z-10 p-2.5 sm:p-3 rounded-full bg-black/75 hover:bg-pink-500 text-white border border-white/15 transition-all"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
          </div>

          {/* Bottom Caption & Thumbnail Strip */}
          <div className="space-y-2.5 border-t border-white/10 pt-3 text-center">
            {lightboxMsg.text && (
              <p className="text-xs sm:text-sm text-zinc-200 max-w-2xl mx-auto px-2">
                {lightboxMsg.text}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
              {sharedMediaMessages.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setLightboxMsg(m);
                    setLightboxZoom(1);
                  }}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                    m.id === lightboxMsg.id
                      ? "border-pink-500 scale-110"
                      : "border-white/20 opacity-50 hover:opacity-100"
                  }`}
                >
                  <img
                    src={m.mediaUrl}
                    alt="Thumb"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION BAR (Strictly 5 items: Home, Explore, Upload, Messages, Account)
      ========================================================================= */}
      {!compactMode && !mobileShowChat && (
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
              if (onBackToSite) onBackToSite();
              else router.push("/");
            }}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          {/* 2. Explore */}
          <button
            type="button"
            onClick={() => router.push("/?tab=explore")}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>Explore</span>
          </button>

          {/* 3. Upload Work (Prominent Center Action) */}
          <button
            type="button"
            onClick={() => router.push("/#upload")}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold text-white transition-transform hover:scale-105"
          >
            <div className="w-8 h-8 -mt-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <UploadIcon className="w-4 h-4 text-white" />
            </div>
            <span>Upload</span>
          </button>

          {/* 4. Messages (Active) */}
          <button
            type="button"
            onClick={() => setMobileShowChat(false)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold text-pink-400 font-extrabold transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Messages</span>
          </button>

          {/* 5. Account / Avatar Menu (Opens Avatar Modal right from bottom nav) */}
          <button
            type="button"
            onClick={() => setShowAvatarModal(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
            title="Account Menu"
          >
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-pink-500/50"
              />
            ) : (
              <UserIcon className="w-4 h-4" />
            )}
            <span>Account</span>
          </button>
        </nav>
      )}

      {/* =========================================================================
          AVATAR ICON MODAL
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

            {/* Menu Links */}
            <div className="space-y-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setShowAvatarModal(false);
                  router.push("/?tab=notifications");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-pink-400" />
                  <span>Notifications & Alerts</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              {currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAvatarModal(false);
                    router.push(`/user/${currentUser.username}`);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <UserIcon className="w-4 h-4 text-purple-400" />
                    <span>My User Page</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowAvatarModal(false);
                  router.push("/comics?tab=dashboard");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-pink-400" />
                  <span>Manga Creator Studio</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAvatarModal(false);
                  router.push("/?tab=collections");
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
                  setShowAvatarModal(false);
                  router.push("/?tab=tags");
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
                  setShowAvatarModal(false);
                  router.push("/?tab=creators");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Top Creators</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAvatarModal(false);
                  router.push("/settings");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <span>Account & Privacy Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              {currentUser?.role === "admin" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAvatarModal(false);
                    router.push("/admin");
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Admin Dashboard</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400" />
                </button>
              )}

            </div>

            {/* 1-Click Access to All 3 Accounts */}
            <div className="pt-2 border-t border-white/10">
              <QuickUserSwitcher
                currentUsername={currentUser?.username}
                onSwitched={() => {
                  setShowAvatarModal(false);
                  router.refresh();
                  window.location.reload();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
