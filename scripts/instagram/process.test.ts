import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { FULL_WIDTH, GRID_WIDTH } from "../../src/lib/instagram.ts";
import { MediaError } from "./errors.ts";
import { processImage, validateVideo } from "./process.ts";
import { jpeg, mp4 } from "./testing.ts";

describe("processImage", () => {
  it("writes grid and full WebP variants at the original aspect", async () => {
    const variants = await processImage(await jpeg(2000, 2500));
    const grid = await sharp(variants.grid).metadata();
    const full = await sharp(variants.full).metadata();

    assert.equal(grid.format, "webp");
    assert.equal(full.format, "webp");
    assert.equal(grid.width, GRID_WIDTH);
    assert.equal(grid.height, 800);
    assert.deepEqual([variants.width, variants.height], [FULL_WIDTH, 1800]);
  });

  it("never upscales a small original", async () => {
    const variants = await processImage(await jpeg(500, 400));
    assert.deepEqual([variants.width, variants.height], [500, 400]);
    assert.equal((await sharp(variants.grid).metadata()).width, 500);
  });

  it("applies EXIF orientation", async () => {
    // Stored landscape, tagged to display rotated a quarter turn: portrait.
    const rotated = await sharp(await jpeg(800, 400))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const variants = await processImage(rotated);
    assert.deepEqual([variants.width, variants.height], [400, 800]);
  });

  it("rejects bytes that aren't an image", async () => {
    await assert.rejects(processImage(Buffer.from("<html>")), MediaError);
  });

  it("rejects a truncated image", async () => {
    const whole = await jpeg();
    await assert.rejects(
      processImage(whole.subarray(0, whole.length / 2)),
      MediaError,
    );
  });
});

describe("validateVideo", () => {
  it("accepts an MP4", () => {
    assert.doesNotThrow(() => validateVideo(mp4()));
  });

  it("rejects anything else", () => {
    assert.throws(
      () => validateVideo(Buffer.from("not a video at all")),
      MediaError,
    );
  });
});
