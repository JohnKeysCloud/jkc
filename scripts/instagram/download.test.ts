import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAllowedUrl,
  createDownloader,
  DOWNLOAD_LIMITS,
} from "./download.ts";
import { DownloadError, SizeLimitError } from "./errors.ts";
import { CDN } from "./testing.ts";

const noSleep = async () => {};
const IMAGE_URL = `${CDN}/v/photo.jpg?sig=abc`;

function fetchSequence(...responses: (Response | Error)[]) {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    const next = responses.shift();
    if (!next || next instanceof Error) {
      throw next ?? new Error("Unexpected request");
    }
    return next;
  }) as typeof fetch;
  return { fetchImpl, calls: () => calls };
}

const image = (body: BodyInit, headers: HeadersInit = {}) =>
  new Response(body, {
    headers: { "content-type": "image/jpeg", ...headers },
  });

describe("assertAllowedUrl", () => {
  it("accepts Instagram and Facebook CDN hosts over HTTPS", () => {
    assert.ok(assertAllowedUrl(IMAGE_URL));
    assert.ok(assertAllowedUrl("https://video.xx.fbcdn.net/v/clip.mp4"));
  });

  it("rejects other hosts, look-alikes, and plain HTTP", () => {
    [
      "https://example.com/photo.jpg",
      "https://cdninstagram.com.evil.example/photo.jpg",
      "http://scontent.cdninstagram.com/photo.jpg",
      "not a url",
    ].forEach((url) =>
      assert.throws(() => assertAllowedUrl(url), DownloadError),
    );
  });
});

describe("createDownloader", () => {
  it("returns the body of a valid image", async () => {
    const { fetchImpl } = fetchSequence(image("pixels"));
    const bytes = await createDownloader({ fetchImpl })(IMAGE_URL, "image");
    assert.equal(bytes.toString(), "pixels");
  });

  it("never requests a disallowed URL", async () => {
    const { fetchImpl, calls } = fetchSequence();
    await assert.rejects(
      createDownloader({ fetchImpl })("https://example.com/a.jpg", "image"),
      DownloadError,
    );
    assert.equal(calls(), 0);
  });

  it("rejects a response of the wrong type", async () => {
    const { fetchImpl } = fetchSequence(
      new Response("<html>", { headers: { "content-type": "text/html" } }),
    );
    await assert.rejects(
      createDownloader({ fetchImpl })(IMAGE_URL, "image"),
      /expected image/,
    );
  });

  it("rejects a declared size over the cap without reading it", async () => {
    const { fetchImpl } = fetchSequence(
      image("x", {
        "content-length": String(DOWNLOAD_LIMITS.image.maxBytes + 1),
      }),
    );
    await assert.rejects(
      createDownloader({ fetchImpl })(IMAGE_URL, "image"),
      SizeLimitError,
    );
  });

  it("stops reading once an undeclared body passes the cap", async () => {
    const limits = {
      ...DOWNLOAD_LIMITS,
      image: { ...DOWNLOAD_LIMITS.image, maxBytes: 8 },
    };
    const { fetchImpl } = fetchSequence(image("0123456789abcdef"));
    await assert.rejects(
      createDownloader({ fetchImpl, limits })(IMAGE_URL, "image"),
      SizeLimitError,
    );
  });

  it("retries transient failures, then succeeds", async () => {
    const { fetchImpl, calls } = fetchSequence(
      new Response("", { status: 503 }),
      new DOMException("timed out", "TimeoutError"),
      image("pixels"),
    );
    const bytes = await createDownloader({ fetchImpl, sleep: noSleep })(
      IMAGE_URL,
      "image",
    );
    assert.equal(bytes.toString(), "pixels");
    assert.equal(calls(), 3);
  });

  it("does not retry an expired or forbidden URL", async () => {
    const { fetchImpl, calls } = fetchSequence(
      new Response("", { status: 403 }),
    );
    await assert.rejects(
      createDownloader({ fetchImpl, sleep: noSleep })(IMAGE_URL, "image"),
      DownloadError,
    );
    assert.equal(calls(), 1);
  });

  it("keeps signed query strings out of error messages", async () => {
    const { fetchImpl } = fetchSequence(new Response("", { status: 404 }));
    await assert.rejects(
      createDownloader({ fetchImpl })(IMAGE_URL, "image"),
      (error: Error) => !error.message.includes("sig=abc"),
    );
  });
});
