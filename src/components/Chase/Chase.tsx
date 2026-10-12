"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { easeInOutSine } from "@/lib/easing";
import { haptic } from "@/lib/haptics";
import { getSnapshot, subscribe } from "@/lib/panProgress";
import { award } from "@/lib/score";
import styles from "./Chase.module.scss";
import {
  type ChaseItem,
  type GhostName,
  advance,
  carryPass,
  chaseMetrics,
  freshPass,
  layoutChase,
  passFor,
  stateOf,
} from "./chaseLayout";
import { CHERRY_POINTS, pointsFor } from "./chaseScore";

type Size = {
  cross: number;
  pixel: number;
  originX: number;
  originY: number;
};

// Points across an item, in half-sizes from its centre, tested against covers.
const SAMPLES = [-1, 0, 1].flatMap((sx) =>
  [-1, 0, 1].map((sy) => [sx, sy] as const),
);

// The chase renders once, on the home page, so its art's ids can be fixed.
const ART_ID = "chase-art-";
const artHref = (name: string) => `#${ART_ID}${name}`;

const GHOST_COLORS: Record<GhostName, string> = {
  binky: "var(--color-binky)",
  pinky: "var(--color-pinky)",
  inky: "var(--color-inky)",
  clyde: "var(--color-clyde)",
};

// 10 by 10 pixel art; each string is a row.
const ART = {
  ghostBody: [
    "...####...",
    ".########.",
    "##########",
    "##########",
    "##########",
    "##########",
    "##########",
    "##########",
    "##########",
  ],
  // The skirt's two wiggle frames, on the bottom row.
  skirtA: ["##..##..##"],
  skirtB: [".##.##.##."],
  whites: ["", "", "", ".##..##...", ".##..##...", ".##..##..."],
  // Looking left, towards Pac-Man.
  pupils: ["", "", "", "", ".#...#....", ".#...#...."],
  face: [
    "",
    "",
    "",
    "..##..##..",
    "..##..##..",
    "",
    "..##..##..",
    ".#..##..#.",
  ],
  stems: ["......##..", ".....#.#..", "....#..#..", "...#...#.."],
  cherries: [
    "",
    "",
    "",
    "",
    ".###..###.",
    "#.####.###",
    "##########",
    "##########",
    ".###..###.",
  ],
  shine: ["", "", "", "", "", ".#....#..."],
} satisfies Record<string, readonly string[]>;

/** One rect per run of `#` in each row, offset by `rowOffset` rows. */
function Runs({
  rows,
  rowOffset = 0,
}: {
  rows: readonly string[];
  rowOffset?: number;
}) {
  return rows.flatMap((row, y) =>
    [...row.matchAll(/#+/g)].map((run) => (
      <rect
        key={`${run.index}-${y}`}
        height={1}
        width={run[0].length}
        x={run.index ?? 0}
        y={y + rowOffset}
      />
    )),
  );
}

function Sprite({ children }: { children: ReactNode }) {
  return (
    <svg
      className={styles.sprite}
      shapeRendering="crispEdges"
      viewBox="0 0 10 10"
    >
      {children}
    </svg>
  );
}

/**
 * Dots, a power pellet, the four ghosts and a cherry, laid along the sound
 * toggle's route across the top as the gallery pans in. Pac-Man (the toggle)
 * eats them as he passes, for arcade points. Purely decorative: hidden from
 * assistive tech, and skipped entirely for reduced motion.
 */
