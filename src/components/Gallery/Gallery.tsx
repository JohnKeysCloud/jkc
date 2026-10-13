"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { measureEnd } from "@/lib/descent";
import { haptic } from "@/lib/haptics";
import type { InstagramPost } from "@/lib/instagram";
import { awardInteraction } from "@/lib/score";
import { slideTo } from "@/lib/slideTo";
import styles from "./Gallery.module.scss";
import { GalleryDialog } from "./GalleryDialog";
import { GalleryTile } from "./GalleryTile";

/** Two rows' worth fill the first screen on every layout. */
const FIRST_SCREEN_TILES = 6;
/** Starts the next page well before the reader reaches the end. */
const PREFETCH_MARGIN = "800px 0px";
/** A short ride back to the newest posts. */
const RETURN_MS = 1200;
/** Hide again once the gallery's top is this close to the viewport. */
const RECALL_TOP = 48;

type Status = "idle" | "loading" | "error";

type GalleryProps = {
  /** The first page, newest first, rendered into the page's HTML. */
  initialPosts: InstagramPost[];
  pageCount: number;
  profileUrl: string;
  /** Tiles that skip lazy loading; none where the grid starts off screen. */
  eagerTiles?: number;
};

export function Gallery({
  initialPosts,
  pageCount,
  profileUrl,
  eagerTiles = FIRST_SCREEN_TILES,
}: GalleryProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [selected, setSelected] = useState<InstagramPost | null>(null);
  const [showRecall, setShowRecall] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const recallRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const hasMore = page < pageCount;
  const hasOlderPosts = page > 1;

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

  // The label lives on the body because the home gallery sits in a transformed
  // track, which would trap a fixed layer. It still follows the gallery's box,
  // so it only shows over that gallery and leaves once its top is back on
  // screen.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !hasOlderPosts) {
      return undefined;
    }

    let frameId: number | null = null;
    let showing = false;

    const check = () => {
      frameId = null;
      const rect = root.getBoundingClientRect();
      const next = rect.top <= -RECALL_TOP && rect.bottom > RECALL_TOP;

      if (next !== showing) {
        showing = next;
        setShowRecall(next);
      }
    };

    const request = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(check);
      }
    };

    request();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);

    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [hasOlderPosts]);

  const open = (post: InstagramPost) => {
    haptic();
    awardInteraction("gallery-post");
    setSelected(post);
  };

  // Older pages are the past. Home keeps the newest posts at the end of the
  // pan; the gallery page keeps them at the top of the document.
  const returnToRecent = () => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const descent = root.closest("[data-descent]");
    haptic();
    // The label goes inert on the way up, so a keyboard user lands on the
    // newest post instead of the page body.
    if (recallRef.current?.contains(document.activeElement)) {
      root
        .querySelector<HTMLElement>("li button")
        ?.focus({ preventScroll: true });
    }
    slideTo(
      descent instanceof HTMLElement ? measureEnd(descent, "pan") : 0,
      RETURN_MS,
    );
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
    <div ref={rootRef}>
      <ul className={styles.grid}>
        {posts.map((post, index) => (
          <GalleryTile
            key={post.id}
            isEager={index < eagerTiles}
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

      {hasOlderPosts
        ? createPortal(
            <div
              ref={recallRef}
              className={
                showRecall
                  ? styles.recall
                  : `${styles.recall} ${styles.isHidden}`
              }
              inert={!showRecall}
            >
              <button
                className={styles.recallButton}
                onClick={returnToRecent}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className={styles.arrow}
                  shapeRendering="crispEdges"
                  viewBox="0 0 7 7"
                >
                  <rect height="1" width="1" x="3" y="0" />
                  <rect height="1" width="3" x="2" y="1" />
                  <rect height="1" width="5" x="1" y="2" />
                  <rect height="1" width="7" x="0" y="3" />
                  <rect height="3" width="3" x="2" y="4" />
                </svg>
                Back to the future
                <span className="srOnly">, newest posts</span>
              </button>
            </div>,
            document.body,
          )
        : null}

      {selected ? (
        <GalleryDialog
          key={selected.id}
          onClose={() => setSelected(null)}
          post={selected}
        />
      ) : null}
    </div>
  );
}
