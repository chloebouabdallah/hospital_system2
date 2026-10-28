import { useEffect, useRef, useState } from 'react';

// Returns [ref, isVisible]. Attach the ref to any element and it flips to true
// whenever the element enters the viewport, and back to false when it leaves.
// Pair with the `.reveal` CSS class + `is-visible` toggle for the fade.
export default function useReveal({ threshold = 0.15, rootMargin = '0px 0px -60px 0px' } = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  return [ref, visible];
}