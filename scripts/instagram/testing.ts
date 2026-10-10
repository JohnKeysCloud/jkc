import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { ApiMedia } from "./api.ts";
import type { Downloader } from "./download.ts";

export const CDN = "https://scontent.cdninstagram.com";

export async function jpeg(width = 1200, height = 1500): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: "#7fff00" },
  })
    .jpeg()
    .toBuffer();
}

/** The smallest buffer that passes for an MP4: a size and an `ftyp` box. */
export function mp4(bytes = 64): Buffer {
  const buffer = Buffer.alloc(bytes);
  buffer.writeUInt32BE(24, 0);
  buffer.write("ftypisom", 4, "latin1");
  return buffer;
}

export function tempRoot(t: { after: (fn: () => void) => void }): string {
  const root = mkdtempSync(path.join(tmpdir(), "jkc-instagram-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

export function imagePost(
  id: string,
  timestamp: string,
  caption?: string,
): ApiMedia {
  return {
    id,
    media_type: "IMAGE",
    timestamp,
    caption,
    permalink: `https://www.instagram.com/p/${id}/`,
    media_url: `${CDN}/${id}.jpg`,
  };
}

export function fakeApi(...pages: (ApiMedia[] | Error)[]) {
  return {
    async *listMedia() {
      for (const page of pages) {
        if (page instanceof Error) {
          throw page;
        }
        yield page;
      }
    },
  };
}

/**
 * Serves generated media for any URL; `failures` maps a URL to the error it
 * throws instead. Records every request.
 */
export function fakeDownloader(
  image: Buffer,
  failures: Map<string, Error> = new Map(),
): Downloader & { calls: string[] } {
  const calls: string[] = [];
  const download = async (url: string, kind: "image" | "video") => {
    calls.push(url);
    const failure = failures.get(url);
    if (failure) {
      throw failure;
    }
    return kind === "video" ? mp4() : image;
  };
  return Object.assign(download, { calls });
}
