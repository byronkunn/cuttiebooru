"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, X, Palette, Sparkles, Moon, Sun } from "lucide-react";

export interface ThemeOption {
  id: string;
  name: string;
  tagline: string;
  mode: "dark" | "light";
  badge: string;
  preview: {
    bg: string;
    card: string;
    accent: string;
    border: string;
    text: string;
  };
}

export const SITE_THEMES: ThemeOption[] = [
  {
    id: "dark",
    name: "Dark Charcoal",
    tagline: "Deep obsidian charcoal with glowing neon pink & purple highlights (Default)",
    mode: "dark",
    badge: "Default",
    preview: {
      bg: "#0f1016",
      card: "#181a24",
      accent: "#ec4899",
      border: "#3f3f46",
      text: "#ffffff",
    },
  },
  {
    id: "sakura",
    name: "Sakura Blossom",
    tagline: "Crisp, high-contrast light aesthetic with soft lavender & dark readable text",
    mode: "light",
    badge: "Light Mode",
    preview: {
      bg: "#faf7fc",
      card: "#ffffff",
      accent: "#db2777",
      border: "#d8b4fe",
      text: "#0f172a",
    },
  },
  {
    id: "amoled",
    name: "Midnight AMOLED",
    tagline: "True pitch-black #000000 background for maximum OLED contrast and battery saving",
    mode: "dark",
    badge: "OLED",
    preview: {
      bg: "#000000",
      card: "#0d0d11",
      accent: "#f43f8e",
      border: "#27272a",
      text: "#ffffff",
    },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    tagline: "Deep navy indigo with radiant electric cyan & hot magenta neon accents",
    mode: "dark",
    badge: "Vibrant",
    preview: {
      bg: "#090a18",
      card: "#12152e",
      accent: "#06b6d4",
      border: "#0e7490",
      text: "#ffffff",
    },
  },
  {
    id: "matcha",
    name: "Zen Matcha",
    tagline: "Botanical dark forest green with serene jade, mint, and leaf accents",
    mode: "dark",
    badge: "Botanical",
    preview: {
      bg: "#0a130f",
      card: "#122019",
      accent: "#10b981",
      border: "#059669",
      text: "#f0fdf4",
    },
  },
  {
    id: "sunset",
    name: "Sunset Ember",
    tagline: "Warm twilight plum with golden dusk ember & orange gradient glow",
    mode: "dark",
    badge: "Warm",
    preview: {
      bg: "#150d1b",
      card: "#241530",
      accent: "#f97316",
      border: "#c2410c",
      text: "#fff7ed",
    },
  },
];

export function applyThemeToDocument(themeId: string) {
  if (typeof window === "undefined") return;
  const theme = SITE_THEMES.find((option) => option.id === themeId);
  if (!theme) throw new Error(`Unknown appearance theme: ${themeId}`);
  const body = document.body;
  SITE_THEMES.forEach((t) => body.classList.remove(`theme-${t.id}`));
  body.classList.remove("light-theme");

  body.classList.add(`theme-${themeId}`);
  if (themeId === "sakura") {
    body.classList.add("light-theme");
  }
  document.documentElement.classList.toggle("dark", theme.mode === "dark");
  document.documentElement.style.colorScheme = theme.mode;
  try {
    localStorage.setItem("cuttiebooru-theme", themeId);
  } catch (error) {
    console.error("Unable to save appearance preference", error);
    throw new Error("Theme applied, but your browser could not save it. It may reset after reloading.");
  }
}

export function getStoredTheme(): string {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem("cuttiebooru-theme");
    if (stored && !SITE_THEMES.some((theme) => theme.id === stored)) {
      console.warn("Unknown saved appearance preference; using default theme");
    }
    return SITE_THEMES.find((theme) => theme.id === stored)?.id || "dark";
  } catch (error) {
    console.error("Unable to read appearance preference", error);
    return "dark";
  }
}

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onSelectTheme: (themeId: string) => void;
}

export function AppearanceModal({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}: AppearanceModalProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage("");
    const previousFocus = document.activeElement;
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button");
      if (!buttons?.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Site Appearance" tabIndex={-1} className="relative w-full max-w-lg rounded-3xl bg-[#141624] border border-white/15 p-5 sm:p-6 shadow-2xl text-white space-y-5 z-10 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30 text-white">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Site Appearance</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40">
                  {SITE_THEMES.length} Themes
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Choose your favorite visual theme. All themes ensure crystal-clear text readability.
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close appearance"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && <p role="alert" className="text-sm text-amber-500">{errorMessage}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SITE_THEMES.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                type="button"
                aria-label={theme.name}
                aria-pressed={isSelected}
                key={theme.id}
                onClick={() => {
                  onSelectTheme(theme.id);
                  try {
                    applyThemeToDocument(theme.id);
                    setErrorMessage("");
                  } catch (error) {
                    setErrorMessage(error instanceof Error ? error.message : "Unable to change appearance.");
                  }
                }}
                className={`group relative text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? "bg-pink-500/10 border-pink-500 ring-2 ring-pink-500/40 shadow-lg shadow-pink-500/20"
                    : "bg-white/[0.04] border-white/10 hover:border-white/30 hover:bg-white/[0.07]"
                }`}
              >
                {/* Theme Name & Selected Checkmark */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white group-hover:text-pink-300 transition-colors">
                        {theme.name}
                      </span>
                      {theme.mode === "light" ? (
                        <Sun className="w-3 h-3 text-amber-400" />
                      ) : (
                        <Moon className="w-3 h-3 text-purple-400" />
                      )}
                    </div>
                    <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                      {theme.badge}
                    </span>
                  </div>

                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center shrink-0 shadow">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-white/20 group-hover:border-white/40 shrink-0" />
                  )}
                </div>

                {/* Live Swatch Preview */}
                <div
                  className="rounded-xl p-2.5 border flex items-center justify-between"
                  style={{
                    backgroundColor: theme.preview.bg,
                    borderColor: theme.preview.border,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-md shadow-sm"
                      style={{ backgroundColor: theme.preview.accent }}
                    />
                    <div
                      className="w-4 h-4 rounded-md shadow-sm"
                      style={{ backgroundColor: theme.preview.card }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: theme.preview.text }}
                  >
                    Aa Preview
                  </span>
                </div>

                {/* Tagline */}
                <p className="text-[11px] text-zinc-400 leading-tight">
                  {theme.tagline}
                </p>
              </button>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Theme auto-saves to your browser</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
