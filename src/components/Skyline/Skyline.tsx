import type { CSSProperties } from "react";
import {
  VIEW_HEIGHT,
  VIEW_WIDTH,
  beacons,
  farBlocks,
  landmarkBlocks,
  nearBlocks,
  waterTowers,
  windows,
} from "./geometry";
import styles from "./Skyline.module.scss";

const TONE_CLASS = {
  amber: styles.isAmber,
  cyan: styles.isCyan,
  magenta: styles.isMagenta,
};

// Both layers share one grid; lights sit in their own SVG so their flicker
// doesn't repaint the silhouette's neon rim filter.
const gridProps = {
  "aria-hidden": true,
  preserveAspectRatio: "xMidYMax slice",
  shapeRendering: "crispEdges",
  viewBox: `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`,
} as const;

export function Skyline() {
  return (
    <div className={styles.root}>
      <svg className={styles.silhouette} {...gridProps}>
        <g className={styles.far}>
          {farBlocks.map(({ x, y, width, height }) => (
            <rect key={x} x={x} y={y} width={width} height={height} />
          ))}
        </g>
        <g className={styles.near}>
          {landmarkBlocks.map(({ x, y, width, height, isLit }) => (
            <rect
              key={`${x}-${y}`}
              className={isLit ? styles.crown : undefined}
              x={x}
              y={y}
              width={width}
              height={height}
            />
          ))}
          {nearBlocks.map(({ x, y, width, height }) => (
            <rect key={x} x={x} y={y} width={width} height={height} />
          ))}
          {waterTowers.map(({ x, y, width, height }) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={width} height={height} />
          ))}
        </g>
      </svg>
      <svg className={styles.lights} {...gridProps}>
        {windows.map(
          ({ x, y, width, height, tone, isTwinkling, delay, duration }) => (
            <rect
              key={`${x}-${y}`}
              className={`${styles.window} ${TONE_CLASS[tone]}${
                isTwinkling ? ` ${styles.isTwinkling}` : ""
              }`}
              style={
                {
                  "--twinkle-delay": `${delay}s`,
                  "--twinkle-duration": `${duration}s`,
                } as CSSProperties
              }
              x={x}
              y={y}
              width={width}
              height={height}
            />
          ),
        )}
        {beacons.map(({ x, y, width, height }) => (
          <rect
            key={`${x}-${y}`}
            className={styles.beacon}
            x={x}
            y={y}
            width={width}
            height={height}
          />
        ))}
      </svg>
    </div>
  );
}
