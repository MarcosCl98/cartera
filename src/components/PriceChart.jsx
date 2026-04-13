// ─────────────────────────────────────────────────────────────────────────────
// components/PriceChart.jsx
// Gráfica interactiva reutilizable con ejes X/Y estilo Trade Republic/Revolut.
// Usada tanto en la cartera total como en el detalle de cada posición.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useMemo } from "react";
import { fmt } from "../utils/format";

// ── Etiquetas eje X según rango ───────────────────────────────────────────────
function getXLabels(points, rangeLabel) {
  if (!points || points.length < 2) return [];

  const n = points.length;
  const labels = [];

  if (rangeLabel === "1S") {
    // Cada día: "lun 07", "mar 08"...
    const days = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
    const step = Math.max(1, Math.floor(n / 5));
    for (let i = 0; i < n; i += step) {
      if (points[i]?.ts) {
        const d = new Date(points[i].ts * 1000);
        labels.push({ i, text: `${days[d.getDay()]} ${String(d.getDate()).padStart(2,"0")}` });
      }
    }
  } else if (rangeLabel === "1M") {
    // Cada semana aprox: "7 abr", "14 abr"...
    const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    const step = Math.max(1, Math.floor(n / 4));
    for (let i = 0; i < n; i += step) {
      if (points[i]?.ts) {
        const d = new Date(points[i].ts * 1000);
        labels.push({ i, text: `${d.getDate()} ${months[d.getMonth()]}` });
      }
    }
  } else if (rangeLabel === "1A") {
    // Cada 2 meses: "may 24", "jul 24"...
    const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    let lastMonth = -1;
    for (let i = 0; i < n; i++) {
      if (!points[i]?.ts) continue;
      const d = new Date(points[i].ts * 1000);
      const m = d.getMonth();
      if (m !== lastMonth && m % 2 === 0) {
        labels.push({ i, text: `${months[m]} ${String(d.getFullYear()).slice(2)}` });
        lastMonth = m;
      }
    }
  } else {
    // MAX: cada 6 meses o año
    const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    let lastYear = -1, lastHalf = -1;
    for (let i = 0; i < n; i++) {
      if (!points[i]?.ts) continue;
      const d = new Date(points[i].ts * 1000);
      const half = d.getMonth() < 6 ? 0 : 1;
      const yr = d.getFullYear();
      if (yr !== lastYear || half !== lastHalf) {
        if (n > 200) {
          // Más de ~4 años: solo enero de cada año
          if (d.getMonth() === 0) {
            labels.push({ i, text: `${yr}` });
            lastYear = yr; lastHalf = half;
          }
        } else {
          labels.push({ i, text: `${months[d.getMonth()]} ${String(yr).slice(2)}` });
          lastYear = yr; lastHalf = half;
        }
      }
    }
  }

  return labels;
}

// ── Etiquetas eje Y (3-4 niveles de precio) ───────────────────────────────────
function getYLabels(minV, maxV, iH, PAD) {
  const range = maxV - minV;
  if (range <= 0) return [];
  const labels = [];
  for (let i = 1; i <= 3; i++) {
    const v = minV + (range * i) / 4;
    const y = PAD.t + iH - ((v - minV) / range) * iH;
    labels.push({ v, y });
  }
  return labels;
}

// Formatea precio para el eje Y
function fmtAxisPrice(v) {
  if (v >= 1000) return `${fmt(v / 1000, 1)}k`;
  if (v >= 100) return fmt(v, 0);
  if (v >= 10) return fmt(v, 1);
  return fmt(v, 2);
}

