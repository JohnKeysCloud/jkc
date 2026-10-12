import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHERRY_AT,
  GHOST_SLOTS,
  type ChaseItem,
  type ChaseMetrics,
  type Pass,
  advance,
  carryPass,
  chaseMetrics,
  freshPass,
  layoutChase,
  passFor,
  stateOf,
} from "./chaseLayout.ts";

const DESKTOP = { cross: 1144, pixel: 3 };
const PHONE = { cross: 245, pixel: 28 / 12 };

/** Plays Pac-Man through each position in `path`, in turn. */
function play(
  items: readonly ChaseItem[],
  metrics: ChaseMetrics,
  path: readonly number[],
  start: Pass = freshPass(),
) {
  return path.slice(1).reduce(
    (state, to, index) => {
      const step = advance(items, state.pass, path[index], to, metrics);
      return { pass: step.pass, meals: [...state.meals, ...step.meals] };
    },
    { pass: start, meals: [] as ReturnType<typeof advance>["meals"] },
  );
}

const stepsTo = (from: number, to: number) =>
  Array.from(
    { length: Math.round(Math.abs(to - from) * 100) + 1 },
    (_, index) => from + Math.sign(to - from) * index * 0.01,
  );

describe("layoutChase", () => {
  for (const [name, { cross, pixel }] of Object.entries({ DESKTOP, PHONE })) {
    const items = layoutChase(cross, pixel);

    it(`shows every ghost on ${name}`, () => {
      assert.deepEqual(
        items.filter((item) => item.kind === "ghost").map((item) => item.ghost),
        GHOST_SLOTS.map(([ghost]) => ghost),
      );
    });

    it(`puts the cherry halfway on ${name}`, () => {
      const cherry = items.find((item) => item.kind === "cherry");
      assert.equal(cherry?.at, CHERRY_AT);
    });

    it(`keeps dots clear of everything else on ${name}`, () => {
      const dots = items.filter((item) => item.kind === "dot");
      const others = items.filter((item) => item.kind !== "dot");
      assert.ok(dots.length > 0);
      dots.forEach((dot) =>
        others.forEach((other) =>
          assert.ok(Math.abs(dot.at - other.at) * cross > 4 * pixel),
        ),
      );
    });

    it(`orders the route left to right on ${name}`, () => {
      const ats = items.map((item) => item.at);
      assert.deepEqual(
        ats,
        [...ats].sort((a, b) => a - b),
      );
      assert.ok(ats[0] > 0 && ats[ats.length - 1] < 1);
    });
  }

  it("lays more dots on wider screens", () => {
    const count = (cross: number) =>
      layoutChase(cross, 3).filter((item) => item.kind === "dot").length;
    assert.ok(count(1600) > count(800));
  });
});

describe("advance", () => {
  const items = layoutChase(DESKTOP.cross, DESKTOP.pixel);
  const metrics = chaseMetrics(DESKTOP.cross, DESKTOP.pixel);

  it("eats everything on one pass, ghosts in chain order", () => {
    let pass = freshPass();
    const meals = [];
    for (let at = 0; at < 1; at += 0.01) {
      const step = advance(items, pass, at, at + 0.01, metrics);
      pass = step.pass;
      meals.push(...step.meals);
    }
    assert.equal(pass.eaten.size, items.length);
    assert.deepEqual(
      meals
        .filter((meal) => meal.item.kind === "ghost")
        .map((meal) => [meal.item.ghost, meal.chainIndex]),
      [
        ["binky", 0],
        ["pinky", 1],
        ["inky", 2],
        ["clyde", 3],
      ],
    );
  });

  it("leaves ghosts alone until the power pellet", () => {
    const fromRight = advance(items, freshPass(), 1, 0.5, metrics);
    assert.ok(fromRight.meals.every((meal) => meal.item.kind !== "ghost"));
    assert.equal(fromRight.pass.isPowered, false);
  });

  it("doesn't eat the same thing twice", () => {
    const first = advance(items, freshPass(), 0, 0.2, metrics);
    const back = advance(items, first.pass, 0.2, 0.1, metrics);
    assert.equal(back.meals.length, 0);
  });
});

