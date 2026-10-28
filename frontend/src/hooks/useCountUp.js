import { useEffect, useRef, useState } from 'react';

// Counts from 0 to `target` the first time the element scrolls into view.
// Usage: const [ref, value] = useCountUp(12); <div ref={ref}>{value}</div>
export default function useCountUp(target, duration = 1200) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setInView(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !Number.isFinite(target)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(target); return; }
    let raf, start;
    const tick = (t) => {
      start ??= t;
      const p = Math.min((t - start) / duration, 1);
      setValue(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  return [ref, value];
}
