import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { before, describe, it } from "node:test";
import type { ApiMedia } from "./api.ts";
import { DownloadError, InstagramApiError, SizeLimitError } from "./errors.ts";
import { processImage, validateVideo } from "./process.ts";
import { createStore } from "./store.ts";
import {
  HEARTBEAT_MS,
  MAX_ATTEMPTS,
  planPost,
  sync,
  type SyncDeps,
} from "./sync.ts";
import {
  CDN,
  fakeApi,
  fakeDownloader,
  imagePost,
  jpeg,
  tempRoot,
} from "./testing.ts";

const NOW = new Date("2026-10-09T09:17:00.000Z");
let image: Buffer;

before(async () => {
  image = await jpeg(1200, 1500);
});

function carousel(id: string, timestamp: string, childIds: string[]): ApiMedia {
  return {
    id,
    media_type: "CAROUSEL_ALBUM",
    timestamp,
    permalink: `https://www.instagram.com/p/${id}/`,
    children: {
      data: childIds.map((childId) => ({
        id: childId,
        media_type: "IMAGE",
        media_url: `${CDN}/${childId}.jpg`,
      })),
    },
  };
}

function video(id: string, timestamp: string, withVideo = true): ApiMedia {
  return {
    id,
    media_type: "VIDEO",
    timestamp,
    permalink: `https://www.instagram.com/reel/${id}/`,
    thumbnail_url: `${CDN}/${id}-thumb.jpg`,
    media_url: withVideo ? `${CDN}/${id}.mp4` : undefined,
  };
}

function setup(t: Parameters<typeof tempRoot>[0]) {
  const root = tempRoot(t);
  const store = createStore({ rootDir: root });
  const deps = (
    api: SyncDeps["api"],
    download = fakeDownloader(image),
    now = NOW,
  ): SyncDeps => ({
    api,
    download,
    processImage,
    validateVideo,
    store,
    now: () => now,
  });
  const assets = (postId: string) => {
    const dir = path.join(root, "public/instagram", postId);
    return existsSync(dir) ? readdirSync(dir).sort() : null;
  };
  return { root, store, deps, assets };
}

describe("planPost", () => {
  it("maps media types and keeps carousel order", () => {
    const { plan } = planPost(
      carousel("c1", "2025-03-01T12:00:00+0000", ["z", "a", "m"]),
    );
    assert.equal(plan?.type, "carousel");
    assert.deepEqual(
      plan?.items.map((item) => item.id),
      ["z", "a", "m"],
    );
    assert.equal(plan?.publishedAt, "2025-03-01T12:00:00.000Z");
    assert.equal(
      planPost(video("v", "2025-03-01T12:00:00+0000")).plan?.type,
      "video",
    );
  });

  it("uses a video's thumbnail as its image", () => {
    const { plan } = planPost(video("v", "2025-03-01T12:00:00+0000"));
    assert.equal(plan?.items[0].imageUrl, `${CDN}/v-thumb.jpg`);
    assert.equal(plan?.items[0].videoUrl, `${CDN}/v.mp4`);
  });

  it("reports a post without media as a gap instead of planning it", () => {
    const media = {
      ...imagePost("x", "2025-03-01T12:00:00+0000"),
      media_url: undefined,
    };
    const { plan, gaps } = planPost(media);
    assert.equal(plan, null);
    assert.deepEqual(
      gaps.map((gap) => gap.reason),
      ["no-media"],
    );
  });

  it("keeps a video without a downloadable file as a poster-only gap", () => {
    const { plan, gaps } = planPost(
      video("v", "2025-03-01T12:00:00+0000", false),
    );
    assert.ok(plan);
    assert.deepEqual(
      gaps.map((gap) => gap.reason),
      ["video-unavailable"],
    );
  });
});