// ── Componente principal ──────────────────────────────────────────────────────
export function PriceChart({
  points,          // [{ ts, close, date }] o [{ ts, value, label }]
  rangeLabel,      // "1S" | "1M" | "1A" | "MAX"
  height = 200,
  showYAxis = true,
  onHover,         // callback(point | null)
}) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const data = useMemo(() => {
    if (!points || points.length < 2) return [];
    // Normalizar: tanto close como value
    return points.map(p => ({ ...p, v: p.close ?? p.value })).filter(p => p.v != null);
  }, [points]);

  const hoverPoint = hoverIdx != null ? data[Math.min(hoverIdx, data.length - 1)] : null;

  // Escala
  const vals = data.map(p => p.v);
  const rawMin = Math.min(...vals), rawMax = Math.max(...vals);
  const diff = rawMax - rawMin;
  const margin = diff > 0 ? diff * 0.15 : rawMax * 0.01;
  const minV = rawMin - margin;
  const maxV = rawMax + margin;
  const yRange = maxV - minV || 1;

  // Dimensiones — reservar espacio para eje Y a la derecha
  const yAxisW = showYAxis ? 48 : 0;
  const W = 800, H = height;
  const PAD = { t: 12, r: yAxisW, b: 28, l: 8 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;

  const toX = (i) => PAD.l + (i / (data.length - 1)) * iW;
  const toY = (v) => PAD.t + iH - ((v - minV) / yRange) * iH;

  // Path
  const pts = data.map((p, i) => ({ x: toX(i), y: toY(p.v) }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fillD = pts.length >= 2
    ? `${pathD} L${pts[pts.length-1].x},${PAD.t+iH} L${pts[0].x},${PAD.t+iH} Z`
    : "";

  // Color según primera/última
  const firstV = data[0]?.v, lastV = data[data.length-1]?.v;
  const isUp = lastV >= firstV;
  const lineColor = isUp ? "var(--accent)" : "var(--red)";
  const gradId = `pg_${rangeLabel}`;

  // Hover point
  const hoverPt = hoverIdx != null ? pts[Math.min(hoverIdx, pts.length-1)] : null;

  // Etiquetas
  const xLabels = useMemo(() => getXLabels(data, rangeLabel), [data, rangeLabel]);
  const yLabels = useMemo(() => showYAxis ? getYLabels(minV, maxV, iH, PAD) : [], [minV, maxV, iH]);

  const handleMove = (e) => {
    if (!data.length || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = ((clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((x - PAD.l) / iW) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setHoverIdx(clamped);
    onHover?.(data[clamped]);
  };

  const handleLeave = () => {
    setHoverIdx(null);
    onHover?.(null);
  };

  if (data.length < 2) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 13 }}>
      Sin datos para este rango
    </div>
  );

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height, overflow: "visible", touchAction: "none", cursor: "crosshair", display: "block" }}
      onMouseMove={handleMove} onTouchMove={handleMove}
      onMouseLeave={handleLeave} onTouchEnd={handleLeave}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* Líneas guía horizontales del eje Y */}
      {yLabels.map((yl, i) => (
        <line key={i} x1={PAD.l} y1={yl.y} x2={W - yAxisW} y2={yl.y}
          stroke="var(--surface3)" strokeWidth="1" strokeDasharray="0"/>
      ))}

      {/* Área y línea */}
      <path d={fillD} fill={`url(#${gradId})`}/>
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round"/>

      {/* Hover */}
      {hoverPt && <>
        <line x1={hoverPt.x} y1={PAD.t} x2={hoverPt.x} y2={PAD.t+iH}
          stroke="var(--surface3)" strokeWidth="1"/>
        <circle cx={hoverPt.x} cy={hoverPt.y} r="5" fill={lineColor} stroke="var(--bg)" strokeWidth="2.5"/>
        {/* Tooltip con precio */}
        {(() => {
          const hd = data[hoverIdx];
          if (!hd) return null;
          const priceText = fmtAxisPrice(hd.v);
          const dateText = hd.date || hd.label || "";
          const boxW = Math.max(priceText.length, dateText.length) * 7 + 16;
          const bx = Math.min(Math.max(hoverPt.x - boxW/2, PAD.l), W - PAD.r - boxW);
          const by = Math.max(PAD.t, hoverPt.y - 52);
          return (
            <g>
              <rect x={bx} y={by} width={boxW} height={40} rx="6" fill="var(--surface2)" opacity="0.95"/>
              <text x={bx + boxW/2} y={by + 14} textAnchor="middle" fill="var(--text)" fontSize="12" fontWeight="700" fontFamily="inherit">{priceText}</text>
              <text x={bx + boxW/2} y={by + 30} textAnchor="middle" fill="var(--text3)" fontSize="10" fontFamily="inherit">{dateText}</text>
            </g>
          );
        })()}
      </>}

      {/* Eje X */}
      {xLabels.map((xl, i) => {
        const x = toX(xl.i);
        // Evitar que se salgan del área
        const anchor = xl.i === 0 ? "start" : xl.i >= data.length - 2 ? "end" : "middle";
        return (
          <text key={i} x={Math.min(x, W - yAxisW - 4)} y={H - 6}
            textAnchor={anchor} fill="var(--text3)" fontSize="9.5" fontFamily="inherit">
            {xl.text}
          </text>
        );
      })}

      {/* Eje Y (derecha) */}
      {showYAxis && yLabels.map((yl, i) => (
        <text key={i} x={W - yAxisW + 6} y={yl.y + 4}
          textAnchor="start" fill="var(--text3)" fontSize="9.5" fontFamily="inherit">
          {fmtAxisPrice(yl.v)}
        </text>
      ))}
    </svg>
  );
}
