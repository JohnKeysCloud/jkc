import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { type InstagramManifest, sortPosts } from "../../src/lib/instagram.ts";

export type GapReason = "no-media" | "video-unavailable" | "video-too-large";

/** A post, or part of one, the API couldn't supply; never dropped silently. */
export type SyncGap = {
  id: string;
  permalink: string;
  publishedAt: string;
  reason: GapReason;
};

export type SyncFailure = {
  id: string;
  permalink: string;
  attempts: number;
  lastError: string;
  lastAttemptAt: string;
};

export type SyncState = {
  lastSuccessAt: string | null;
  failures: SyncFailure[];
  gaps: SyncGap[];
};

export type StagedPost = {
  write(name: string, data: Buffer): void;
  /** Moves every staged file into `public/` in one rename. */
  promote(): void;
  discard(): void;
};

export type Store = {
  readManifest(): InstagramManifest;
  writeManifest(manifest: InstagramManifest): void;
  readState(): SyncState;
  writeState(state: SyncState): void;
  stage(postId: string): StagedPost;
  removePostAssets(postId: string): void;
  /** Deletes asset folders no manifest entry points at; returns their ids. */
  sweepOrphans(manifest: InstagramManifest): string[];
  publicPath(postId: string, name: string): string;
};

const EMPTY_STATE: SyncState = { lastSuccessAt: null, failures: [], gaps: [] };
const PUBLIC_PREFIX = "/instagram";
/** Ids become folder names, so anything but digits, letters, `_` and `-` is refused. */
const SAFE_ID = /^[\w-]+$/;

function assertSafeId(postId: string) {
  if (!SAFE_ID.test(postId)) {
    throw new Error(`Unsafe post id: ${JSON.stringify(postId)}`);
  }
}

function readJson<T>(file: string, fallback: T): T {
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as T)
    : fallback;
}

/** A crash mid-write leaves the previous file intact rather than a torn one. */
function writeJsonAtomic(file: string, value: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, file);
}

export function createStore({ rootDir }: { rootDir: string }): Store {
  const contentDir = path.join(rootDir, "src/content/instagram");
  const manifestFile = path.join(contentDir, "posts.json");
  const stateFile = path.join(contentDir, "sync-state.json");
  const publicDir = path.join(rootDir, "public", PUBLIC_PREFIX);
  const stagingDir = path.join(rootDir, ".instagram-staging");

  const assetDir = (postId: string) => {
    assertSafeId(postId);
    return path.join(publicDir, postId);
  };

  return {
    readManifest: () => readJson<InstagramManifest>(manifestFile, {}),

    // Newest first, so the file diffs read like the gallery.
    writeManifest(manifest) {
      writeJsonAtomic(
        manifestFile,
        Object.fromEntries(
          sortPosts(Object.values(manifest)).map((post) => [post.id, post]),
        ),
      );
    },

    readState: () => ({ ...EMPTY_STATE, ...readJson(stateFile, EMPTY_STATE) }),

    writeState(state) {
      writeJsonAtomic(stateFile, {
        lastSuccessAt: state.lastSuccessAt,
        failures: [...state.failures].sort((a, b) => a.id.localeCompare(b.id)),
        gaps: [...state.gaps].sort(
          (a, b) =>
            b.publishedAt.localeCompare(a.publishedAt) ||
            a.reason.localeCompare(b.reason),
        ),
      } satisfies SyncState);
    },

    stage(postId) {
      assertSafeId(postId);
      const directory = path.join(stagingDir, postId);
      rmSync(directory, { recursive: true, force: true });
      mkdirSync(directory, { recursive: true });

      return {
        write(name, data) {
          writeFileSync(path.join(directory, name), data);
        },
        promote() {
          const target = assetDir(postId);
          // Only a crash between promotion and the manifest write leaves a
          // folder here, and the manifest never saw it.
          rmSync(target, { recursive: true, force: true });
          mkdirSync(publicDir, { recursive: true });
          renameSync(directory, target);
        },
        discard() {
          rmSync(directory, { recursive: true, force: true });
        },
      };
    },

    removePostAssets(postId) {
      rmSync(assetDir(postId), { recursive: true, force: true });
    },

    sweepOrphans(manifest) {
      rmSync(stagingDir, { recursive: true, force: true });
      if (!existsSync(publicDir)) {
        return [];
      }

      const orphans = readdirSync(publicDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !(entry.name in manifest))
        .map((entry) => entry.name);
      orphans.forEach((postId) =>
        rmSync(path.join(publicDir, postId), { recursive: true, force: true }),
      );
      return orphans;
    },

    publicPath(postId, name) {
      assertSafeId(postId);
      return `${PUBLIC_PREFIX}/${postId}/${name}`;
    },
  };
}
