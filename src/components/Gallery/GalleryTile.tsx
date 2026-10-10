"use client";

import { useState } from "react";
import {
  altText,
  GRID_WIDTH,
  type InstagramMedia,
  type InstagramPost,
} from "@/lib/instagram";
import styles from "./Gallery.module.scss";
import { GalleryBadge } from "./GalleryBadge";

/** A column at Instagram's 935px desktop width; a third of the screen below. */
const TILE_SIZES = "(min-width: 935px) 310px, 34vw";

const TYPE_LABELS = {
  carousel: (post: InstagramPost) => `, carousel of ${post.items.length}`,
  video: () => ", video",
  image: () => "",
} satisfies Record<InstagramPost["type"], (post: InstagramPost) => string>;

/** Small originals have one variant, which `srcset` can't list twice. */
function srcSet(item: InstagramMedia): string | undefined {
  return item.width > GRID_WIDTH
    ? `${item.grid} ${GRID_WIDTH}w, ${item.full} ${item.width}w`
    : undefined;
}

type GalleryTileProps = {
  post: InstagramPost;
  /** The first rows are on screen at load, so they skip lazy loading. */
  isEager: boolean;
  onOpen: (post: InstagramPost) => void;
};

export function GalleryTile({ post, isEager, onOpen }: GalleryTileProps) {
  const [isBroken, setIsBroken] = useState(false);
  const cover = post.items[0];

  return (
    <li>
      <button
        className={styles.tile}
        data-published={post.publishedAt}
        onClick={() => onOpen(post)}
        type="button"
      >
        {isBroken || !cover ? (
          <span className={styles.missing}>
            Image unavailable
            {cover ? (
              <span className="srOnly">: {altText(post, cover)}</span>
            ) : null}
          </span>
        ) : (
          <picture>
            <img
              alt={altText(post, cover)}
              className={styles.image}
              decoding="async"
              height={cover.height}
              loading={isEager ? "eager" : "lazy"}
              onError={() => setIsBroken(true)}
              ref={(image) => {
                // Failed before hydration, so `onError` never fired.
                if (image?.complete && image.naturalWidth === 0) {
                  setIsBroken(true);
                }
              }}
              sizes={TILE_SIZES}
              src={cover.grid}
              srcSet={srcSet(cover)}
              width={cover.width}
            />
          </picture>
        )}
        <GalleryBadge className={styles.badge} type={post.type} />
        <span className="srOnly">{TYPE_LABELS[post.type](post)}</span>
      </button>
    </li>
  );
}
