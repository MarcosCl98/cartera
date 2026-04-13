// ─────────────────────────────────────────────────────────────────────────────
// components/LineChart.jsx
// Gráfica con días vacíos al inicio y snapshots reales de la cartera.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useRef } from "react";
import { CHART_RANGES } from "../constants";
import { fmt, fmtEur } from "../utils/format";
import { HideAmount } from "./ui";

// Genera todos los días del rango con valor null si no hay snapshot
function buildFullRange(snapshots, rangeLabel) {
  const now = new Date();
  const start = new Date();

  if (rangeLabel === "1S") start.setDate(now.getDate() - 6);
  else if (rangeLabel === "1M") start.setDate(now.getDate() - 29);
  else if (rangeLabel === "3M") start.setDate(now.getDate() - 89);
  else if (rangeLabel === "6M") start.setDate(now.getDate() - 179);
  else if (rangeLabel === "1A") start.setDate(now.getDate() - 364);
  else if (rangeLabel === "5A") start.setDate(now.getDate() - 364 * 5);

  // Mapa de snapshots por fecha
  const snapMap = {};
  snapshots.forEach(s => { snapMap[s.date] = s.total; });

  const points = [];
  const cur = new Date(start);

  while (cur <= now) {
    const label = cur.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
    points.push({
      label,
      value: snapMap[label] ?? null, // null = sin datos ese día
    });
    cur.setDate(cur.getDate() + 1);
  }

  return points;
}

