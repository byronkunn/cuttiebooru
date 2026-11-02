"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, Loader2, Shield } from "lucide-react";
import type { User } from "@/types/cuttiebooru";

export const QUICK_SWITCH_ACCOUNTS = [
  {
    username: "byron",
    displayName: "Byron",
    role: "Admin",
    isAdmin: true,
    avatarUrl: "/sfw/avatar/0738955ca929985f39921b4876053170.png",
    description: "Site Owner & Admin",
  },
  {
    username: "sakura",
    displayName: "Sakura Star",
    role: "Creator",
    isAdmin: false,
    avatarUrl: "/sfw/avatar/fa238b1ca4a1cc8f2f0fe1625a4dd295.png",
    description: "Anime & Fantasy Illustrator",
  },
  {
    username: "luna",
    displayName: "Luna Velvet",
    role: "Creator",
    isAdmin: false,
    avatarUrl: "/sfw/avatar/sample_07acb23be6e4bea15d091117693849b2.jpg",
    description: "Cosplay & 3D Artist",
  },
  {
    username: "hana",
    displayName: "Hana Bloom",
    role: "Creator",
    isAdmin: false,
    avatarUrl: "/sfw/avatar/sample_1cc3b7361bda35f6bf0f78d8cb47640f.jpg",
    description: "Manga Artist & Story Author",
  },
];

export const THREE_USERS = QUICK_SWITCH_ACCOUNTS;

interface QuickUserSwitcherProps {
  currentUsername?: string;
  onSwitched?: (user: User) => void;
}

export function QuickUserSwitcher({
  currentUsername,
  onSwitched,
}: QuickUserSwitcherProps) {
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const handleQuickSwitch = async (username: string) => {
    if (username === currentUsername || switching) return;
    setSwitching(username);
    setSwitchError(null);
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "signin",
          username,
          password: "Killcartman22@",
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        if (onSwitched) onSwitched(data.user);
        router.refresh();
        window.location.reload();
      } else {
        setSwitchError(data.error || "Failed to switch user");
      }
    } catch {
      setSwitchError("Failed to switch user");
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="space-y-2 pt-2 border-t border-white/10">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          1-Click Switch Account
        </span>
      </div>

      {switchError && (
        <p className="text-[11px] text-rose-400 px-1">{switchError}</p>
      )}

      <div className="space-y-1">
        {THREE_USERS.map((u) => {
          const isActive = u.username === currentUsername;
          const isBusy = switching === u.username;

          return (
            <button
              key={u.username}
              type="button"
              disabled={isBusy}
              onClick={() => handleQuickSwitch(u.username)}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all group ${
                isActive
                  ? "bg-pink-500/15 border border-pink-500/30 text-white"
                  : "bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={u.avatarUrl}
                  alt={u.displayName}
                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">
                      {u.displayName}
                    </span>
                    {u.isAdmin ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5" /> Admin
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                        Creator
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">
                    @{u.username}
                  </p>
                </div>
              </div>

              <div className="shrink-0 ml-2">
                {isBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
                ) : isActive ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Check className="w-2.5 h-2.5" /> Active
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-zinc-500 group-hover:text-pink-300">
                    Switch
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
