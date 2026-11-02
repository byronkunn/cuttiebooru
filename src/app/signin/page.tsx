"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, LogIn } from "lucide-react";
import { QuickUserSwitcher } from "@/components/QuickUserSwitcher";

type Account = { id: string; username: string; displayName: string; role?: string };
const field =
  "w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500 transition-colors";

export default function SignInPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d) => setAccount(d.user))
      .catch(() => setError("Could not load account"));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, username, displayName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to sign in");
      router.push("/");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/account", { method: "DELETE" });
    setAccount(null);
    router.push("/");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#0f1016] text-white p-4 sm:p-6 flex items-center justify-center">
      <div className="w-full max-w-md space-y-5">
        {/* Navigation Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-400 hover:text-pink-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cuttiebooru</span>
        </Link>

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <span>{mode === "signin" ? "Sign In / Switch" : "Create Account"}</span>
            <Sparkles className="w-5 h-5 text-pink-400" />
          </h1>
          <p className="text-xs text-zinc-400">
            {mode === "signin"
              ? "Sign in with your username or email and password."
              : "Register a new creator account on Cuttiebooru."}
          </p>
        </div>

        {/* Current Active User Status */}
        {account && (
          <div className="rounded-2xl border border-white/10 bg-[#161825] p-3.5 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-white">Signed in as @{account.username}</p>
                <p className="text-[10px] text-zinc-400">{account.displayName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="px-3 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/20 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}

        {/* 1-Click Fast Switcher for Core Accounts */}
        <div className="rounded-3xl bg-[#141622] border border-white/10 p-4 shadow-xl">
          <QuickUserSwitcher
            currentUsername={account?.username}
            onSwitched={() => {
              router.push("/");
              router.refresh();
            }}
          />
        </div>

        {/* Standard Manual Credentials Form */}
        <form onSubmit={submit} className="space-y-3.5 rounded-3xl bg-[#141622] border border-white/10 p-5 sm:p-6 shadow-xl">
          <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 pb-1 border-b border-white/5">
            {mode === "signin" ? "Sign In" : "Register Credentials"}
          </p>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-zinc-300">
              {mode === "signin" ? "Username or Email" : "Username"}
            </label>
            <input
              className={field}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. byron"
              required
              autoComplete="username"
            />
          </div>

          {mode === "register" && (
            <>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-300">Display Name</label>
                <input
                  className={field}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Anime Artist"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-300">Email (Optional)</label>
                <input
                  className={field}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-zinc-300">
              Password {mode === "register" && "(12+ chars)"}
            </label>
            <input
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              placeholder="••••••••••••"
              minLength={mode === "register" ? 12 : undefined}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>

          <button
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 p-3 font-bold text-xs sm:text-sm text-white shadow-lg shadow-pink-500/25 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{busy ? "Please wait…" : mode === "signin" ? "Sign In with Password" : "Create Account"}</span>
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setMode(mode === "signin" ? "register" : "signin");
              setError("");
              setPassword("");
            }}
            className="text-xs font-bold text-pink-400 hover:text-pink-300 transition-colors"
          >
            {mode === "signin" ? "Need a new account? Register here" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
