import { useId } from 'react';

// variant: 'auto'  -> uses theme colours (blue -> purple), good on light backgrounds
//          'light' -> solid white, for use on coloured/gradient backgrounds
export default function Logo({ size = 42, variant = 'auto' }) {
  const id = useId();
  const light = variant === 'light';

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={light ? '#ffffff' : '#008CFD'} />
          <stop offset="1" stopColor={light ? '#ffffff' : '#7B5CF0'} />
        </linearGradient>
      </defs>
      <path
        d="M3 17h6l3-7 4 13 3-9 2 3h8"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}