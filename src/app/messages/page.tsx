"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DirectMessage, User } from "@/types/cuttiebooru";
import { MessagesView } from "@/components/MessagesView";

export default function StandaloneMessengerPage() {
  const router = useRouter();
  const [activeUserId, setActiveUserId] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [activePartnerId, setActivePartnerId] = useState("user_kitsune");
  const [lightTheme, setLightTheme] = useState(false);

  const loadMessengerData = useCallback(
    async (uid = activeUserId) => {
      try {
        const res = await fetch(`/api/bootstrap?userId=${uid}`);
        const data = await res.json();
        if (res.ok) {
          setCurrentUser(data.currentUser);
          setActiveUserId(data.currentUser?.id || "");
          setUsers(data.users || []);
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error("Failed to load messenger data:", err);
      }
    },
    [activeUserId]
  );

  useEffect(() => {
    loadMessengerData(activeUserId);
  }, [activeUserId, loadMessengerData]);

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

  return (
    <MessagesView
      currentUser={currentUser}
      users={users}
      messages={messages}
      activePartnerId={activePartnerId}
      lightTheme={lightTheme}
      compactMode={false}
      onBackToSite={() => router.push("/")}
      onToggleTheme={() => setLightTheme(!lightTheme)}
      onSwitchUser={() => router.push("/signin")}
      onSelectPartner={(pid) => setActivePartnerId(pid)}
      onSelectCreatorProfile={() => router.push("/")}
      onSendMessage={handleSendMessage}
      onEditMessage={handleEditMessage}
      onDeleteMessage={handleDeleteMessage}
      onPinMessage={handlePinMessage}
      onReactMessage={handleReactMessage}
      onForwardMessage={handleForwardMessage}
      onMarkConversationRead={handleMarkConversationRead}
    />
  );
}

