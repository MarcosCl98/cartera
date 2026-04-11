// ─────────────────────────────────────────────────────────────────────────────
// components/LineChart.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { CHART_RANGES, MORNINGSTAR_FALLBACK } from "../constants";
import { fmt, fmtEur } from "../utils/format";
import { fetchChartSeries } from "../api/prices";
import { HideAmount } from "./ui";

export function LineChart({ positions, prices, hideAmounts }) {
  const [tab, setTab] = useState("1M");
  const [chartData, setChartData] = useState(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const currentRange = CHART_RANGES.find(r => r.label === tab);

  useEffect(() => {
    if (positions.length === 0) { setChartData(null); return; }
    setLoadingChart(true);
    setChartData(null);

    (async () => {
      try {
        const series = await fetchChartSeries(positions, currentRange.range, currentRange.interval);
        if (series.length === 0) { setChartData(null); setLoadingChart(false); return; }

        const ref = series.reduce((a, b) => a.timestamps.length >= b.timestamps.length ? a : b);
        const points = [];

        for (let i = 0; i < ref.timestamps.length; i++) {
          const ts = ref.timestamps[i];
          let total = 0, allOk = true;

          for (const s of series) {
            const idx = s.timestamps.findIndex(t => t >= ts);
            const price = idx >= 0 ? s.closes[idx] : s.closes[s.closes.length - 1];
            if (price == null) { allOk = false; break; }
            total += s.units * (s.currency === "GBp" ? price / 100 : price);
          }

          if (allOk && total > 0) {
            const date = new Date(ts * 1000);
            const label = tab === "1S"
              ? date.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit" })
              : tab === "5A"
              ? date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" })
              : date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
            points.push({ value: total, label, ts });
          }
        }

        if (points.length < 2) { setChartData(null); setLoadingChart(false); return; }

        let finalPoints = tab === "1S" ? points.slice(-7) : points;

        // Reemplazar último punto con precio actual real
        const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
        const currentTotal = positions.reduce((s, p) => {
          const pr = prices[p.id]?.price;
          return s + (pr ? parseFloat(p.units) * pr : 0);
        }, 0);
        if (currentTotal > 0) {
          finalPoints = [
            ...finalPoints.slice(0, -1),
            { ...finalPoints[finalPoints.length - 1], value: currentTotal, label: today },
          ];
        }

        setChartData(finalPoints);
      } catch (e) {
        console.warn("Chart error:", e);
        setChartData(null);
      }
      setLoadingChart(false);
    })();
  }, [tab, positions, prices]);

  // ── SVG rendering ───────────────────────────────────────────────────────────
  const data = chartData;
  const W = 800, H = 200, PAD = { t: 20, r: 16, b: 32, l: 8 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;

  const hoverPoint  = hoverIdx != null && data ? data[Math.min(hoverIdx, data.length - 1)] : null;
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
    fillD = `${pathD} L${pts[pts.length - 1].x},${PAD.t + iH} L${pts[0].x},${PAD.t + iH} Z`;
    hoverPt = hoverIdx != null ? pts[Math.min(hoverIdx, pts.length - 1)] : pts[pts.length - 1];
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
      {/* Valor y cambio */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1 }}>
          <HideAmount hide={hideAmounts} size="lg">{fmtEur(displayValue)}</HideAmount>
        </div>
        {change != null && (
          <div style={{ fontSize: 14, fontWeight: 600, color: isUp ? "var(--accent)" : "var(--red)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <HideAmount hide={hideAmounts}>
              {isUp ? "↑" : "↓"} {isUp ? "+" : ""}{fmtEur(change)}
            </HideAmount>
            <span style={{ opacity: 0.7 }}>({isUp ? "+" : ""}{fmt(changePct)}%)</span>
            {hoverPoint && <span style={{ color: "var(--text3)", fontWeight: 400 }}>{hoverPoint.label}</span>}
          </div>
        )}
      </div>

      {/* Gráfica */}
      {loadingChart ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 13 }}>
          <span className="price-loading">Cargando...</span>
        </div>
      ) : !data ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 13 }}>
          Sin datos para este rango
        </div>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: 200, overflow: "visible", touchAction: "none", cursor: "crosshair" }}
          onMouseMove={handleMove} onTouchMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)} onTouchEnd={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity="0.2" />
              <stop offset="100%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={fillD} fill="url(#cg)" />
          <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" />
          {hoverPt && <>
            <line x1={hoverPt.x} y1={PAD.t} x2={hoverPt.x} y2={PAD.t + iH} stroke="var(--text3)" strokeWidth="1" strokeDasharray="4,3" />
            <circle cx={hoverPt.x} cy={hoverPt.y} r="5" fill={lineColor} stroke="var(--bg)" strokeWidth="2" />
          </>}
          {data.length > 1 && hoverIdx == null && <>
            <text x={PAD.l} y={H - 4} textAnchor="start" fill="var(--text3)" fontSize="10" fontFamily="inherit">{data[0].label}</text>
            <text x={W - PAD.r} y={H - 4} textAnchor="end" fill="var(--text3)" fontSize="10" fontFamily="inherit">{data[data.length - 1].label}</text>
          </>}
        </svg>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, background: "var(--surface2)", borderRadius: 10, padding: 3 }}>
        {CHART_RANGES.map(r => (
          <button key={r.label} onClick={() => { setTab(r.label); setHoverIdx(null); }}
            style={{ flex: 1, background: tab === r.label ? "var(--surface3)" : "none", border: "none", color: tab === r.label ? "var(--text)" : "var(--text3)", fontFamily: "inherit", fontSize: 12, fontWeight: tab === r.label ? 700 : 500, padding: "5px 0", borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }}>
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
