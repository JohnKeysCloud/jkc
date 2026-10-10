import {
  EXPORT_ID_PREFIX,
  type InstagramManifest,
  type InstagramMedia,
  type InstagramMediaKind,
  type InstagramPost,
  type InstagramPostType,
  toIsoTimestamp,
} from "../../src/lib/instagram.ts";
import type { ApiChild, ApiMedia, InstagramApi } from "./api.ts";
import { stageItem } from "./assets.ts";
import type { Downloader } from "./download.ts";
import { describeError, SizeLimitError } from "./errors.ts";
import type { ImageProcessor, VideoValidator } from "./process.ts";
import type { Store, SyncFailure, SyncGap, SyncState } from "./store.ts";

/** Runs a failing post gets before it waits for `--retry-failed`. */
export const MAX_ATTEMPTS = 5;
/** A quiet account still records a successful run this often. */
export const HEARTBEAT_MS = 7 * 24 * 60 * 60 * 1000;
/** Export timestamps can drift from the API's by a few seconds. */
export const EXPORT_MATCH_MS = 60 * 1000;
const DEFAULT_CONCURRENCY = 3;

type ItemSource = {
  id: string;
  kind: InstagramMediaKind;
  /** The photo, or a video's thumbnail. */
  imageUrl: string;
  videoUrl?: string;
  alt?: string;
};

export type PostPlan = Omit<InstagramPost, "items"> & {
  items: ItemSource[];
};

export type SyncDeps = {
  api: Pick<InstagramApi, "listMedia">;
  download: Downloader;
  processImage: ImageProcessor;
  validateVideo: VideoValidator;
  store: Store;
  now?: () => Date;
  log?: (message: string) => void;
};

export type SyncOptions = {
  dryRun?: boolean;
  retryFailed?: boolean;
  concurrency?: number;
};

export type SyncResult = {
  ok: boolean;
  listingComplete: boolean;
  fatalError?: string;
  listed: number;
  added: string[];
  updated: string[];
  removed: string[];
  /** Failing posts waiting on `--retry-failed`. */
  skipped: string[];
  failures: SyncFailure[];
  gaps: SyncGap[];
  lastSuccessAt: string | null;
};

const POST_TYPES: Record<ApiMedia["media_type"], InstagramPostType> = {
  IMAGE: "image",
  VIDEO: "video",
  CAROUSEL_ALBUM: "carousel",
};

function toItemSource(child: ApiChild): ItemSource | null {
  const kind: InstagramMediaKind =
    child.media_type === "VIDEO" ? "video" : "image";
  const imageUrl = kind === "video" ? child.thumbnail_url : child.media_url;
  if (!imageUrl) {
    return null;
  }
  return {
    id: child.id,
    kind,
    imageUrl,
    videoUrl: kind === "video" ? child.media_url : undefined,
    alt: child.alt_text || undefined,
  };
}

/**
 * Turns an API post into what to download, or the reason it can't be shown.
 * A carousel keeps its children's order; one unshowable child makes the whole
 * post a gap rather than a carousel with a hole in it.
 */
export function planPost(media: ApiMedia): {
  plan: PostPlan | null;
  gaps: SyncGap[];
} {
  const publishedAt = toIsoTimestamp(media.timestamp);
  const gap = (reason: SyncGap["reason"]): SyncGap => ({
    id: media.id,
    permalink: media.permalink,
    publishedAt,
    reason,
  });

  const children =
    media.media_type === "CAROUSEL_ALBUM"
      ? (media.children?.data ?? [])
      : [media];
  const items = children.map(toItemSource);
  if (items.length === 0 || items.some((item) => item === null)) {
    return { plan: null, gaps: [gap("no-media")] };
  }

  const sources = items as ItemSource[];
  const gaps = sources.some((item) => item.kind === "video" && !item.videoUrl)
    ? [gap("video-unavailable")]
    : [];

  return {
    plan: {
      id: media.id,
      type: POST_TYPES[media.media_type],
      publishedAt,
      caption: media.caption || undefined,
      permalink: media.permalink,
      items: sources,
    },
    gaps,
  };
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let next = 0;
  const lanes = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next];
        next += 1;
        await worker(item);
      }
    },
  );
  await Promise.all(lanes);
}

