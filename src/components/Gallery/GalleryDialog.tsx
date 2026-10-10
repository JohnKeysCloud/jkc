"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { haptic } from "@/lib/haptics";
import {
  altText,
  formatPublishedAt,
  type InstagramPost,
} from "@/lib/instagram";
import styles from "./GalleryDialog.module.scss";

type GalleryDialogProps = {
  post: InstagramPost;
  onClose: () => void;
};

/**
 * One post up close: the full-size image or video, its caption, and a link
 * back to Instagram. Carousels step through their items in order. Mounted per
 * post and opened on mount, so it always starts on the first item.
 */
export function GalleryDialog({ post, onClose }: GalleryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const titleId = useId();
  const count = post.items.length;
  const item = post.items[index];
  // Carousels keep their first item's frame, as on Instagram, so stepping
  // through doesn't resize the dialog.
  const frame = post.items[0];

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const close = () => dialogRef.current?.close();

  const step = (delta: number) => {
    haptic();
    setIndex((current) => (current + delta + count) % count);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (count < 2 || (event.target as HTMLElement).tagName === "VIDEO") {
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      step(event.key === "ArrowRight" ? 1 : -1);
    }
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      close();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={styles.dialog}
      onClick={handleBackdropClick}
      onClose={onClose}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.box}>
        <div
          className={styles.stage}
          style={
            {
              "--frame-ratio": `${frame.width} / ${frame.height}`,
            } as CSSProperties
          }
        >
          {item.kind === "video" && item.video ? (
            <video
              key={item.id}
              aria-label={altText(post, item)}
              className={styles.media}
              controls
              playsInline
              poster={item.full}
              preload="none"
              src={item.video}
            />
          ) : (
            <picture key={item.id}>
              <img
                alt={altText(post, item)}
                className={styles.media}
                decoding="async"
                height={item.height}
                src={item.full}
                width={item.width}
              />
            </picture>
          )}

          {count > 1 ? (
            <>
              <button
                aria-label="Previous item"
                className={`${styles.step} ${styles.previous}`}
                onClick={() => step(-1)}
                type="button"
              >
                ‹
              </button>
              <button
                aria-label="Next item"
                className={`${styles.step} ${styles.next}`}
                onClick={() => step(1)}
                type="button"
              >
                ›
              </button>
              <p className={styles.counter} aria-live="polite">
                {index + 1} / {count}
              </p>
            </>
          ) : null}
        </div>

        <div className={styles.details}>
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              <time dateTime={post.publishedAt}>{formatPublishedAt(post)}</time>
            </h2>
            <button
              aria-label="Close"
              className={styles.close}
              onClick={close}
              type="button"
            >
              ✕
            </button>
          </div>

          {post.caption ? (
            <p className={styles.caption}>{post.caption}</p>
          ) : null}
          {item.kind === "video" && !item.video ? (
            <p className={styles.note}>This video plays on Instagram.</p>
          ) : null}

          <a
            className={styles.permalink}
            href={post.permalink}
            rel="noopener noreferrer"
            target="_blank"
          >
            View on Instagram
            <span className="srOnly"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </dialog>
  );
}
