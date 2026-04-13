// ─────────────────────────────────────────────────────────────────────────────
// components/DonutChart.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { PALETTE } from "../constants";
import { fmt, fmtEur } from "../utils/format";
import { HideAmount } from "./ui";

export function DonutChart({ items, hideAmounts }) {
  const total = items.reduce((s, i) => s + (i.value || 0), 0);
  if (!total) return null;

  // Layout vertical si hay más de 4 items
  const isVertical = items.length > 4;

  const R = isVertical ? 80 : 70;
  const size = isVertical ? 200 : 180;
  const cx = size / 2, cy = size / 2;
  const stroke = isVertical ? 26 : 22;
  const circ = 2 * Math.PI * R;
  let offset = 0;

  const arcs = items.map((item, i) => {
    const pct = item.value / total;
    const dash = pct * circ;
    const arc = { color: PALETTE[i % PALETTE.length], dash, offset, pct, ...item };
    offset += dash;
    return arc;
  });

  return (
    <div className="donut-wrap">
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Distribución</div>
      <div style={{
        display: "flex",
        flexDirection: isVertical ? "column" : "row",
        alignItems: isVertical ? "center" : "center",
        gap: isVertical ? 16 : 20,
      }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          style={{ flexShrink: 0 }}>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#1e242d" strokeWidth={stroke} />
          {arcs.map((a, i) => (
            <circle
              key={i} cx={cx} cy={cy} r={R} fill="none"
              stroke={a.color} strokeWidth={stroke}
              strokeDasharray={`${a.dash} ${circ - a.dash}`}
              strokeDashoffset={-a.offset + circ / 4}
              style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
            />
          ))}
          <text x={cx} y={cy + 6} textAnchor="middle" fill="#c8a96e"
            fontSize={isVertical ? 15 : 13} fontFamily="inherit" fontWeight="500">
            {hideAmounts ? "···" : `${fmt(total / 1000, 1)}k€`}
          </text>
        </svg>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: isVertical ? 8 : 10,
          width: isVertical ? "100%" : "auto",
          flex: isVertical ? "none" : 1,
        }}>
          {arcs.map((a, i) => (
            <div key={i} className="legend-item">
              <div className="legend-dot" style={{ background: a.color }} />
              <span className="legend-name" title={a.name}>{a.name}</span>
              <span className="legend-pct">{fmt(a.pct * 100, 1)}%</span>
              <span className="legend-val">
                <HideAmount hide={hideAmounts} size="sm">{fmtEur(a.value)}</HideAmount>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
