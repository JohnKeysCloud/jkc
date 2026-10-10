import sharp from "sharp";
import { FULL_WIDTH, GRID_WIDTH } from "../../src/lib/instagram.ts";
import { MediaError } from "./errors.ts";

const IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "heif", "avif", "gif"]);
const WEBP_QUALITY = 80;

export type ImageVariants = {
  /** Of the `full` variant, after orientation is applied. */
  width: number;
  height: number;
  grid: Buffer;
  full: Buffer;
};

export type ImageProcessor = (input: Buffer) => Promise<ImageVariants>;
export type VideoValidator = (input: Buffer) => void;

async function toWebp(input: Buffer, width: number) {
  return sharp(input, { failOn: "error" })
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });
}

/**
 * Applies EXIF orientation and writes a grid and a full-size WebP. Never
 * upscales, so small originals keep their own size.
 */
export const processImage: ImageProcessor = async (input) => {
  let format: string | undefined;
  try {
    ({ format } = await sharp(input).metadata());
  } catch {
    throw new MediaError("Downloaded image could not be decoded");
  }
  if (!format || !IMAGE_FORMATS.has(format)) {
    throw new MediaError(`Unsupported image format: ${format ?? "unknown"}`);
  }

  try {
    const [grid, full] = await Promise.all([
      toWebp(input, GRID_WIDTH),
      toWebp(input, FULL_WIDTH),
    ]);
    return {
      width: full.info.width,
      height: full.info.height,
      grid: grid.data,
      full: full.data,
    };
  } catch {
    throw new MediaError("Downloaded image is corrupt");
  }
};

/**
 * Instagram already serves H.264 MP4, so videos are stored as-is once they
 * prove to be MP4: an ISO media file opens with an `ftyp` box.
 */
export const validateVideo: VideoValidator = (input) => {
  if (input.length < 12 || input.toString("latin1", 4, 8) !== "ftyp") {
    throw new MediaError("Downloaded video is not an MP4 file");
  }
};
