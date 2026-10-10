"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import type { InstagramPost } from "@/lib/instagram";
import styles from "./Gallery.module.scss";
import { GalleryDialog } from "./GalleryDialog";
import { GalleryTile } from "./GalleryTile";

/** Two rows' worth fill the first screen on every layout. */
const EAGER_TILES = 6;
/** Starts the next page well before the reader reaches the end. */
const PREFETCH_MARGIN = "800px 0px";

type Status = "idle" | "loading" | "error";

type GalleryProps = {
  /** The first page, newest first, rendered into the page's HTML. */
  initialPosts: InstagramPost[];
  pageCount: number;
  profileUrl: string;
};

export function Gallery({ initialPosts, pageCount, profileUrl }: GalleryProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [selected, setSelected] = useState<InstagramPost | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const hasMore = page < pageCount;

  // Later pages are static JSON built alongside the page.
  const loadMore = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;
    setStatus("loading");

    try {
      const response = await fetch(`/gallery/posts/${page + 1}`);
      if (!response.ok) {
        throw new Error(
          `Gallery page ${page + 1} responded ${response.status}`,
        );
      }
      const next = (await response.json()) as InstagramPost[];
      setPosts((current) => {
        const known = new Set(current.map((post) => post.id));
        return [...current, ...next.filter((post) => !known.has(post.id))];
      });
      setPage((current) => current + 1);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      isLoadingRef.current = false;
    }
  }, [page]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || status !== "idle") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: PREFETCH_MARGIN },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, loadMore, status]);

  const open = (post: InstagramPost) => {
    haptic();
    setSelected(post);
  };

  if (posts.length === 0) {
    return (
      <p className={styles.empty}>
        Nothing here yet.{" "}
        <a href={profileUrl} rel="noopener noreferrer" target="_blank">
          See Instagram
          <span className="srOnly"> (opens in a new tab)</span>
        </a>
      </p>
    );
  }

  return (
    <>
      <ul className={styles.grid}>
        {posts.map((post, index) => (
          <GalleryTile
            key={post.id}
            isEager={index < EAGER_TILES}
            onOpen={open}
            post={post}
          />
        ))}
      </ul>

      {hasMore ? <div ref={sentinelRef} aria-hidden="true" /> : null}
      <div className={styles.status} aria-live="polite">
        {status === "loading" ? "Loading more posts…" : null}
        {status === "error" ? (
          <>
            Couldn&apos;t load more posts.{" "}
            <button className={styles.retry} onClick={loadMore} type="button">
              Try again
            </button>
          </>
        ) : null}
      </div>

      {selected ? (
        <GalleryDialog
          key={selected.id}
          onClose={() => setSelected(null)}
          post={selected}
        />
      ) : null}
    </>
  );
}
