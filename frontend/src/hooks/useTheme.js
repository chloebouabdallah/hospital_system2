import { useEffect, useState } from 'react';

function getInitial() {
  try {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
  } catch { /* storage unavailable */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function useTheme() {
  const [theme, setTheme] = useState(getInitial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch { /* ignore */ }
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}