function findExportMatch(
  manifest: InstagramManifest,
  publishedAt: string,
): string | undefined {
  const time = Date.parse(publishedAt);
  return Object.values(manifest).find(
    (post) =>
      post.id.startsWith(EXPORT_ID_PREFIX) &&
      Math.abs(Date.parse(post.publishedAt) - time) <= EXPORT_MATCH_MS,
  )?.id;
}

const serializeState = (state: Omit<SyncState, "lastSuccessAt">) =>
  JSON.stringify({
    failures: [...state.failures].sort((a, b) => a.id.localeCompare(b.id)),
    gaps: [...state.gaps].sort((a, b) =>
      `${a.id}:${a.reason}`.localeCompare(`${b.id}:${b.reason}`),
    ),
  });

/**
 * One synchronisation pass: list every post, download the ones not yet in
 * the manifest, refresh captions on the rest, and mirror deletions. Each post
 * lands in the manifest only after all of its files are in place, so a crash
 * or a failed download never exposes half a post.
 */
export async function sync(
  deps: SyncDeps,
  {
    dryRun = false,
    retryFailed = false,
    concurrency = DEFAULT_CONCURRENCY,
  }: SyncOptions = {},
): Promise<SyncResult> {
  const { api, download, processImage, validateVideo, store } = deps;
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? (() => {});

  const manifest = store.readManifest();
  const state = store.readState();
  const failures = new Map(state.failures.map((f) => [f.id, f]));
  const gaps = new Map(state.gaps.map((g) => [`${g.id}:${g.reason}`, g]));
  const added: string[] = [];
  const updated: string[] = [];
  const removed: string[] = [];
  const skipped: string[] = [];

  if (!dryRun) {
    const orphans = store.sweepOrphans(manifest);
    if (orphans.length > 0) {
      log(`Removed ${orphans.length} unfinished asset folder(s).`);
    }
  }

  const listed: ApiMedia[] = [];
  let listingComplete = false;
  let fatalError: string | undefined;
  try {
    for await (const page of api.listMedia()) {
      listed.push(...page);
    }
    listingComplete = true;
  } catch (error) {
    fatalError = describeError(error);
    log(`Listing stopped early: ${fatalError}`);
  }
  const seen = new Set(listed.map((media) => media.id));

  const setGaps = (id: string, next: SyncGap[]) => {
    [...gaps.keys()]
      .filter((key) => key.startsWith(`${id}:`))
      .forEach((key) => gaps.delete(key));
    next.forEach((gap) => gaps.set(`${gap.id}:${gap.reason}`, gap));
  };

  // A failed post is retried, not reported as a gap.
  const recordFailure = (id: string, permalink: string, error: unknown) => {
    const lastError = describeError(error);
    failures.set(id, {
      id,
      permalink,
      attempts: (failures.get(id)?.attempts ?? 0) + 1,
      lastError,
      lastAttemptAt: now().toISOString(),
    });
    setGaps(id, []);
    log(`Failed ${id}: ${lastError}`);
  };

  const queue: PostPlan[] = [];
  listed.forEach((media) => {
    const existing = manifest[media.id];
    if (existing) {
      const caption = media.caption || undefined;
      if (
        existing.caption !== caption ||
        existing.permalink !== media.permalink
      ) {
        manifest[media.id] = {
          ...existing,
          caption,
          permalink: media.permalink,
        };
        updated.push(media.id);
      }
      return;
    }

    let planned: ReturnType<typeof planPost>;
    try {
      planned = planPost(media);
    } catch (error) {
      recordFailure(media.id, media.permalink, error);
      return;
    }

    const { plan, gaps: planGaps } = planned;
    if (!plan) {
      // An export backfill already covers this one.
      const covered = findExportMatch(manifest, planGaps[0].publishedAt);
      setGaps(media.id, covered ? [] : planGaps);
      return;
    }

    const failure = failures.get(media.id);
    if (failure && failure.attempts >= MAX_ATTEMPTS && !retryFailed) {
      skipped.push(media.id);
      return;
    }
    queue.push(plan);
    setGaps(media.id, planGaps);
  });

  if (dryRun) {
    queue.forEach((plan) =>
      log(`Would import ${plan.id} (${plan.type}, ${plan.publishedAt})`),
    );
    return {
      ok: !fatalError,
      listingComplete,
      fatalError,
      listed: listed.length,
      added: queue.map((plan) => plan.id),
      updated,
      removed: [],
      skipped,
      failures: [...failures.values()],
      gaps: [...gaps.values()],
      lastSuccessAt: state.lastSuccessAt,
    };
  }

  const ingest = async (plan: PostPlan): Promise<InstagramPost> => {
    const staged = store.stage(plan.id);
    try {
      const items: InstagramMedia[] = [];
      for (const [index, source] of plan.items.entries()) {
        const image = await download(source.imageUrl, "image");
        let video: Buffer | undefined;
        if (source.videoUrl) {
          try {
            video = await download(source.videoUrl, "video");
            validateVideo(video);
          } catch (error) {
            if (!(error instanceof SizeLimitError)) {
              throw error;
            }
            video = undefined;
            gaps.set(`${plan.id}:video-too-large`, {
              id: plan.id,
              permalink: plan.permalink,
              publishedAt: plan.publishedAt,
              reason: "video-too-large",
            });
          }
        }
        items.push(
          await stageItem({
            staged,
            store,
            processImage,
            postId: plan.id,
            index,
            id: source.id,
            kind: source.kind,
            image,
            video,
            alt: source.alt,
          }),
        );
      }
      staged.promote();
      return { ...plan, items };
    } catch (error) {
      staged.discard();
      throw error;
    }
  };

  await runPool(queue, concurrency, async (plan) => {
    try {
      const post = await ingest(plan);
      manifest[post.id] = post;
      const replaced = findExportMatch(manifest, post.publishedAt);
      if (replaced) {
        delete manifest[replaced];
        store.removePostAssets(replaced);
        removed.push(replaced);
      }
      store.writeManifest(manifest);
      failures.delete(post.id);
      added.push(post.id);
      log(`Imported ${post.id} (${post.type}, ${post.items.length} item(s))`);
    } catch (error) {
      recordFailure(plan.id, plan.permalink, error);
    }
  });

  // Mirror deletions only from a complete listing; an empty one from an
  // account that has posts is far likelier an API fault than a wiped profile.
  const mirrored = Object.keys(manifest).filter(
    (id) => !id.startsWith(EXPORT_ID_PREFIX),
  );
  if (listingComplete && (listed.length > 0 || mirrored.length === 0)) {
    mirrored
      .filter((id) => !seen.has(id))
      .forEach((id) => {
        delete manifest[id];
        store.removePostAssets(id);
        removed.push(id);
        log(`Removed ${id}, which is no longer on Instagram`);
      });
    [...failures.keys()]
      .filter((id) => !seen.has(id))
      .forEach((id) => failures.delete(id));
    [...gaps.values()]
      .filter((gap) => !seen.has(gap.id))
      .forEach((gap) => gaps.delete(`${gap.id}:${gap.reason}`));
  } else if (listingComplete) {
    log("Instagram listed no posts; keeping the gallery as is.");
  }

  if (updated.length > 0 || removed.length > 0) {
    store.writeManifest(manifest);
  }

  const nextState = {
    failures: [...failures.values()],
    gaps: [...gaps.values()],
  };
  const ok = !fatalError && failures.size === 0;
  const changed =
    added.length > 0 ||
    updated.length > 0 ||
    removed.length > 0 ||
    serializeState(state) !== serializeState(nextState);
  const heartbeatDue =
    !state.lastSuccessAt ||
    now().getTime() - Date.parse(state.lastSuccessAt) >= HEARTBEAT_MS;
  const lastSuccessAt =
    ok && (changed || heartbeatDue) ? now().toISOString() : state.lastSuccessAt;

  store.writeState({ lastSuccessAt, ...nextState });

  return {
    ok,
    listingComplete,
    fatalError,
    listed: listed.length,
    added,
    updated,
    removed,
    skipped,
    failures: nextState.failures,
    gaps: nextState.gaps,
    lastSuccessAt,
  };
}
