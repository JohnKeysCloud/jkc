import {
  FULL_WIDTH,
  GRID_WIDTH,
  type InstagramMedia,
  type InstagramMediaKind,
} from "../../src/lib/instagram.ts";
import type { ImageProcessor } from "./process.ts";
import type { StagedPost, Store } from "./store.ts";

type StageItemOptions = {
  staged: StagedPost;
  store: Store;
  processImage: ImageProcessor;
  postId: string;
  index: number;
  id: string;
  kind: InstagramMediaKind;
  /** The photo, or a video's poster frame. */
  image: Buffer;
  /** Already validated as MP4. */
  video?: Buffer;
  alt?: string;
};

/** Writes one carousel slot's files, named by its position in the post. */
export async function stageItem({
  staged,
  store,
  processImage,
  postId,
  index,
  id,
  kind,
  image,
  video,
  alt,
}: StageItemOptions): Promise<InstagramMedia> {
  const variants = await processImage(image);
  const gridName = `${index}-${GRID_WIDTH}.webp`;
  const fullName = `${index}-${FULL_WIDTH}.webp`;
  staged.write(gridName, variants.grid);
  staged.write(fullName, variants.full);

  const item: InstagramMedia = {
    id,
    kind,
    width: variants.width,
    height: variants.height,
    grid: store.publicPath(postId, gridName),
    full: store.publicPath(postId, fullName),
  };
  if (video) {
    const videoName = `${index}.mp4`;
    staged.write(videoName, video);
    item.video = store.publicPath(postId, videoName);
  }
  if (alt) {
    item.alt = alt;
  }
  return item;
}
