// ─────────────────────────────────────────────────────────────────────────────
// components/LineChart.jsx
// Gráfica basada en snapshots reales de la cartera del usuario.
// Solo muestra datos desde que el usuario empezó a usar la app.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useRef } from "react";
import { CHART_RANGES } from "../constants";
import { fmt, fmtEur } from "../utils/format";
import { HideAmount } from "./ui";

function filterByRange(snapshots, rangeLabel) {
  if (!snapshots || snapshots.length === 0) return [];
  const now = new Date();
  const cutoff = new Date();
  if (rangeLabel === "1S") cutoff.setDate(now.getDate() - 7);
  else if (rangeLabel === "1M") cutoff.setMonth(now.getMonth() - 1);
  else if (rangeLabel === "3M") cutoff.setMonth(now.getMonth() - 3);
  else if (rangeLabel === "6M") cutoff.setMonth(now.getMonth() - 6);
  else if (rangeLabel === "1A") cutoff.setFullYear(now.getFullYear() - 1);
  else if (rangeLabel === "5A") cutoff.setFullYear(now.getFullYear() - 5);

  const parseDate = (dateStr) => {
    const [d, m] = dateStr.split("/").map(Number);
    const year = m > now.getMonth() + 1 ? now.getFullYear() - 1 : now.getFullYear();
    return new Date(year, m - 1, d);
  };

  return snapshots
    .filter(s => { try { return parseDate(s.date) >= cutoff; } catch { return false; } })
    .map(s => ({ value: s.total, label: s.date }));
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

  const availableTabs = useMemo(() =>
    CHART_RANGES.filter(r => filterByRange(snapshots, r.label).length >= 1),
    [snapshots]
  );

  const activeTab = availableTabs.find(r => r.label === tab) ? tab : availableTabs[0]?.label || "1M";

  const chartData = useMemo(() => {
    const filtered = filterByRange(snapshots, activeTab);
    if (filtered.length === 0) return null;
    const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
    if (currentTotal) {
      if (filtered.length === 1) return [...filtered, { value: currentTotal, label: today }];
      return [...filtered.slice(0, -1), { value: currentTotal, label: today }];
    }
    return filtered.length >= 2 ? filtered : null;
  }, [snapshots, activeTab, currentTotal]);

  const data = chartData;
  const W = 800, H = 200, PAD = { t: 20, r: 16, b: 32, l: 8 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;

  const hoverPoint   = hoverIdx != null && data ? data[Math.min(hoverIdx, data.length - 1)] : null;
  const displayValue = hoverPoint ? hoverPoint.value : data?.[data.length - 1]?.value;
  const baseValue    = data?.[0]?.value;
  const change       = displayValue && baseValue ? displayValue - baseValue : null;
  const changePct    = change && baseValue ? (change / baseValue) * 100 : null;
  const isUp         = change == null ? true : change >= 0;
  const lineColor    = isUp ? "var(--accent)" : "var(--red)";

  let pathD = "", fillD = "", hoverPt = null;
  if (data && data.length >= 2) {
    const vals = data.map(d => d.value);
    const minV = Math.min(...vals), maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    const pts = data.map((d, i) => ({
      x: PAD.l + (i / (data.length - 1)) * iW,
      y: PAD.t + iH - ((d.value - minV) / range) * iH,
    }));
    pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    fillD = `${pathD} L${pts[pts.length-1].x},${PAD.t+iH} L${pts[0].x},${PAD.t+iH} Z`;
    hoverPt = hoverIdx != null ? pts[Math.min(hoverIdx, pts.length-1)] : pts[pts.length-1];
  }

  const handleMove = (e) => {
    if (!data || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = ((clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((x - PAD.l) / iW) * (data.length - 1));
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  return (
    <div className="chart-wrap" style={{ marginBottom: 24 }}>
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

      {!data ? (
        <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 13, gap: 8 }}>
          <span>Sin datos para este período</span>
          <span style={{ fontSize: 11 }}>Pulsa Actualizar para ir acumulando historial</span>
        </div>
      ) : (
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: 200, overflow: "visible", touchAction: "none", cursor: "crosshair" }}
          onMouseMove={handleMove} onTouchMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)} onTouchEnd={() => setHoverIdx(null)}>
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity="0.2"/>
              <stop offset="100%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={fillD} fill="url(#cg)"/>
          <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round"/>
          {hoverPt && <>
            <line x1={hoverPt.x} y1={PAD.t} x2={hoverPt.x} y2={PAD.t+iH} stroke="var(--text3)" strokeWidth="1" strokeDasharray="4,3"/>
            <circle cx={hoverPt.x} cy={hoverPt.y} r="5" fill={lineColor} stroke="var(--bg)" strokeWidth="2"/>
          </>}
          {data.length > 1 && hoverIdx == null && <>
            <text x={PAD.l} y={H-4} textAnchor="start" fill="var(--text3)" fontSize="10" fontFamily="inherit">{data[0].label}</text>
            <text x={W-PAD.r} y={H-4} textAnchor="end" fill="var(--text3)" fontSize="10" fontFamily="inherit">{data[data.length-1].label}</text>
          </>}
        </svg>
      )}

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
