import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  altText,
  type InstagramMedia,
  type InstagramPost,
  sortPosts,
  toIsoTimestamp,
} from "./instagram.ts";

const item: InstagramMedia = {
  id: "m1",
  kind: "image",
  width: 1440,
  height: 1800,
  grid: "/instagram/p1/0-640.webp",
  full: "/instagram/p1/0-1440.webp",
};

function post(id: string, publishedAt: string, caption?: string) {
  return {
    id,
    type: "image",
    publishedAt,
    caption,
    permalink: `https://www.instagram.com/p/${id}/`,
    items: [item],
  } satisfies InstagramPost;
}

describe("toIsoTimestamp", () => {
  it("normalises Instagram's offset without a colon", () => {
    assert.equal(
      toIsoTimestamp("2024-05-01T18:30:00+0000"),
      "2024-05-01T18:30:00.000Z",
    );
  });

  it("converts non-UTC offsets to UTC", () => {
    assert.equal(
      toIsoTimestamp("2024-05-01T14:30:00-0400"),
      "2024-05-01T18:30:00.000Z",
    );
  });

  it("accepts Unix seconds from the account export", () => {
    assert.equal(toIsoTimestamp(1714588200), "2024-05-01T18:30:00.000Z");
  });

  it("rejects garbage", () => {
    assert.throws(() => toIsoTimestamp("yesterday"), /Invalid timestamp/);
  });
});

describe("sortPosts", () => {
  it("orders newest first", () => {
    const sorted = sortPosts([
      post("a", "2023-01-01T00:00:00.000Z"),
      post("c", "2025-01-01T00:00:00.000Z"),
      post("b", "2024-01-01T00:00:00.000Z"),
    ]);
    assert.deepEqual(
      sorted.map((p) => p.id),
      ["c", "b", "a"],
    );
  });

  it("breaks timestamp ties by id so the order is stable", () => {
    const at = "2024-01-01T00:00:00.000Z";
    const sorted = sortPosts([post("1", at), post("2", at)]);
    assert.deepEqual(
      sorted.map((p) => p.id),
      ["2", "1"],
    );
  });
});

describe("altText", () => {
  it("prefers Instagram's alt text", () => {
    assert.equal(
      altText(post("a", "2024-01-01T00:00:00.000Z", "Caption."), {
        ...item,
        alt: "A cloud over Brooklyn",
      }),
      "A cloud over Brooklyn",
    );
  });

  it("falls back to the caption's first sentence", () => {
    assert.equal(
      altText(
        post("a", "2024-01-01T00:00:00.000Z", "Late night set. More soon!"),
        item,
      ),
      "Late night set.",
    );
  });

  it("stops at the first line break", () => {
    assert.equal(
      altText(
        post("a", "2024-01-01T00:00:00.000Z", "Studio day\n#music"),
        item,
      ),
      "Studio day",
    );
  });

  it("truncates long captions", () => {
    const text = altText(
      post("a", "2024-01-01T00:00:00.000Z", "word ".repeat(60)),
      item,
    );
    assert.ok(text.length <= 120);
    assert.ok(text.endsWith("…"));
  });

  it("falls back to the publication date", () => {
    assert.equal(
      altText(post("a", "2024-05-01T18:30:00.000Z"), item),
      "Instagram post from May 1, 2024",
    );
  });
});
