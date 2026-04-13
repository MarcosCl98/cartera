// ─────────────────────────────────────────────────────────────────────────────
// components/LineChart.jsx
// Gráfica de cartera total usando snapshots reales + PriceChart
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import { CHART_RANGES } from "../constants";
import { fmt, fmtEur } from "../utils/format";
import { HideAmount } from "./ui";
import { PriceChart } from "./PriceChart";

// Normaliza fecha "d/m" o "dd/mm" → "dd/mm"
function normalizeDate(dateStr) {
  const [d, m] = dateStr.split("/").map(Number);
  return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}`;
}

// Construye puntos del rango con forward-fill para días sin datos
function buildPoints(snapshots, rangeLabel) {
  if (!snapshots || snapshots.length === 0) return [];

  const now = new Date();
  const start = new Date();
  if (rangeLabel === "1S")  start.setDate(now.getDate() - 6);
  else if (rangeLabel === "1M") start.setDate(now.getDate() - 29);
  else if (rangeLabel === "1A") start.setDate(now.getDate() - 364);
  else {
    // MAX: desde el primer snapshot
    const sorted = [...snapshots].sort((a, b) => {
      const [da, ma] = a.date.split("/").map(Number);
      const [db, mb] = b.date.split("/").map(Number);
      return new Date(2024, ma-1, da) - new Date(2024, mb-1, db);
    });
    start.setFullYear(2000); // todo el historial
  }

  // Mapa normalizado
  const snapMap = {};
  snapshots.forEach(s => { snapMap[normalizeDate(s.date)] = s.total; });

  const points = [];
  const cur = new Date(start);

  while (cur <= now) {
    const dd = String(cur.getDate()).padStart(2, "0");
    const mm = String(cur.getMonth() + 1).padStart(2, "0");
    const label = `${dd}/${mm}`;
    // ts aproximado para que PriceChart pueda generar etiquetas de eje X
    const ts = Math.floor(cur.getTime() / 1000);
    points.push({ label, ts, value: snapMap[label] ?? null });
    cur.setDate(cur.getDate() + 1);
  }

  // Forward-fill huecos
  let last = null;
  for (let i = 0; i < points.length; i++) {
    if (points[i].value !== null) last = points[i].value;
    else if (last !== null) points[i] = { ...points[i], value: last, interpolated: true };
  }

  return points.filter(p => p.value !== null);
}

export function LineChart({ snapshots, prices, positions, hideAmounts }) {
  const [tab, setTab] = useState("1M");
  const [hoverPoint, setHoverPoint] = useState(null);

  const currentTotal = useMemo(() => {
    if (!positions || !prices) return null;
    const total = positions.reduce((s, p) => {
      const pr = prices[p.id]?.price;
      return s + (pr ? parseFloat(p.units) * pr : 0);
    }, 0);
    return total > 0 ? total : null;
  }, [positions, prices]);

  const points = useMemo(() => {
    let pts = buildPoints(snapshots, tab);
    if (!pts.length) return [];

    // Reemplazar último punto con precio actual real
    if (currentTotal && pts.length > 0) {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2,"0");
      const mm = String(now.getMonth()+1).padStart(2,"0");
      pts = [...pts.slice(0,-1), { ...pts[pts.length-1], value: currentTotal, label: `${dd}/${mm}` }];
    }
    return pts;
  }, [snapshots, tab, currentTotal]);

  const displayValue = hoverPoint ? (hoverPoint.value ?? hoverPoint.v) : (points[points.length-1]?.value ?? currentTotal);
  const baseValue = points[0]?.value;
  const change = displayValue && baseValue ? displayValue - baseValue : null;
  const changePct = change && baseValue ? (change / baseValue) * 100 : null;
  const isUp = change == null ? true : change >= 0;

  const hasData = points.length >= 2;

  return (
    <div className="chart-wrap" style={{ marginBottom: 24 }}>
      {/* Valor y cambio */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1 }}>
          <HideAmount hide={hideAmounts} size="lg">{fmtEur(displayValue)}</HideAmount>
        </div>
        {change != null && (
          <div style={{ fontSize: 14, fontWeight: 600, color: isUp ? "var(--accent)" : "var(--red)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <HideAmount hide={hideAmounts}>{isUp ? "↑" : "↓"} {isUp ? "+" : ""}{fmtEur(change)}</HideAmount>
            <span style={{ opacity: 0.7 }}>({isUp ? "+" : ""}{fmt(changePct)}%)</span>
            {hoverPoint && <span style={{ color: "var(--text3)", fontWeight: 400 }}>{hoverPoint.label || hoverPoint.date}</span>}
          </div>
        )}
      </div>

      {/* Gráfica */}
      {!hasData ? (
        <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 13, gap: 8 }}>
          <span>Sin datos todavía</span>
          <span style={{ fontSize: 11 }}>Los precios se actualizan automáticamente cada 5 min</span>
        </div>
      ) : (
        <PriceChart
          points={points}
          rangeLabel={tab}
          height={200}
          showYAxis={true}
          onHover={setHoverPoint}
        />
      )}

      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, background: "var(--surface2)", borderRadius: 10, padding: 3 }}>
        {CHART_RANGES.map(r => (
          <button key={r.label} onClick={() => { setTab(r.label); setHoverPoint(null); }}
            style={{ flex: 1, background: tab === r.label ? "var(--surface3)" : "none", border: "none", color: tab === r.label ? "var(--text)" : "var(--text3)", fontFamily: "inherit", fontSize: 12, fontWeight: tab === r.label ? 700 : 500, padding: "5px 0", borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }}>
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
