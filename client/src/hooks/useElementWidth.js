import { useLayoutEffect, useState } from 'react';

// Returns a callback ref and the element's current content width.
export function useElementWidth() {
  const [el, setEl] = useState(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  return [setEl, width];
}
