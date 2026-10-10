/**
 * The shape of the mirrored Instagram gallery. The sync scripts write it to
 * `src/content/instagram/posts.json`; the gallery reads it at build time.
 * Kept free of path aliases and Node APIs so both sides can import it.
 */

export type InstagramMediaKind = "image" | "video";

export type InstagramMedia = {
  id: string;
  kind: InstagramMediaKind;
  /** Dimensions of the `full` variant. */
  width: number;
  height: number;
  /** Public paths, e.g. `/instagram/<postId>/0-640.webp`. */
  grid: string;
  full: string;
  /** Absent when the video couldn't be stored; the post links out instead. */
  video?: string;
  alt?: string;
};

export type InstagramPostType = "image" | "video" | "carousel";

export type InstagramPost = {
  /** Instagram media id, or `export-<unix seconds>` for export backfills. */
  id: string;
  type: InstagramPostType;
  /** Original publication time, ISO 8601 in UTC. */
  publishedAt: string;
  caption?: string;
  permalink: string;
  /** In their original carousel order. */
  items: InstagramMedia[];
};

export type InstagramManifest = Record<string, InstagramPost>;

export const EXPORT_ID_PREFIX = "export-";
export const GRID_WIDTH = 640;
export const FULL_WIDTH = 1440;

const ALT_MAX_LENGTH = 120;
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

/**
 * Instagram returns `2024-05-01T18:30:00+0000`; normalises it, or a Unix
 * timestamp in seconds, to `2024-05-01T18:30:00.000Z`.
 */
export function toIsoTimestamp(value: string | number): string {
  const date =
    typeof value === "number"
      ? new Date(value * 1000)
      : new Date(value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${value}`);
  }
  return date.toISOString();
}

/** Newest first; ties fall back to id so the order is stable. */
export function sortPosts(posts: Iterable<InstagramPost>): InstagramPost[] {
  return [...posts].sort(
    (a, b) =>
      b.publishedAt.localeCompare(a.publishedAt) || b.id.localeCompare(a.id),
  );
}

export function formatPublishedAt(post: InstagramPost): string {
  return DATE_FORMAT.format(new Date(post.publishedAt));
}

/** Instagram's own alt text, else the caption's first sentence, else a date. */
export function altText(post: InstagramPost, item: InstagramMedia): string {
  if (item.alt) {
    return item.alt;
  }

  const firstSentence = post.caption
    ?.trim()
    .match(/^[^\n]*?[.!?](?=\s|$)|^[^\n]*/)?.[0]
    .replace(/\s+/g, " ");
  if (firstSentence) {
    return firstSentence.length > ALT_MAX_LENGTH
      ? `${firstSentence.slice(0, ALT_MAX_LENGTH - 1).trimEnd()}…`
      : firstSentence;
  }

  return `Instagram post from ${formatPublishedAt(post)}`;
}
