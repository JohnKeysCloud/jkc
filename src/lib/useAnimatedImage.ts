import { useEffect, useState } from "react";

// Reports when an animated image has loaded and decoded, so it can be laid
// over its still without a blank frame. Stays false under reduced motion,
// where the animation is never fetched.
export function useAnimatedImage(src: string) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    let isCancelled = false;
    const image = new Image();
    image.src = src;
    image
      .decode()
      .then(() => {
        if (!isCancelled) {
          setIsReady(true);
        }
      })
      .catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, [src]);

  return isReady;
}