export function LineChart({ snapshots, prices, positions, hideAmounts }) {
  const [tab, setTab] = useState("1M");
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const currentTotal = useMemo(() => {
    if (!positions || !prices) return null;
    const total = positions.reduce((s, p) => {
      const pr = prices[p.id]?.price;
      return s + (pr ? parseFloat(p.units) * pr : 0);
    }, 0);
    return total > 0 ? total : null;
  }, [positions, prices]);

  // Solo mostrar tabs donde hay al menos 1 snapshot
  const availableTabs = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];
    return CHART_RANGES;
  }, [snapshots]);

  const activeTab = tab;

  const allPoints = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];
    const pts = buildFullRange(snapshots, activeTab);

    // Reemplazar el último punto con el valor actual real
    const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
    if (currentTotal && pts.length > 0) {
      const lastIdx = pts.length - 1;
      pts[lastIdx] = { ...pts[lastIdx], value: currentTotal, label: today };
    }
    return pts;
  }, [snapshots, activeTab, currentTotal]);

  // Para la línea SVG, solo usar puntos con valor real
  // Pero mantenemos el eje X completo con días vacíos
  const hasData = allPoints.some(p => p.value !== null);

  // Punto hover
  const hoverPoint = hoverIdx != null ? allPoints[Math.min(hoverIdx, allPoints.length - 1)] : null;

  // Valor mostrado: hover o último punto con valor
  const lastWithValue = [...allPoints].reverse().find(p => p.value !== null);
  const displayValue = (hoverPoint?.value != null ? hoverPoint.value : lastWithValue?.value) ?? null;

  // Base: primer punto con valor
  const firstWithValue = allPoints.find(p => p.value !== null);
  const baseValue = firstWithValue?.value ?? null;

  const change    = displayValue && baseValue ? displayValue - baseValue : null;
  const changePct = change && baseValue ? (change / baseValue) * 100 : null;
  const isUp      = change == null ? true : change >= 0;
  const lineColor = isUp ? "var(--accent)" : "var(--red)";

  // SVG
  const W = 800, H = 200, PAD = { t: 20, r: 16, b: 32, l: 8 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const n = allPoints.length || 1;

  // Calcular min/max solo de puntos con valor
  const valuesWithData = allPoints.filter(p => p.value !== null).map(p => p.value);
  const minV = valuesWithData.length ? Math.min(...valuesWithData) : 0;
  const maxV = valuesWithData.length ? Math.max(...valuesWithData) : 1;
  const range = maxV - minV || 1;

  const toX = (i) => PAD.l + (i / (n - 1)) * iW;
  const toY = (v) => PAD.t + iH - ((v - minV) / range) * iH;

  // Construir segmentos de línea (solo donde hay datos consecutivos)
  let pathD = "", fillD = "";
  const segments = [];
  let currentSeg = [];

  allPoints.forEach((p, i) => {
    if (p.value !== null) {
      currentSeg.push({ x: toX(i), y: toY(p.value), i });
    } else {
      if (currentSeg.length > 0) { segments.push(currentSeg); currentSeg = []; }
    }
  });
  if (currentSeg.length > 0) segments.push(currentSeg);

  if (segments.length > 0) {
    pathD = segments.map(seg =>
      seg.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
    ).join(" ");

    // Fill solo del primer al último punto con valor
    const firstPt = segments[0][0];
    const lastSeg = segments[segments.length - 1];
    const lastPt = lastSeg[lastSeg.length - 1];
    fillD = `M${firstPt.x.toFixed(1)},${firstPt.y.toFixed(1)} ` +
      segments.map(seg => seg.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")).join(" ") +
      ` L${lastPt.x.toFixed(1)},${PAD.t+iH} L${firstPt.x.toFixed(1)},${PAD.t+iH} Z`;
  }

  // Punto hover en SVG
  let hoverSvgPt = null;
  if (hoverIdx != null && allPoints[hoverIdx]?.value != null) {
    hoverSvgPt = { x: toX(hoverIdx), y: toY(allPoints[hoverIdx].value) };
  }

  const handleMove = (e) => {
    if (!allPoints.length || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = ((clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((x - PAD.l) / iW) * (allPoints.length - 1));
    setHoverIdx(Math.max(0, Math.min(allPoints.length - 1, idx)));
  };

  return (
    <div className="chart-wrap" style={{ marginBottom: 24 }}>
      {/* Valor y cambio */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1 }}>
          <HideAmount hide={hideAmounts} size="lg">{fmtEur(displayValue)}</HideAmount>
        </div>
        {change != null && (
          <div style={{ fontSize: 14, fontWeight: 600, color: isUp ? "var(--accent)" : "var(--red)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <HideAmount hide={hideAmounts}>{isUp ? "↑" : "↓"} {isUp ? "+" : ""}{fmtEur(change)}</HideAmount>
            <span style={{ opacity: 0.7 }}>({isUp ? "+" : ""}{fmt(changePct)}%)</span>
            {hoverPoint && <span style={{ color: "var(--text3)", fontWeight: 400 }}>{hoverPoint.label}</span>}
          </div>
        )}
      </div>

      {/* Gráfica */}
      {!hasData ? (
        <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 13, gap: 8 }}>
          <span>Sin datos todavía</span>
          <span style={{ fontSize: 11 }}>Los precios se actualizan automáticamente</span>
        </div>
      ) : (
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: 200, overflow: "visible", touchAction: "none", cursor: "crosshair" }}
          onMouseMove={handleMove} onTouchMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)} onTouchEnd={() => setHoverIdx(null)}>
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity="0.18"/>
              <stop offset="100%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity="0"/>
            </linearGradient>
          </defs>

          {/* Línea base horizontal en zona sin datos */}
          {firstWithValue && (
            <line
              x1={PAD.l} y1={toY(firstWithValue.value)}
              x2={toX(allPoints.findIndex(p => p.value !== null))} y2={toY(firstWithValue.value)}
              stroke="var(--surface3)" strokeWidth="1.5" strokeDasharray="4,4"
            />
          )}

          <path d={fillD} fill="url(#cg)"/>
          <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round"/>

          {hoverSvgPt && <>
            <line x1={hoverSvgPt.x} y1={PAD.t} x2={hoverSvgPt.x} y2={PAD.t+iH}
              stroke="var(--text3)" strokeWidth="1" strokeDasharray="4,3"/>
            <circle cx={hoverSvgPt.x} cy={hoverSvgPt.y} r="5" fill={lineColor} stroke="var(--bg)" strokeWidth="2"/>
          </>}

          {hoverIdx == null && allPoints.length > 1 && <>
            <text x={PAD.l} y={H-4} textAnchor="start" fill="var(--text3)" fontSize="10" fontFamily="inherit">
              {allPoints[0].label}
            </text>
            <text x={W-PAD.r} y={H-4} textAnchor="end" fill="var(--text3)" fontSize="10" fontFamily="inherit">
              {allPoints[allPoints.length-1].label}
            </text>
          </>}
        </svg>
      )}

      {/* Tabs */}
      {availableTabs.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, background: "var(--surface2)", borderRadius: 10, padding: 3 }}>
          {availableTabs.map(r => (
            <button key={r.label} onClick={() => { setTab(r.label); setHoverIdx(null); }}
              style={{ flex: 1, background: activeTab === r.label ? "var(--surface3)" : "none", border: "none", color: activeTab === r.label ? "var(--text)" : "var(--text3)", fontFamily: "inherit", fontSize: 12, fontWeight: activeTab === r.label ? 700 : 500, padding: "5px 0", borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }}>
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
