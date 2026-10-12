/**
 * How far the home page's descent has panned from the card to the gallery,
 * from 0 to 1 in scroll (not eased). Published by the descent's scroll loop
 * and read imperatively, so subscribers can react without re-rendering on
 * every frame.
 */

type Listener = () => void;

let progress = 0;
const listeners = new Set<Listener>();

export function getSnapshot(): number {
  return progress;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publish(next: number): void {
  if (next === progress) {
    return;
  }
  progress = next;
  listeners.forEach((listener) => listener());
}
