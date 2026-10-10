import { InstagramApiError, RetryableError, redact } from "./errors.ts";
import { isTransientFetchError, type Sleep, withRetry } from "./retry.ts";

export const GRAPH_ORIGIN = "https://graph.instagram.com";

const PAGE_LIMIT = 50;
const REQUEST_TIMEOUT_MS = 30_000;
/** Graph API code for a field the account or API version doesn't offer. */
const UNKNOWN_FIELD_CODE = 100;

export type ApiMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

export type ApiChild = {
  id: string;
  media_type: ApiMediaType;
  media_url?: string;
  thumbnail_url?: string;
  alt_text?: string;
};

export type ApiMedia = ApiChild & {
  media_product_type?: string;
  timestamp: string;
  caption?: string;
  permalink: string;
  children?: { data: ApiChild[] };
};

type MediaPage = {
  data?: ApiMedia[];
  paging?: { next?: string };
};

type ApiErrorBody = {
  error?: { message?: string; code?: number };
};

export type RefreshedToken = {
  accessToken: string;
  expiresIn: number;
};

export type InstagramApi = {
  /** Yields one page of the account's media at a time, newest first. */
  listMedia(): AsyncGenerator<ApiMedia[]>;
  refreshToken(): Promise<RefreshedToken>;
};

type ApiOptions = {
  accessToken: string;
  fetchImpl?: typeof fetch;
  sleep?: Sleep;
};

function mediaFields(includeAltText: boolean): string {
  const alt = includeAltText ? ",alt_text" : "";
  return [
    "id",
    "media_type",
    "media_product_type",
    "timestamp",
    "caption",
    "permalink",
    "media_url",
    `thumbnail_url${alt}`,
    `children{id,media_type,media_url,thumbnail_url${alt}}`,
  ].join(",");
}

export function createInstagramApi({
  accessToken,
  fetchImpl = fetch,
  sleep,
}: ApiOptions): InstagramApi {
  async function request<T>(url: URL): Promise<T> {
    return withRetry(
      async () => {
        let response: Response;
        try {
          response = await fetchImpl(url, {
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          });
        } catch (error) {
          if (isTransientFetchError(error)) {
            throw new RetryableError("Instagram API request failed to send");
          }
          throw error;
        }

        const body = (await response.json().catch(() => null)) as
          (T & ApiErrorBody) | null;
        if (response.ok && body) {
          return body;
        }

        const message = redact(
          body?.error?.message ?? `Instagram API responded ${response.status}`,
        );
        if (response.status >= 500 || response.status === 429) {
          throw new RetryableError(message);
        }
        throw new InstagramApiError(
          message,
          body?.error?.code,
          response.status,
        );
      },
      { sleep },
    );
  }

  function firstPage(includeAltText: boolean): URL {
    const url = new URL("/me/media", GRAPH_ORIGIN);
    url.searchParams.set("fields", mediaFields(includeAltText));
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("access_token", accessToken);
    return url;
  }

  // Pagination links carry the token, so only Instagram's own host may get
  // one.
  function nextPage(link: string): URL {
    const url = new URL(link);
    if (url.origin !== GRAPH_ORIGIN) {
      throw new InstagramApiError(
        `Refusing to follow pagination to ${url.origin}`,
      );
    }
    return url;
  }

  return {
    async *listMedia() {
      let includeAltText = true;
      let isFirstPage = true;
      let url: URL | null = firstPage(includeAltText);

      while (url) {
        let page: MediaPage;
        try {
          page = await request<MediaPage>(url);
        } catch (error) {
          const altTextUnsupported =
            isFirstPage &&
            includeAltText &&
            error instanceof InstagramApiError &&
            error.code === UNKNOWN_FIELD_CODE &&
            error.message.includes("alt_text");
          if (!altTextUnsupported) {
            throw error;
          }
          includeAltText = false;
          url = firstPage(includeAltText);
          continue;
        }

        isFirstPage = false;
        yield page.data ?? [];
        url = page.paging?.next ? nextPage(page.paging.next) : null;
      }
    },

    async refreshToken() {
      const url = new URL("/refresh_access_token", GRAPH_ORIGIN);
      url.searchParams.set("grant_type", "ig_refresh_token");
      url.searchParams.set("access_token", accessToken);
      const body = await request<{
        access_token?: string;
        expires_in?: number;
      }>(url);

      if (!body.access_token) {
        throw new InstagramApiError("Token refresh returned no token");
      }
      return {
        accessToken: body.access_token,
        expiresIn: body.expires_in ?? 0,
      };
    },
  };
}
