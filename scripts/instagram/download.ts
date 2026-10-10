import { DownloadError, RetryableError, SizeLimitError } from "./errors.ts";
import { isTransientFetchError, type Sleep, withRetry } from "./retry.ts";

export type DownloadKind = "image" | "video";

type Limit = {
  maxBytes: number;
  timeoutMs: number;
  contentType: RegExp;
};

const MB = 1024 * 1024;

export const DOWNLOAD_LIMITS: Record<DownloadKind, Limit> = {
  image: { maxBytes: 30 * MB, timeoutMs: 30_000, contentType: /^image\// },
  video: { maxBytes: 50 * MB, timeoutMs: 120_000, contentType: /^video\// },
};

/** Instagram serves media from its own CDN and Facebook's. */
const ALLOWED_HOST_SUFFIXES = [".cdninstagram.com", ".fbcdn.net"];

export type Downloader = (url: string, kind: DownloadKind) => Promise<Buffer>;

type DownloaderOptions = {
  fetchImpl?: typeof fetch;
  limits?: Record<DownloadKind, Limit>;
  sleep?: Sleep;
};

/** Media URLs are signed; logs only ever get the host and path. */
function describeUrl(url: URL): string {
  return `${url.host}${url.pathname}`;
}

export function assertAllowedUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new DownloadError("Media URL is not a valid URL");
  }

  const isAllowedHost = ALLOWED_HOST_SUFFIXES.some((suffix) =>
    url.hostname.endsWith(suffix),
  );
  if (url.protocol !== "https:" || !isAllowedHost) {
    throw new DownloadError(
      `Refusing to download from ${url.protocol}//${url.host}`,
    );
  }
  return url;
}

async function readCapped(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
  label: string,
): Promise<Buffer> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new SizeLimitError(`${label} exceeds ${maxBytes / MB} MB`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export function createDownloader({
  fetchImpl = fetch,
  limits = DOWNLOAD_LIMITS,
  sleep,
}: DownloaderOptions = {}): Downloader {
  return async (raw, kind) => {
    const url = assertAllowedUrl(raw);
    const limit = limits[kind];
    const label = describeUrl(url);

    return withRetry(
      async () => {
        let response: Response;
        try {
          response = await fetchImpl(url, {
            redirect: "follow",
            signal: AbortSignal.timeout(limit.timeoutMs),
          });
        } catch (error) {
          if (isTransientFetchError(error)) {
            throw new RetryableError(`Download of ${label} failed to complete`);
          }
          throw error;
        }

        if (response.url) {
          assertAllowedUrl(response.url);
        }
        if (response.status >= 500 || response.status === 429) {
          throw new RetryableError(`${label} responded ${response.status}`);
        }
        if (!response.ok || !response.body) {
          throw new DownloadError(`${label} responded ${response.status}`);
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!limit.contentType.test(contentType)) {
          throw new DownloadError(
            `${label} is ${contentType || "untyped"}, expected ${kind}`,
          );
        }

        const declaredLength = Number(response.headers.get("content-length"));
        if (declaredLength > limit.maxBytes) {
          await response.body.cancel();
          throw new SizeLimitError(
            `${label} exceeds ${limit.maxBytes / MB} MB`,
          );
        }

        try {
          return await readCapped(response.body, limit.maxBytes, label);
        } catch (error) {
          if (isTransientFetchError(error)) {
            throw new RetryableError(`Download of ${label} was interrupted`);
          }
          throw error;
        }
      },
      { sleep },
    );
  };
}
