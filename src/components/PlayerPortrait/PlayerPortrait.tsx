import type { CSSProperties } from "react";
import { site } from "@/content/site";
import styles from "./PlayerPortrait.module.scss";

type Circle = {
  x: number;
  y: number;
  r: number;
};

const CLIP_ID = "player-portrait-cloud";
const RIM_THICKNESS = 1;
/** Headroom so circles swelling on hover are not cut off at the box edge. */
const BREATHING_ROOM = 1;

const CIRCLES: Circle[] = [
  { x: 20, y: 11, r: 10 },
  { x: 10, y: 16, r: 7 },
  { x: 30, y: 15, r: 7.5 },
  { x: 15, y: 20, r: 6 },
  { x: 25, y: 20, r: 6 },
  { x: 9, y: 24, r: 7 },
  { x: 20, y: 24, r: 8 },
  { x: 31, y: 24, r: 7 },
];

const INSET = RIM_THICKNESS + BREATHING_ROOM;
const MIN_X = Math.min(...CIRCLES.map(({ x, r }) => x - r)) - INSET;
const MIN_Y = Math.min(...CIRCLES.map(({ y, r }) => y - r)) - INSET;
const WIDTH = Math.max(...CIRCLES.map(({ x, r }) => x + r)) + INSET - MIN_X;
const HEIGHT = Math.max(...CIRCLES.map(({ y, r }) => y + r)) + INSET - MIN_Y;
/**
 * The photo spans exactly the cloud window, so its top edge meets the crown
 * and its bottom edge (where the keychain sits) meets the lowest bump.
 */
const PHOTO_INSET_BLOCK = (INSET / HEIGHT) * 100;
const PHOTO_INSET_INLINE = (INSET / WIDTH) * 100;

// `clipPath` ignores `<g>`, so circles are mapped straight into bounding-box
// units; they stay round because the root's aspect ratio is WIDTH / HEIGHT.
const LAYERS = [
  { id: `${CLIP_ID}-rim`, growth: RIM_THICKNESS },
  { id: `${CLIP_ID}-window`, growth: 0 },
] as const;

const PHOTO = {
  base: "/portrait/cloud-portrait",
  widths: [320, 512],
  width: 512,
  height: 427,
};

const srcSetFor = (format: "avif" | "webp"): string =>
  PHOTO.widths
    .map((width) => `${PHOTO.base}-${width}.${format} ${width}w`)
    .join(", ");

const clipFor = (id: string): CSSProperties => ({ clipPath: `url(#${id})` });

export function PlayerPortrait() {
  const [rimLayer, windowLayer] = LAYERS;

  return (
    <div
      className={styles.root}
      style={
        {
          "--photo-inset-block": `${PHOTO_INSET_BLOCK}%`,
          "--photo-inset-inline": `${PHOTO_INSET_INLINE}%`,
          "--portrait-ratio": `${WIDTH} / ${HEIGHT}`,
        } as CSSProperties
      }
    >
      <svg className={styles.defs} aria-hidden="true" focusable="false">
        <defs>
          {LAYERS.map(({ id, growth }) => (
            <clipPath key={id} id={id} clipPathUnits="objectBoundingBox">
              {CIRCLES.map(({ x, y, r }, index) => (
                <ellipse
                  key={`${x}-${y}`}
                  className={styles.puff}
                  cx={(x - MIN_X) / WIDTH}
                  cy={(y - MIN_Y) / HEIGHT}
                  rx={(r + growth) / WIDTH}
                  ry={(r + growth) / HEIGHT}
                  style={{ "--puff-index": index } as CSSProperties}
                />
              ))}
            </clipPath>
          ))}
        </defs>
      </svg>
      <div className={styles.rim} style={clipFor(rimLayer.id)} />
      <picture className={styles.window} style={clipFor(windowLayer.id)}>
        <source type="image/avif" srcSet={srcSetFor("avif")} sizes="288px" />
        <img
          alt={site.portrait.alt}
          className={styles.photo}
          decoding="async"
          draggable={false}
          height={PHOTO.height}
          loading="lazy"
          sizes="288px"
          src={`${PHOTO.base}-${PHOTO.width}.webp`}
          srcSet={srcSetFor("webp")}
          width={PHOTO.width}
        />
      </picture>
    </div>
  );
}
