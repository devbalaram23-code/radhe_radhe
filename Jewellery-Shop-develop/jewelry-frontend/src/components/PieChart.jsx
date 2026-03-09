import React from 'react';

// Small, dependency-free SVG pie chart component
// props:
// - data: [{ label, value }]
// - size: number (px)
// - innerRadius: number (px) for donut effect (optional)
// - colors: array of color strings (optional)

function polarToCartesian(cx, cy, r, angleDeg) {
  const a = (angleDeg - 90) * (Math.PI / 180.0);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  const d = [`M ${cx} ${cy}`, `L ${start.x} ${start.y}`, `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`, 'Z'].join(' ');
  return d;
}

export default function PieChart({ data = [], size = 220, innerRadius = 60, colors = [] }) {
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;

  const defaultColors = [
    'var(--accent)', '#7c3aed', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#fb7185', '#0ea5e9'
  ];

  let angle = 0;

  return (
    <div className="piechart" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const val = Number(d.value) || 0;
          const angleSize = total === 0 ? 0 : (val / total) * 360;
          const start = angle;
          const end = angle + angleSize;
          angle += angleSize;
          const color = colors[i % colors.length] || defaultColors[i % defaultColors.length];
          if (angleSize === 0) return null;
          const path = describeArc(cx, cy, r, start, end);
          return <path key={d.label} d={path} fill={color} stroke="transparent" title={`${d.label}: ${d.value}`} />;
        })}

        {/* inner hole to make donut */}
        {innerRadius > 0 && (
          <circle cx={cx} cy={cy} r={innerRadius} fill="var(--bg)" stroke="transparent" />
        )}
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d, i) => {
          const color = colors[i % colors.length] || defaultColors[i % defaultColors.length];
          return (
            <div key={d.label} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: 'var(--text)' }}>
              <span style={{ width: 12, height: 12, background: color, display: 'inline-block', borderRadius: 3 }} />
              <span>{d.label}</span>
              <span style={{ marginLeft: 8, opacity: 0.72 }}>{d.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
