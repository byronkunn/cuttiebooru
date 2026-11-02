"use client";

import { useEffect, useState } from "react";
import { Compass, Flame, Hash, Users, Star } from "lucide-react";
import { ImageCard } from "@/components/ImageCard";
import type { Post, Tag, User } from "@/types/cuttiebooru";

interface Discovery {
  posts: Post[];
  creators: { creator: User; artworkCount: number }[];
  tags: { tag: Tag; artworkCount: number }[];
}

interface ExploreViewProps {
  rating: string;
  onRatingChange: (rating: string) => void;
  lightTheme: boolean;
  blurExplicit: boolean;
  favoritePostIds: string[];
  followingIds: string[];
  followedTagNames?: string[];
  currentUserId?: string;
  onSelectPost: (post: Post) => void;
  onSelectCreator: (creator: User) => void;
  onSelectTag: (tag: string) => void;
  onToggleFavorite: (postId: string, event: React.MouseEvent) => void;
  onOpenSaveModal: (post: Post, event: React.MouseEvent) => void;
  onFollow: (creatorId: string) => void;
  onToggleFollowTag?: (tagName: string, event: React.MouseEvent) => void;
}

export function ExploreView(props: ExploreViewProps) {
  const [period, setPeriod] = useState("week");
  const [tab, setTab] = useState("Discover");
  const [data, setData] = useState<Discovery | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/explore?${new URLSearchParams({ period, rating: props.rating })}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load Explore.");
        if (!controller.signal.aborted) setData(result);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          console.error("Failed to load Explore:", failure);
          setError(failure instanceof Error ? failure.message : "Unable to load Explore.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [period, props.rating, props.currentUserId, retry]);
  const panel = props.lightTheme ? "bg-white border-purple-200" : "bg-[#161822] border-white/10";
  return (
    <section aria-label="Explore discovery" className="space-y-5">
      <div className={`p-5 sm:p-7 rounded-3xl border ${panel} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2"><Compass className="w-6 h-6 text-pink-400" />Explore</h1>
            <p className="text-sm text-zinc-400 mt-1">Discover the artwork, creators and tags getting attention.</p>
          </div>
          <div className="flex flex-wrap gap-2">
          <select aria-label="Explore rating" value={props.rating} onChange={(event) => props.onRatingChange(event.target.value)}
            className="max-w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm">
            <option value="all">All ratings</option><option value="sfw">SFW</option><option value="questionable">Ecchi</option><option value="explicit">Explicit</option>
          </select>
          <select aria-label="Trending time range" value={period} onChange={(event) => setPeriod(event.target.value)}
            className="max-w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm">
            <option value="week">This week</option><option value="month">This month</option><option value="all">All time</option>
          </select>
          </div>
        </div>
        <div role="tablist" aria-label="Explore categories" className="flex flex-wrap gap-2">
          {["Discover", "Artwork", "Creators", "Tags"].map((name) => (
            <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)}
              className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === name ? "bg-pink-500 text-white" : "bg-white/5 text-zinc-400 hover:text-pink-400"}`}>{name}</button>
          ))}
        </div>
        <p className="text-xs text-zinc-400">Ranked by favorites in this period and views on new uploads. Up to 500 active artworks are considered; tags rank by artwork count.</p>
      </div>
      {loading ? <p role="status" className="p-6 text-zinc-400">Loading trending discovery...</p> : error ? (
        <div role="alert" className={`p-5 rounded-2xl border ${panel}`}>
          <p>{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-3 px-4 py-2 bg-pink-500 rounded-xl text-white">Retry Explore</button>
        </div>
      ) : data && (
        <>
          {(tab === "Discover" || tab === "Tags") && (
            <section aria-label="Trending tags" className={`p-5 rounded-3xl border ${panel} space-y-3`}>
              <h2 className="text-lg font-extrabold flex items-center gap-2"><Hash className="w-5 h-5 text-pink-400" />Trending tags</h2>
              {!data.tags.length ? <p className="text-sm text-zinc-400">No active tags in this period.</p> :
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {data.tags.map(({ tag, artworkCount }, index) => {
                    const isFollowed = props.followedTagNames?.includes(tag.name);
                    return (
                      <div
                        key={tag.id}
                        onClick={() => props.onSelectTag(tag.name)}
                        className="group relative min-w-0 p-3 rounded-xl text-left bg-white/5 hover:bg-pink-500/15 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="text-xs text-zinc-400">{index + 1} · {tag.category}</span>
                          <span className="block font-bold truncate text-white group-hover:text-pink-300" title={`#${tag.name}`}>#{tag.name}</span>
                          <span className="text-xs text-zinc-400">{artworkCount} artworks · Explore tag</span>
                        </div>
                        {props.onToggleFollowTag && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              props.onToggleFollowTag!(tag.name, e);
                            }}
                            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                              isFollowed
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                                : "bg-white/10 text-zinc-400 hover:text-white hover:bg-white/20"
                            }`}
                            title={isFollowed ? `Unfollow #${tag.name}` : `Follow #${tag.name}`}
                          >
                            <Star className={`w-3.5 h-3.5 ${isFollowed ? "fill-amber-400 text-amber-400" : ""}`} />
                            <span className="hidden sm:inline">{isFollowed ? "Following" : "Follow"}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>}
            </section>
          )}
          {(tab === "Discover" || tab === "Creators") && (
            <section aria-label="Trending creators" className="space-y-3">
              <h2 className="text-lg font-extrabold flex items-center gap-2"><Users className="w-5 h-5 text-pink-400" />Trending creators</h2>
              {!data.creators.length ? <p className="text-sm text-zinc-400">No active creators in this period.</p> :
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {data.creators.map(({ creator, artworkCount }) => (
                    <div key={creator.id} className={`min-w-0 p-4 rounded-2xl border ${panel} space-y-3`}>
                      <button type="button" onClick={() => props.onSelectCreator(creator)} className="w-full flex gap-3 items-center text-left min-w-0">
                        <img src={creator.avatarUrl} alt="" loading="lazy" className="w-11 h-11 rounded-full object-cover shrink-0" />
                        <span className="min-w-0"><span className="block font-bold truncate">{creator.displayName}</span><span className="block text-xs text-zinc-400 truncate">@{creator.username}</span></span>
                      </button>
                      <p className="text-xs text-zinc-400">{artworkCount} active artworks</p>
                      {props.currentUserId !== creator.id && <button type="button" onClick={() => props.onFollow(creator.id)} className="px-4 py-2 rounded-xl bg-pink-500/20 text-pink-400 text-xs font-bold">
                        {props.followingIds.includes(creator.id) ? "Following" : "Follow"}
                      </button>}
                    </div>
                  ))}
                </div>}
            </section>
          )}
          {(tab === "Discover" || tab === "Artwork") && (
            <section aria-label="Trending artwork" className="space-y-3">
              <h2 className="text-lg font-extrabold flex items-center gap-2"><Flame className="w-5 h-5 text-pink-400" />Trending artwork</h2>
              {!data.posts.length ? <p className={`p-6 rounded-2xl border ${panel} text-sm text-zinc-400`}>No artwork activity in this period. Try a wider time range.</p> :
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data.posts.map((post) => <ImageCard key={post.id} post={post} isFavorited={props.favoritePostIds.includes(post.id)}
                    lightTheme={props.lightTheme} blurExplicit={props.blurExplicit} onSelectPost={props.onSelectPost}
                    onSelectCreator={props.onSelectCreator} onToggleFavorite={props.onToggleFavorite} onOpenSaveModal={props.onOpenSaveModal} />)}
                </div>}
            </section>
          )}
        </>
      )}
    </section>
  );
}