describe("sync", () => {
  it("imports a new post with its original timestamp and optimised files", async (t) => {
    const { store, deps, assets } = setup(t);
    const result = await sync(
      deps(fakeApi([imagePost("p1", "2025-05-01T18:30:00+0000", "Hello.")])),
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.added, ["p1"]);
    const post = store.readManifest().p1;
    assert.equal(post.publishedAt, "2025-05-01T18:30:00.000Z");
    assert.equal(post.caption, "Hello.");
    assert.equal(post.items[0].grid, "/instagram/p1/0-640.webp");
    assert.deepEqual(assets("p1"), ["0-1440.webp", "0-640.webp"]);
    assert.equal(store.readState().lastSuccessAt, NOW.toISOString());
  });

  it("imports a carousel as one post with its items in order", async (t) => {
    const { store, deps, assets } = setup(t);
    await sync(
      deps(
        fakeApi([carousel("c1", "2025-05-01T18:30:00+0000", ["b", "a", "c"])]),
      ),
    );

    const post = store.readManifest().c1;
    assert.equal(post.type, "carousel");
    assert.deepEqual(
      post.items.map((item) => item.id),
      ["b", "a", "c"],
    );
    assert.deepEqual(
      post.items.map((item) => item.full),
      [
        "/instagram/c1/0-1440.webp",
        "/instagram/c1/1-1440.webp",
        "/instagram/c1/2-1440.webp",
      ],
    );
    assert.equal(assets("c1")?.length, 6);
  });

  it("stores a video with its poster", async (t) => {
    const { store, deps, assets } = setup(t);
    await sync(deps(fakeApi([video("v1", "2025-05-01T18:30:00+0000")])));

    const [item] = store.readManifest().v1.items;
    assert.equal(item.kind, "video");
    assert.equal(item.video, "/instagram/v1/0.mp4");
    assert.deepEqual(assets("v1"), ["0-1440.webp", "0-640.webp", "0.mp4"]);
  });

  it("keeps an oversized video as a poster and records the gap", async (t) => {
    const { store, deps } = setup(t);
    const download = fakeDownloader(
      image,
      new Map([[`${CDN}/v1.mp4`, new SizeLimitError("too big")]]),
    );
    const result = await sync(
      deps(fakeApi([video("v1", "2025-05-01T18:30:00+0000")]), download),
    );

    assert.equal(result.ok, true);
    assert.equal(store.readManifest().v1.items[0].video, undefined);
    assert.deepEqual(
      result.gaps.map((gap) => gap.reason),
      ["video-too-large"],
    );
  });

  it("records posts the API can't supply media for without importing them", async (t) => {
    const { store, deps } = setup(t);
    const missing = {
      ...imagePost("x", "2025-05-01T18:30:00+0000"),
      media_url: undefined,
    };
    const result = await sync(deps(fakeApi([missing])));

    assert.equal(result.ok, true);
    assert.deepEqual(store.readManifest(), {});
    assert.deepEqual(
      store.readState().gaps.map((gap) => gap.id),
      ["x"],
    );
  });

  it("changes nothing and downloads nothing when there are no new posts", async (t) => {
    const { store, deps } = setup(t);
    const posts = [imagePost("p1", "2025-05-01T18:30:00+0000")];
    await sync(deps(fakeApi(posts)));
    const manifest = store.readManifest();

    const download = fakeDownloader(image);
    const result = await sync(deps(fakeApi(posts), download));

    assert.deepEqual(result.added, []);
    assert.deepEqual(download.calls, []);
    assert.deepEqual(store.readManifest(), manifest);
  });

  it("never duplicates a post across repeated runs", async (t) => {
    const { store, deps } = setup(t);
    const posts = [
      imagePost("p1", "2025-05-01T18:30:00+0000"),
      carousel("c1", "2025-05-02T18:30:00+0000", ["a", "b"]),
    ];
    await sync(deps(fakeApi(posts)));
    await sync(deps(fakeApi(posts)));
    await sync(deps(fakeApi([posts[1]], [posts[0], ...posts])));

    assert.deepEqual(Object.keys(store.readManifest()), ["c1", "p1"]);
  });

  it("refreshes edited captions without redownloading media", async (t) => {
    const { store, deps } = setup(t);
    await sync(
      deps(fakeApi([imagePost("p1", "2025-05-01T18:30:00+0000", "Old")])),
    );

    const download = fakeDownloader(image);
    const result = await sync(
      deps(
        fakeApi([imagePost("p1", "2025-05-01T18:30:00+0000", "New")]),
        download,
      ),
    );

    assert.deepEqual(result.updated, ["p1"]);
    assert.equal(store.readManifest().p1.caption, "New");
    assert.deepEqual(download.calls, []);
  });

  it("keeps a partially downloaded post out of the gallery, then retries it", async (t) => {
    const { store, deps, assets } = setup(t);
    const posts = [carousel("c1", "2025-05-01T18:30:00+0000", ["a", "b", "c"])];
    const broken = fakeDownloader(
      image,
      new Map([[`${CDN}/b.jpg`, new DownloadError("responded 403")]]),
    );

    const failed = await sync(deps(fakeApi(posts), broken));
    assert.equal(failed.ok, false);
    assert.deepEqual(store.readManifest(), {});
    assert.equal(assets("c1"), null);
    assert.deepEqual(
      store.readState().failures.map((f) => [f.id, f.attempts]),
      [["c1", 1]],
    );

    const retried = await sync(deps(fakeApi(posts)));
    assert.equal(retried.ok, true);
    assert.equal(store.readManifest().c1.items.length, 3);
    assert.deepEqual(store.readState().failures, []);
  });

  it("parks a post after repeated failures until asked to retry", async (t) => {
    const { store, deps } = setup(t);
    const posts = [imagePost("p1", "2025-05-01T18:30:00+0000")];
    const broken = () =>
      fakeDownloader(
        image,
        new Map([[`${CDN}/p1.jpg`, new DownloadError("403")]]),
      );
    for (let run = 0; run < MAX_ATTEMPTS; run += 1) {
      await sync(deps(fakeApi(posts), broken()));
    }

    const download = fakeDownloader(image);
    const parked = await sync(deps(fakeApi(posts), download));
    assert.deepEqual(parked.skipped, ["p1"]);
    assert.deepEqual(download.calls, []);

    const retried = await sync(deps(fakeApi(posts)), { retryFailed: true });
    assert.deepEqual(retried.added, ["p1"]);
    assert.ok(store.readManifest().p1);
  });

  it("clears out files a crashed run left behind", async (t) => {
    const { root, deps, assets } = setup(t);
    mkdirSync(path.join(root, "public/instagram/ghost"), { recursive: true });
    writeFileSync(path.join(root, "public/instagram/ghost/0-640.webp"), "half");

    await sync(deps(fakeApi([])));
    assert.equal(assets("ghost"), null);
  });

  it("only mirrors deletions from a complete listing", async (t) => {
    const { store, deps, assets } = setup(t);
    await sync(
      deps(
        fakeApi([
          imagePost("keep", "2025-05-02T18:30:00+0000"),
          imagePost("gone", "2025-05-01T18:30:00+0000"),
        ]),
      ),
    );

    const interrupted = await sync(
      deps(
        fakeApi(
          [imagePost("keep", "2025-05-02T18:30:00+0000")],
          new InstagramApiError("rate limited"),
        ),
      ),
    );
    assert.equal(interrupted.ok, false);
    assert.equal(interrupted.listingComplete, false);
    assert.ok(store.readManifest().gone);

    const complete = await sync(
      deps(fakeApi([imagePost("keep", "2025-05-02T18:30:00+0000")])),
    );
    assert.deepEqual(complete.removed, ["gone"]);
    assert.deepEqual(Object.keys(store.readManifest()), ["keep"]);
    assert.equal(assets("gone"), null);
  });

  it("ignores an empty listing for an account that has posts", async (t) => {
    const { store, deps } = setup(t);
    await sync(deps(fakeApi([imagePost("p1", "2025-05-01T18:30:00+0000")])));
    const result = await sync(deps(fakeApi([])));

    assert.deepEqual(result.removed, []);
    assert.ok(store.readManifest().p1);
  });

  it("replaces an export backfill once the API can supply the post", async (t) => {
    const { root, store, deps, assets } = setup(t);
    store.writeManifest({
      "export-1746124200": {
        id: "export-1746124200",
        type: "image",
        publishedAt: "2025-05-01T18:30:00.000Z",
        permalink: "https://www.instagram.com/kizukuraudo",
        items: [],
      },
    });
    mkdirSync(path.join(root, "public/instagram/export-1746124200"), {
      recursive: true,
    });

    const result = await sync(
      deps(fakeApi([imagePost("p1", "2025-05-01T18:30:05+0000")])),
    );
    assert.deepEqual(result.removed, ["export-1746124200"]);
    assert.deepEqual(Object.keys(store.readManifest()), ["p1"]);
    assert.equal(assets("export-1746124200"), null);
  });

  it("writes nothing on a dry run", async (t) => {
    const { store, deps, assets } = setup(t);
    const download = fakeDownloader(image);
    const result = await sync(
      deps(fakeApi([imagePost("p1", "2025-05-01T18:30:00+0000")]), download),
      { dryRun: true },
    );

    assert.deepEqual(result.added, ["p1"]);
    assert.deepEqual(download.calls, []);
    assert.deepEqual(store.readManifest(), {});
    assert.equal(assets("p1"), null);
  });

  it("records a quiet run's success only once the heartbeat is due", async (t) => {
    const { store, deps } = setup(t);
    const posts = [imagePost("p1", "2025-05-01T18:30:00+0000")];
    await sync(deps(fakeApi(posts)));

    const nextDay = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
    await sync(deps(fakeApi(posts), fakeDownloader(image), nextDay));
    assert.equal(store.readState().lastSuccessAt, NOW.toISOString());

    const nextWeek = new Date(NOW.getTime() + HEARTBEAT_MS);
    await sync(deps(fakeApi(posts), fakeDownloader(image), nextWeek));
    assert.equal(store.readState().lastSuccessAt, nextWeek.toISOString());
  });
});
