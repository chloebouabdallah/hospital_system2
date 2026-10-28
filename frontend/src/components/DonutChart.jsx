import './DonutChart.css';

// slices: [{ label: 'Neurologist', value: 2, color: '#7b5cf0' }, ...]
export default function DonutChart({ slices = [], size = 180, thickness = 26 }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <div className="donut-empty">
        <span>No data yet</span>
      </div>
    );
  }

  let offset = 0;

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut">
        {/* background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--soft)"
          strokeWidth={thickness}
        />
        {/* slices */}
        {slices.map((s, i) => {
          const fraction = s.value / total;
          const dash = fraction * circumference;
          const gap = circumference - dash;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
        {/* center label */}
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="donut-total"
        >
          {total}
        </text>
        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="donut-sub"
        >
          total
        </text>
      </svg>

      <ul className="donut-legend">
        {slices.map((s) => (
          <li key={s.label}>
            <span className="donut-dot" style={{ background: s.color }} />
            <span className="donut-name">{s.label}</span>
            <span className="donut-count">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}