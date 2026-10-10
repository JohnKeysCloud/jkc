import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  EXPORT_ID_PREFIX,
  type InstagramMedia,
  type InstagramMediaKind,
  type InstagramPost,
  toIsoTimestamp,
} from "../../src/lib/instagram.ts";
import { stageItem } from "./assets.ts";
import { describeError, MediaError } from "./errors.ts";
import type { ImageProcessor, VideoValidator } from "./process.ts";
import type { Store } from "./store.ts";
import { EXPORT_MATCH_MS } from "./sync.ts";

type RawMedia = {
  uri?: string;
  creation_timestamp?: number;
  title?: string;
};

type RawPost = RawMedia & {
  media?: RawMedia[];
};

export type ExportFile = {
  path: string;
  kind: InstagramMediaKind;
};

export type ExportPost = {
  publishedAt: string;
  caption?: string;
  files: ExportFile[];
};

export type PosterExtractor = (videoPath: string) => Buffer | null;

/** Where Meta has put `posts_1.json` across export format revisions. */
const POST_DIRS = [
  "your_instagram_activity/media",
  "your_instagram_activity/content",
  "content",
  ".",
];
const POST_FILE = /^posts_\d+\.json$/;
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov"]);
const FFMPEG_BUFFER = 64 * 1024 * 1024;
const LATIN1_MAX = 0xff;

/**
 * Meta's JSON export writes UTF-8 bytes as Latin-1 escapes, so "é" arrives as
 * "Ã©". Text that already holds wider characters is left alone.
 */
export function fixExportText(text: string): string {
  const isLatin1 = Array.from(text).every(
    (char) => (char.codePointAt(0) ?? 0) <= LATIN1_MAX,
  );
  return isLatin1 ? Buffer.from(text, "latin1").toString("utf8") : text;
}

function resolveInside(root: string, uri: string): string {
  const resolved = path.resolve(root, uri);
  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new MediaError(`Export file escapes the export folder: ${uri}`);
  }
  return resolved;
}

function fileKind(file: string): InstagramMediaKind | null {
  const extension = path.extname(file).toLowerCase();
  if (VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }
  return IMAGE_EXTENSIONS.has(extension) ? "image" : null;
}

/** Reads every `posts_N.json` in an unzipped "Download your information" export. */
export function readExport(root: string): ExportPost[] {
  const postFiles = POST_DIRS.map((dir) => path.join(root, dir))
    .filter((dir) => existsSync(dir))
    .flatMap((dir) =>
      readdirSync(dir)
        .filter((name) => POST_FILE.test(name))
        .map((name) => path.join(dir, name)),
    );
  if (postFiles.length === 0) {
    throw new Error(
      `No posts_1.json found under ${root}. Export your information as JSON.`,
    );
  }

  return postFiles.flatMap((file) =>
    (JSON.parse(readFileSync(file, "utf8")) as RawPost[]).flatMap((raw) => {
      const media = raw.media ?? [];
      const timestamp = raw.creation_timestamp ?? media[0]?.creation_timestamp;
      if (timestamp === undefined || media.length === 0) {
        return [];
      }

      const files = media.flatMap((item) => {
        const kind = item.uri ? fileKind(item.uri) : null;
        return item.uri && kind
          ? [{ path: resolveInside(root, item.uri), kind }]
          : [];
      });
      const caption = raw.title || media[0]?.title;
      return [
        {
          publishedAt: toIsoTimestamp(timestamp),
          caption: caption ? fixExportText(caption) : undefined,
          files,
        },
      ];
    }),
  );
}

/** Grabs a frame half a second in; null when ffmpeg isn't installed. */
export const ffmpegPoster: PosterExtractor = (videoPath) => {
  const result = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-ss",
      "0.5",
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-f",
      "image2pipe",
      "-vcodec",
      "png",
      "-",
    ],
    { maxBuffer: FFMPEG_BUFFER },
  );
  return result.status === 0 && result.stdout.length > 0 ? result.stdout : null;
};

type ImportOptions = {
  root: string;
  store: Store;
  processImage: ImageProcessor;
  validateVideo: VideoValidator;
  profileUrl: string;
  /** Also import posts the API never listed, such as archived ones. */
  includeMissing?: boolean;
  extractPoster?: PosterExtractor;
  log?: (message: string) => void;
};

export type ImportResult = {
  added: string[];
  resolvedGaps: string[];
  failed: { publishedAt: string; error: string }[];
  /** Already in the gallery, or not a gap and `includeMissing` is off. */
  skipped: number;
};

const withinMatch = (a: string, b: string) =>
  Math.abs(Date.parse(a) - Date.parse(b)) <= EXPORT_MATCH_MS;

/**
 * Backfills posts the API can't supply media for. Export entries carry no
 * media ids, so they're matched to the API's posts by publication time and
 * stored as `export-<unix seconds>`.
 */
export async function importExport({
  root,
  store,
  processImage,
  validateVideo,
  profileUrl,
  includeMissing = false,
  extractPoster = ffmpegPoster,
  log = () => {},
}: ImportOptions): Promise<ImportResult> {
  const manifest = store.readManifest();
  const state = store.readState();
  const mediaGaps = state.gaps.filter((gap) => gap.reason === "no-media");
  const result: ImportResult = {
    added: [],
    resolvedGaps: [],
    failed: [],
    skipped: 0,
  };

  for (const entry of readExport(root)) {
    const inGallery = Object.values(manifest).some((post) =>
      withinMatch(post.publishedAt, entry.publishedAt),
    );
    const gap = mediaGaps.find((g) =>
      withinMatch(g.publishedAt, entry.publishedAt),
    );
    if (inGallery || (!gap && !includeMissing) || entry.files.length === 0) {
      result.skipped += 1;
      continue;
    }

    const id = `${EXPORT_ID_PREFIX}${Math.round(Date.parse(entry.publishedAt) / 1000)}`;
    const staged = store.stage(id);
    try {
      const items: InstagramMedia[] = [];
      for (const [index, file] of entry.files.entries()) {
        const bytes = readFileSync(file.path);
        let image: Buffer = bytes;
        let video: Buffer | undefined;
        if (file.kind === "video") {
          validateVideo(bytes);
          const poster = extractPoster(file.path);
          if (!poster) {
            throw new MediaError(
              "Install ffmpeg to make poster frames for exported videos",
            );
          }
          image = poster;
          video = bytes;
        }
        items.push(
          await stageItem({
            staged,
            store,
            processImage,
            postId: id,
            index,
            id: `${id}-${index}`,
            kind: file.kind,
            image,
            video,
          }),
        );
      }

      staged.promote();
      const post: InstagramPost = {
        id,
        type: items.length > 1 ? "carousel" : items[0].kind,
        publishedAt: entry.publishedAt,
        caption: entry.caption,
        permalink: gap?.permalink ?? profileUrl,
        items,
      };
      manifest[id] = post;
      store.writeManifest(manifest);
      result.added.push(id);
      if (gap) {
        result.resolvedGaps.push(gap.id);
      }
      log(`Imported ${id} from the export (${items.length} item(s))`);
    } catch (error) {
      staged.discard();
      const message = describeError(error);
      result.failed.push({ publishedAt: entry.publishedAt, error: message });
      log(`Failed export post from ${entry.publishedAt}: ${message}`);
    }
  }

  if (result.resolvedGaps.length > 0) {
    store.writeState({
      ...state,
      gaps: state.gaps.filter(
        (gap) =>
          !(gap.reason === "no-media" && result.resolvedGaps.includes(gap.id)),
      ),
    });
  }
  return result;
}
