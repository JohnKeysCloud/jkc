import type { CSSProperties } from "react";
import { type CloudPalette, rasterizeCloud } from "./cloudRaster";
import styles from "./Clouds.module.scss";

const NEAR_PALETTE: CloudPalette = {
  outline: "#0b1020",
  fill: "#d9e1f2",
  shade: "#8ea3d6",
};

const FAR_PALETTE: CloudPalette = {
  outline: "#0b1020",
  fill: "#7f8fbd",
  shade: "#56679e",
};

/** Clouds smaller than this read as distant: dimmer, and stacked behind the rest. */
const FAR_SCALE = 1.8;

const SHAPES = {
  small: rasterizeCloud([
    { x: 5.5, y: 6.5, r: 3.5 },
    { x: 9.5, y: 4.5, r: 4 },
    { x: 13, y: 6.5, r: 3.5 },
    { x: 8, y: 7.5, r: 3 },
    { x: 11, y: 7.5, r: 3 },
  ]),
  medium: rasterizeCloud([
    { x: 6, y: 8.5, r: 4 },
    { x: 11, y: 6, r: 5 },
    { x: 17, y: 5, r: 5.5 },
    { x: 23, y: 8, r: 4.5 },
    { x: 9, y: 9.5, r: 3.5 },
    { x: 15, y: 9.5, r: 3.5 },
    { x: 21, y: 9.5, r: 3.5 },
  ]),
  large: rasterizeCloud([
    { x: 6, y: 9.5, r: 4 },
    { x: 12, y: 6.5, r: 5 },
    { x: 19, y: 5.5, r: 5.5 },
    { x: 26, y: 6, r: 5.5 },
    { x: 33, y: 7, r: 5 },
    { x: 37, y: 9.5, r: 3.5 },
    { x: 10, y: 10, r: 3.5 },
    { x: 17, y: 10, r: 3.5 },
    { x: 24, y: 10, r: 3.5 },
    { x: 31, y: 10, r: 3.5 },
  ]),
};

type Drifter = {
  shape: keyof typeof SHAPES;
  side: "left" | "right";
  x: number;
  y: number;
  scale: number;
};

const DRIFTERS: Drifter[] = [
  { shape: "small", side: "left", x: 34, y: 12, scale: 1.4 },
  { shape: "medium", side: "left", x: 30, y: 78, scale: 1.4 },
  { shape: "small", side: "right", x: 84, y: 32, scale: 1.4 },
  { shape: "medium", side: "right", x: 42, y: 92, scale: 1.4 },
  { shape: "large", side: "left", x: -18, y: 2, scale: 2.4 },
  { shape: "medium", side: "left", x: 8, y: 24, scale: 2 },
  { shape: "large", side: "left", x: -24, y: 42, scale: 2.8 },
  { shape: "small", side: "left", x: 26, y: 50, scale: 2.2 },
  { shape: "medium", side: "left", x: -6, y: 68, scale: 2.4 },
  { shape: "large", side: "left", x: 12, y: 86, scale: 2 },
  { shape: "large", side: "right", x: 50, y: 1, scale: 2.4 },
  { shape: "medium", side: "right", x: 70, y: 16, scale: 2 },
  { shape: "small", side: "right", x: 50, y: 34, scale: 2.2 },
  { shape: "large", side: "right", x: 58, y: 46, scale: 2.8 },
  { shape: "medium", side: "right", x: 44, y: 64, scale: 2.2 },
  { shape: "large", side: "right", x: 64, y: 80, scale: 2.2 },
];

/**
 * Exact distance to clear the stage edge (translate `%` is the cloud's own
 * width), boosted for nearer clouds so they exit before distant ones.
 */
function travelFor({ side, x, scale }: Drifter): string {
  const speed = (1 + (scale - 1) * 0.2).toFixed(2);
  return side === "left"
    ? `calc((${x}vw + 100%) * -${speed})`
    : `calc(${100 - x}vw * ${speed})`;
}

export function Clouds() {
  return (
    <div className={styles.root} aria-hidden="true">
      {DRIFTERS.map((drifter) => {
        const { shape, x, y, scale } = drifter;
        const { width, height, paths } = SHAPES[shape];
        const palette = scale < FAR_SCALE ? FAR_PALETTE : NEAR_PALETTE;

        return (
          <div
            key={`${x}-${y}`}
            className={styles.drifter}
            style={
              {
                "--drifter-travel": travelFor(drifter),
                "--drifter-width": width * scale,
                left: `${x}%`,
                top: `${y}%`,
                zIndex: Math.round(scale * 10),
              } as CSSProperties
            }
          >
            <svg
              className={styles.shape}
              viewBox={`0 0 ${width} ${height}`}
              shapeRendering="crispEdges"
            >
              <path fill={palette.outline} d={paths.outline} />
              <path fill={palette.fill} d={paths.fill} />
              <path fill={palette.shade} d={paths.shade} />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