export function Chase() {
  const rootRef = useRef<HTMLDivElement>(null);
  const crossRef = useRef<HTMLSpanElement>(null);
  const pixelRef = useRef<HTMLSpanElement>(null);
  const originRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  // Outlives a relayout, so a resize mid-crossing keeps what he has eaten.
  const passRef = useRef(freshPass());
  const items = useMemo(
    () => (size ? layoutChase(size.cross, size.pixel) : []),
    [size],
  );
  // Dots come and go with the width. Kept after everything else, they never
  // make React move a ghost's node, which would replay its floated score.
  const drawOrder = useMemo(
    () => [
      ...items.filter((item) => item.kind !== "dot"),
      ...items.filter((item) => item.kind === "dot"),
    ],
    [items],
  );

  useEffect(() => {
    const measure = () => {
      const root = rootRef.current?.getBoundingClientRect();
      const origin = originRef.current?.getBoundingClientRect();
      const cross = crossRef.current?.getBoundingClientRect().width ?? 0;
      const pixel = pixelRef.current?.getBoundingClientRect().width ?? 0;
      const originX = (origin?.left ?? 0) - (root?.left ?? 0);
      const originY = (origin?.top ?? 0) - (root?.top ?? 0);
      setSize((current) =>
        current &&
        Math.abs(current.cross - cross) < 0.5 &&
        Math.abs(current.pixel - pixel) < 0.05 &&
        Math.abs(current.originX - originX) < 0.5 &&
        Math.abs(current.originY - originY) < 0.5
          ? current
          : { cross, pixel, originX, originY },
      );
    };
    // Reduced motion hides the chase, which then measures nothing.
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    measure();
    window.addEventListener("resize", measure);
    motion.addEventListener("change", measure);
    return () => {
      window.removeEventListener("resize", measure);
      motion.removeEventListener("change", measure);
    };
  }, []);

  // Before paint, so a relayout never shows its route with the eaten refilled.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !size || size.cross <= 0) {
      return undefined;
    }
    // Set before any layout read: a style pass between a relayout's cleanup
    // and this would see the chase unready and start fading it out.
    root.dataset.ready = "";
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const metrics = chaseMetrics(size.cross, size.pixel);
    const nodes = new Map(
      items.map((item) => [
        item.id,
        root.querySelector<HTMLElement>(`[data-id="${item.id}"]`),
      ]),
    );
    passRef.current = carryPass(passRef.current, items, metrics);
    let last = easeInOutSine(getSnapshot());

    const eat = (item: ChaseItem, chainIndex: number) => {
      const points = pointsFor(item.kind, chainIndex);
      award(`chase:${item.id}`, points);
      if (item.kind === "ghost") {
        const label = nodes.get(item.id)?.querySelector("[data-points]");
        if (label) {
          label.textContent = String(points);
        }
        haptic("tap");
      }
    };

    // Sizes are fixed per layout.
    const halves = new Map(
      [...nodes].map(([id, node]) => {
        const box = node?.getBoundingClientRect();
        return [id, box && { x: box.width / 2, y: box.height / 2 }];
      }),
    );

    const paint = (at: number) => {
      const rootBox = root.getBoundingClientRect();
      // The master key and its lock sit above the route; whatever they cover
      // hides rather than drawing over them. The lock stays upright, so its
      // box will do; the turning key's upright box is mostly empty corners,
      // so a point inside it only counts within the key's turned box, even
      // where Pac-Man passes over it.
      const covers = [
        ...document.querySelectorAll<HTMLElement>("[data-chase-cover]"),
      ].map((cover) => ({ cover, box: cover.getBoundingClientRect() }));
      const isUnder = (x: number, y: number) =>
        covers.some(
          ({ cover, box }) =>
            box.width > 0 &&
            x >= box.left &&
            x <= box.right &&
            y >= box.top &&
            y <= box.bottom &&
            (cover.dataset.chaseCover !== "shape" ||
              document
                .elementsFromPoint(x, y)
                .some((element) => cover.contains(element))),
        );
      // Every hit test reads layout, so all of them run before any write.
      const marks = items.map((item) => {
        const half = halves.get(item.id);
        if (!half) {
          return null;
        }
        const x = rootBox.left + size.originX + item.at * size.cross;
        const y = rootBox.top + size.originY;
        return {
          id: item.id,
          state: stateOf(item, passRef.current, at, metrics),
          isCovered: SAMPLES.some(([sx, sy]) =>
            isUnder(x + sx * half.x, y + sy * half.y),
          ),
        };
      });
      marks.forEach((mark) => {
        const node = mark && nodes.get(mark.id);
        if (!mark || !node) {
          return;
        }
        if (node.dataset.state !== mark.state) {
          node.dataset.state = mark.state;
        }
        if (mark.isCovered !== "covered" in node.dataset) {
          node.toggleAttribute("data-covered", mark.isCovered);
        }
      });
    };

    const play = () => {
      const at = easeInOutSine(getSnapshot());
      const isCrossing = (value: number) => value > 0 && value < 1;
      passRef.current = passFor(passRef.current, last, at);
      if (!motion.matches && (isCrossing(last) || isCrossing(at))) {
        const step = advance(items, passRef.current, last, at, metrics);
        passRef.current = step.pass;
        step.meals.forEach(({ item, chainIndex }) => eat(item, chainIndex));
      }
      paint(at);
      last = at;
    };

    paint(last);
    const unsubscribe = subscribe(play);
    return () => {
      unsubscribe();
      delete root.dataset.ready;
    };
  }, [items, size]);

  return (
    <div ref={rootRef} aria-hidden="true" className={styles.root}>
      <span ref={crossRef} className={styles.crossRuler} />
      <span ref={pixelRef} className={styles.pixelRuler} />
      <span ref={originRef} className={styles.originRuler} />
      <svg className={styles.library}>
        <defs>
          <g id={`${ART_ID}body`}>
            <Runs rows={ART.ghostBody} />
          </g>
          <g id={`${ART_ID}skirtA`}>
            <Runs rows={ART.skirtA} rowOffset={9} />
          </g>
          <g id={`${ART_ID}skirtB`}>
            <Runs rows={ART.skirtB} rowOffset={9} />
          </g>
          <g id={`${ART_ID}whites`}>
            <Runs rows={ART.whites} />
          </g>
          <g id={`${ART_ID}pupils`}>
            <Runs rows={ART.pupils} />
          </g>
          <g id={`${ART_ID}face`}>
            <Runs rows={ART.face} />
          </g>
        </defs>
      </svg>
      {drawOrder.map((item) => {
        const style = {
          "--at": item.at,
          ...(item.ghost && { "--ghost": GHOST_COLORS[item.ghost] }),
        } as CSSProperties;
        return (
          <span
            key={item.id}
            className={`${styles.item} ${styles[item.kind]}`}
            data-id={item.id}
            style={style}
          >
            {item.kind === "ghost" && (
              <>
                <Sprite>
                  <g className={styles.body}>
                    <use href={artHref("body")} />
                    <use className={styles.skirtA} href={artHref("skirtA")} />
                    <use className={styles.skirtB} href={artHref("skirtB")} />
                  </g>
                  <g className={styles.eyes}>
                    <use className={styles.whites} href={artHref("whites")} />
                    <use className={styles.pupils} href={artHref("pupils")} />
                  </g>
                  <use className={styles.face} href={artHref("face")} />
                  <g className={styles.flash}>
                    <use href={artHref("body")} />
                    <use className={styles.skirtA} href={artHref("skirtA")} />
                    <use className={styles.skirtB} href={artHref("skirtB")} />
                    <use className={styles.flashFace} href={artHref("face")} />
                  </g>
                </Sprite>
                <span className={styles.points} data-points />
              </>
            )}
            {item.kind === "cherry" && (
              <>
                <Sprite>
                  <g className={styles.stems}>
                    <Runs rows={ART.stems} />
                  </g>
                  <g className={styles.cherries}>
                    <Runs rows={ART.cherries} />
                  </g>
                  <g className={styles.shine}>
                    <Runs rows={ART.shine} />
                  </g>
                </Sprite>
                <span className={styles.points}>{CHERRY_POINTS}</span>
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}
