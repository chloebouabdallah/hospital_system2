import './BarChart.css';

// items: [{ label: 'Pending', value: 3, color: 'var(--p)' }, ...]
export default function BarChart({ items = [], max }) {
  const peak = max ?? Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="bar-chart">
      {items.map((item) => (
        <div key={item.label} className="bar-row">
          <span className="bar-label">{item.label}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${(item.value / peak) * 100}%`,
                background: item.color,
              }}
            />
          </div>
          <span className="bar-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}