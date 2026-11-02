"use client";

import React, { useState } from "react";
import { X, Flag, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Post, User } from "@/types/cuttiebooru";

interface ReportModalProps {
  isOpen: boolean;
  targetPost?: Post | null;
  targetUser?: User | null;
  lightTheme: boolean;
  onClose: () => void;
  onSubmitReport: (payload: {
    targetType: string;
    postId?: string;
    reportedUserId?: string;
    reason: string;
    details: string;
    contactEmail: string;
  }) => Promise<void>;
}

export function ReportModal({
  isOpen,
  targetPost,
  targetUser,
  lightTheme,
  onClose,
  onSubmitReport,
}: ReportModalProps) {
  const [reason, setReason] = useState("attribution_missing");
  const [details, setDetails] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmitReport({
      targetType: targetPost ? "post" : "profile",
      postId: targetPost?.id,
      reportedUserId: targetUser?.id,
      reason,
      details,
      contactEmail,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setDetails("");
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 ${
          lightTheme
            ? "bg-white border-purple-200 text-zinc-900"
            : "bg-[#171925] border-white/10 text-zinc-100"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                Report or Request Attribution / Removal
              </h3>
              <p className="text-xs text-zinc-400 truncate max-w-[260px]">
                {targetPost
                  ? `Post: ${targetPost.title}`
                  : targetUser
                  ? `Profile: @${targetUser.username}`
                  : "Platform Trust & Safety"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 flex flex-col items-center text-center gap-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <p className="font-semibold text-sm">
              Report received by our Trust & Moderation team!
            </p>
            <p className="text-xs text-zinc-400">
              You can also view and action this in the Moderation Center tab.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Reason for Report / Request
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
              >
                <option value="attribution_missing">
                  Missing or Incorrect Creator Attribution / Source Link
                </option>
                <option value="copyright_removal">
                  Creator Removal Request (DMCA / Take-down)
                </option>
                <option value="misleading_tags">
                  Duplicate or Misleading Tags
                </option>
                <option value="guidelines_violation">
                  Community Guidelines or SFW Policy Violation
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Details / Correct Attribution URL
              </label>
              <textarea
                rows={3}
                required
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Share source link, creator credit, or reason for removal..."
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Contact Email (Optional for Creator Removal Requests)
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="creator@example.com"
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Cuttiebooru prioritizes creator rights. Verified creator removal
                requests and attribution corrections are prioritized.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-semibold shadow-lg shadow-pink-500/25"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

