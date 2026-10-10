/** Worth another attempt: network failures, timeouts, 5xx and 429. */
export class RetryableError extends Error {
  override name = "RetryableError";
}

export class InstagramApiError extends Error {
  override name = "InstagramApiError";
  readonly code: number | undefined;
  readonly status: number | undefined;

  constructor(message: string, code?: number, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** A download that won't succeed on retry: bad host, type, or status. */
export class DownloadError extends Error {
  override name = "DownloadError";
}

export class SizeLimitError extends DownloadError {
  override name = "SizeLimitError";
}

/** Downloaded bytes that aren't the media they claim to be. */
export class MediaError extends Error {
  override name = "MediaError";
}

const TOKEN_PATTERN = /(access_token=)[^&\s"]+/gi;

/** Strips access tokens from anything headed for a log or the sync state. */
export function redact(text: string): string {
  return text.replace(TOKEN_PATTERN, "$1[redacted]");
}

export function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return redact(message);
}
