import { readFileSync } from "node:fs";
import path from "node:path";
import {
  type InstagramManifest,
  type InstagramPost,
  sortPosts,
} from "./instagram";

/** Posts the first gallery render ships; the rest load in pages this size. */
export const GALLERY_PAGE_SIZE = 24;

/**
 * Read at build time. `INSTAGRAM_CONTENT_DIR` lets the end-to-end tests build
 * against fixture posts instead of the real archive.
 */
function readManifest(): InstagramManifest {
  const directory =
    process.env.INSTAGRAM_CONTENT_DIR ?? "src/content/instagram";
  const file = path.join(process.cwd(), directory, "posts.json");
  return JSON.parse(readFileSync(file, "utf8")) as InstagramManifest;
}

export function getPosts(): InstagramPost[] {
  return sortPosts(Object.values(readManifest()));
}

export function getPostPage(page: number): InstagramPost[] {
  const start = (page - 1) * GALLERY_PAGE_SIZE;
  return getPosts().slice(start, start + GALLERY_PAGE_SIZE);
}

export function getPageCount(): number {
  return Math.max(1, Math.ceil(getPosts().length / GALLERY_PAGE_SIZE));
}
