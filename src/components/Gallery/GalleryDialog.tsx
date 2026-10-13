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
import { GALLERY_DETAILS_ENABLED } from "@/lib/features";
import { haptic } from "@/lib/haptics";
import {
  altText,
  formatPublishedAt,
  type InstagramPost,
} from "@/lib/instagram";
import {
  CycloneCarousel,
  type CycloneCarouselHandle,
  type CycloneCarouselSlide,
} from "@/lib/ui/CycloneCarousel";
import styles from "./GalleryDialog.module.scss";

type GalleryDialogProps = {
  post: InstagramPost;
  onClose: () => void;
};

/**
 * Room under the media for the post's details. Decided per post, not per
 * item, so stepping through a carousel never resizes the media to make room
 * for the note.
 */
function detailsSizeOf(post: InstagramPost) {
  const hasLinkedOutVideo = post.items.some(
    (media) => media.kind === "video" && !media.video,
  );
  if (GALLERY_DETAILS_ENABLED) {
    return post.caption || hasLinkedOutVideo
      ? styles.detailsFull
      : styles.detailsDate;
  }
  return hasLinkedOutVideo ? styles.detailsNote : undefined;
}

/**
 * One post up close, with no card around it: the full-size image, video, or
 * carousel floats over the blurred page with a close button above it, and a
 * link back to Instagram centred below, under its date and caption when those
 * are enabled. Mounted per post and opened on mount, so it always starts on
 * the first item.
 */
export function GalleryDialog({ post, onClose }: GalleryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const carouselRef = useRef<CycloneCarouselHandle>(null);
  const [index, setIndex] = useState(0);
  const titleId = useId();
  const count = post.items.length;
  const item = post.items[index];
  // Carousels keep their first item's frame, as on Instagram, so stepping
  // through doesn't resize the dialog.
  const frame = post.items[0];
  const frameStyle = {
    "--frame-aspect": frame.width / frame.height,
    "--frame-ratio": `${frame.width} / ${frame.height}`,
  } as CSSProperties;
  const isPlayable = item.kind === "video" && Boolean(item.video);
  const isLinkedOut = item.kind === "video" && !item.video;
  const postLabel = `Post from ${formatPublishedAt(post)}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    // Start on the dialog rather than its first button, so opening by touch
    // doesn't ring the close button; Tab still reaches it first.
    dialog?.focus();
  }, []);

  const close = () => dialogRef.current?.close();

  const handleChange = (next: number) => {
    haptic();
    setIndex(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (count < 2 || (event.target as HTMLElement).tagName === "VIDEO") {
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      if (event.key === "ArrowRight") {
        carouselRef.current?.next();
      } else {
        carouselRef.current?.previous();
      }
    }
  };

  // With no card, the gaps between the rows are backdrop too.
  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if ((event.target as HTMLElement).hasAttribute("data-backdrop")) {
      close();
    }
  };

  const dialogClassName = [
    styles.dialog,
    count > 1 && styles.hasCarousel,
    detailsSizeOf(post),
  ]
    .filter(Boolean)
    .join(" ");

  const slides = post.items.map((media): CycloneCarouselSlide => ({
    id: media.id,
    kind: media.kind,
    src: media.full,
    video: media.video,
    alt: altText(post, media),
    width: media.width,
    height: media.height,
  }));

  return (
    <dialog
      ref={dialogRef}
      aria-label={GALLERY_DETAILS_ENABLED ? undefined : postLabel}
      aria-labelledby={GALLERY_DETAILS_ENABLED ? titleId : undefined}
      className={dialogClassName}
      data-backdrop
      onClick={handleBackdropClick}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      style={frameStyle}
      tabIndex={-1}
    >
      <div className={styles.box} data-backdrop>
        <div className={styles.bar} data-backdrop>
          <button
            aria-label="Close"
            className={styles.close}
            onClick={close}
            type="button"
          >
            ✕
          </button>
        </div>

        {count > 1 ? (
          <CycloneCarousel
            ref={carouselRef}
            captions={false}
            className={styles.carousel}
            label={postLabel}
            onChange={handleChange}
            slides={slides}
          />
        ) : (
          <div className={styles.stage}>
            {isPlayable ? (
              <video
                aria-label={altText(post, item)}
                className={styles.media}
                controls
                playsInline
                poster={item.full}
                preload="none"
                src={item.video}
              />
            ) : (
              <picture>
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
          </div>
        )}

        {GALLERY_DETAILS_ENABLED || isLinkedOut ? (
          <div className={styles.details}>
            {GALLERY_DETAILS_ENABLED ? (
              <>
                <h2 id={titleId} className={styles.title}>
                  <time dateTime={post.publishedAt}>
                    {formatPublishedAt(post)}
                  </time>
                </h2>
                {post.caption ? (
                  <p className={styles.caption}>{post.caption}</p>
                ) : null}
              </>
            ) : null}
            {isLinkedOut ? (
              <p className={styles.note}>This video plays on Instagram.</p>
            ) : null}
          </div>
        ) : null}

        <div className={styles.footer} data-backdrop>
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
