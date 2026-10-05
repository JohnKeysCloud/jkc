export function easeInOutSine(progress: number): number {
  return -(Math.cos(Math.PI * progress) - 1) / 2;
}
