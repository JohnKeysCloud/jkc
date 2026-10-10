import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fixExportText, importExport, readExport } from "./export.ts";
import { processImage, validateVideo } from "./process.ts";
import { createStore } from "./store.ts";
import { jpeg, mp4, tempRoot } from "./testing.ts";

const PROFILE = "https://www.instagram.com/kizukuraudo";
const MAY_FIRST = 1746124200;
const MAY_SECOND = MAY_FIRST + 86_400;

async function writeExport(root: string, posts: unknown[]) {
  const content = path.join(root, "export/your_instagram_activity/media");
  const media = path.join(root, "export/media/posts/202505");
  mkdirSync(content, { recursive: true });
  mkdirSync(media, { recursive: true });
  writeFileSync(path.join(media, "a.jpg"), await jpeg(800, 1000));
  writeFileSync(path.join(media, "b.jpg"), await jpeg(800, 800));
  writeFileSync(path.join(media, "c.mp4"), mp4());
  writeFileSync(path.join(content, "posts_1.json"), JSON.stringify(posts));
  return path.join(root, "export");
}

describe("fixExportText", () => {
  it("repairs Meta's Latin-1 escaped UTF-8", () => {
    assert.equal(
      fixExportText("caf\u00c3\u00a9 \u00e2\u0098\u0081\u00ef\u00b8\u008f"),
      "café ☁️",
    );
  });

  it("leaves text that's already decoded alone", () => {
    assert.equal(fixExportText("cloud ☁️"), "cloud ☁️");
  });
});

describe("readExport", () => {
  it("reads single posts and carousels with their timestamps and captions", async (t) => {
    const dir = await writeExport(tempRoot(t), [
      {
        media: [
          {
            uri: "media/posts/202505/a.jpg",
            creation_timestamp: MAY_FIRST,
            title: "One",
          },
        ],
      },
      {
        title: "Two",
        creation_timestamp: MAY_SECOND,
        media: [
          { uri: "media/posts/202505/b.jpg", creation_timestamp: MAY_SECOND },
          { uri: "media/posts/202505/c.mp4", creation_timestamp: MAY_SECOND },
        ],
      },
    ]);
    const posts = readExport(dir);

    assert.deepEqual(
      posts.map((post) => [
        post.publishedAt,
        post.caption,
        post.files.map((f) => f.kind),
      ]),
      [
        ["2025-05-01T18:30:00.000Z", "One", ["image"]],
        ["2025-05-02T18:30:00.000Z", "Two", ["image", "video"]],
      ],
    );
  });

  it("refuses files outside the export folder", async (t) => {
    const dir = await writeExport(tempRoot(t), [
      {
        media: [{ uri: "../../etc/passwd.jpg", creation_timestamp: MAY_FIRST }],
      },
    ]);
    assert.throws(() => readExport(dir), /escapes the export folder/);
  });
});

describe("importExport", () => {
  it("backfills only the posts the API reported without media", async (t) => {
    const root = tempRoot(t);
    const store = createStore({ rootDir: root });
    store.writeState({
      lastSuccessAt: null,
      failures: [],
      gaps: [
        {
          id: "17890",
          permalink: "https://www.instagram.com/p/17890/",
          publishedAt: "2025-05-02T18:30:03.000Z",
          reason: "no-media",
        },
      ],
    });
    const dir = await writeExport(root, [
      {
        media: [
          { uri: "media/posts/202505/a.jpg", creation_timestamp: MAY_FIRST },
        ],
      },
      {
        title: "Two",
        creation_timestamp: MAY_SECOND,
        media: [
          { uri: "media/posts/202505/b.jpg" },
          { uri: "media/posts/202505/c.mp4" },
        ],
      },
    ]);

    const result = await importExport({
      root: dir,
      store,
      processImage,
      validateVideo,
      profileUrl: PROFILE,
      extractPoster: () => null,
    });

    // The video has no poster without ffmpeg, so the carousel fails whole.
    assert.equal(result.failed.length, 1);
    assert.match(result.failed[0].error, /ffmpeg/);
    assert.equal(result.skipped, 1);
    assert.deepEqual(store.readManifest(), {});
  });

  it("imports gap posts with poster frames and resolves the gap", async (t) => {
    const root = tempRoot(t);
    const store = createStore({ rootDir: root });
    store.writeState({
      lastSuccessAt: null,
      failures: [],
      gaps: [
        {
          id: "17890",
          permalink: "https://www.instagram.com/p/17890/",
          publishedAt: "2025-05-02T18:30:03.000Z",
          reason: "no-media",
        },
      ],
    });
    const dir = await writeExport(root, [
      {
        title: "Two",
        creation_timestamp: MAY_SECOND,
        media: [
          { uri: "media/posts/202505/b.jpg" },
          { uri: "media/posts/202505/c.mp4" },
        ],
      },
    ]);
    const poster = await jpeg(720, 1280);

    const result = await importExport({
      root: dir,
      store,
      processImage,
      validateVideo,
      profileUrl: PROFILE,
      extractPoster: () => poster,
    });

    assert.deepEqual(result.added, [`export-${MAY_SECOND}`]);
    const post = store.readManifest()[`export-${MAY_SECOND}`];
    assert.equal(post.type, "carousel");
    assert.equal(post.permalink, "https://www.instagram.com/p/17890/");
    assert.deepEqual(
      post.items.map((item) => [item.kind, Boolean(item.video)]),
      [
        ["image", false],
        ["video", true],
      ],
    );
    assert.deepEqual(store.readState().gaps, []);
  });

  it("imports posts the API never listed only when asked", async (t) => {
    const root = tempRoot(t);
    const store = createStore({ rootDir: root });
    const dir = await writeExport(root, [
      {
        media: [
          { uri: "media/posts/202505/a.jpg", creation_timestamp: MAY_FIRST },
        ],
      },
    ]);
    const options = {
      root: dir,
      store,
      processImage,
      validateVideo,
      profileUrl: PROFILE,
    };

    assert.equal((await importExport(options)).added.length, 0);
    const result = await importExport({ ...options, includeMissing: true });
    assert.deepEqual(result.added, [`export-${MAY_FIRST}`]);
    assert.equal(
      store.readManifest()[`export-${MAY_FIRST}`].permalink,
      PROFILE,
    );

    const again = await importExport({ ...options, includeMissing: true });
    assert.equal(again.added.length, 0);
  });
});