describe("carryPass", () => {
  const desktop = {
    items: layoutChase(DESKTOP.cross, DESKTOP.pixel),
    metrics: chaseMetrics(DESKTOP.cross, DESKTOP.pixel),
  };
  const phone = {
    items: layoutChase(PHONE.cross, PHONE.pixel),
    metrics: chaseMetrics(PHONE.cross, PHONE.pixel),
  };
  const sorted = (pass: Pass) => [...pass.eaten].sort();

  it("matches a pass played on the new layout all along", () => {
    const path = stepsTo(0, 0.4);
    const carried = carryPass(
      play(desktop.items, desktop.metrics, path).pass,
      phone.items,
      phone.metrics,
    );
    const native = play(phone.items, phone.metrics, path).pass;
    assert.deepEqual(sorted(carried), sorted(native));
    assert.equal(carried.isPowered, native.isPowered);
    assert.equal(carried.chain, native.chain);
  });

  it("keeps everything he reached before turning back", () => {
    const path = [...stepsTo(0, 0.6), ...stepsTo(0.6, 0.3).slice(1)];
    const carried = carryPass(
      play(phone.items, phone.metrics, path).pass,
      desktop.items,
      desktop.metrics,
    );
    const native = play(desktop.items, desktop.metrics, path).pass;
    assert.deepEqual(sorted(carried), sorted(native));
  });

  it("pays nothing again once carried", () => {
    const carried = carryPass(
      play(desktop.items, desktop.metrics, stepsTo(0, 0.4)).pass,
      phone.items,
      phone.metrics,
    );
    const { meals } = play(
      phone.items,
      phone.metrics,
      stepsTo(0.4, 1),
      carried,
    );
    meals.forEach(({ item }) => assert.ok(!carried.eaten.has(item.id)));
    assert.equal(carried.eaten.size + meals.length, phone.items.length);
  });

  it("carries a fresh pass as fresh", () => {
    assert.equal(
      carryPass(freshPass(), phone.items, phone.metrics).eaten.size,
      0,
    );
  });
});

describe("passFor", () => {
  const items = layoutChase(DESKTOP.cross, DESKTOP.pixel);
  const metrics = chaseMetrics(DESKTOP.cross, DESKTOP.pixel);
  const cleared = advance(items, freshPass(), 0, 1, metrics).pass;

  it("refills the route when he sets off from the start", () => {
    assert.equal(passFor(cleared, 0, 0.01).eaten.size, 0);
  });

  it("keeps a cleared route when he turns back mid-crossing", () => {
    assert.equal(passFor(cleared, 0.4, 0.5), cleared);
    assert.equal(passFor(cleared, 0.5, 0.4), cleared);
  });

  it("keeps a cleared route when he crosses back from the far side", () => {
    assert.equal(passFor(cleared, 1, 0.9), cleared);
    assert.equal(passFor(cleared, 0.9, 0.95), cleared);
  });
});

describe("stateOf", () => {
  const items = layoutChase(DESKTOP.cross, DESKTOP.pixel);
  const metrics = chaseMetrics(DESKTOP.cross, DESKTOP.pixel);
  const binky = items.find((item) => item.ghost === "binky");

  it("frightens the ghosts after the power pellet, flickering up close", () => {
    assert.ok(binky);
    assert.equal(stateOf(binky, freshPass(), 0, metrics), "roaming");
    const powered = advance(items, freshPass(), 0, 0.07, metrics).pass;
    const inky = items.find((item) => item.ghost === "inky");
    assert.ok(inky);
    assert.equal(
      stateOf(inky, powered, inky.at - metrics.flicker - 0.02, metrics),
      "frightened",
    );
    assert.equal(stateOf(binky, powered, 0.07, metrics), "flickering");
    assert.equal(
      stateOf(binky, powered, binky.at - 0.01, metrics),
      "flickering",
    );
  });
});
