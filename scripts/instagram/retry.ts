import { RetryableError } from "./errors.ts";

export type Sleep = (ms: number) => Promise<void>;

export const sleep: Sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  sleep?: Sleep;
};

/**
 * Retries only `RetryableError`s, with exponential backoff; anything else is
 * a permanent failure and surfaces immediately.
 */
export async function withRetry<T>(
  task: () => Promise<T>,
  { attempts = 3, baseDelayMs = 500, sleep: wait = sleep }: RetryOptions = {},
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (!(error instanceof RetryableError) || attempt >= attempts) {
        throw error;
      }
      await wait(baseDelayMs * 2 ** (attempt - 1));
    }
  }
}

/** Fetch rejects with these on network failure or an `AbortSignal` timeout. */
export function isTransientFetchError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError"))
  );
}
