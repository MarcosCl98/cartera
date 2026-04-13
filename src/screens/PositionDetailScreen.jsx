// ─────────────────────────────────────────────────────────────────────────────
// screens/PositionDetailScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { resolveSymbol, fetchAssetDetail, fetchPriceHistory } from "../api/detail";
import { PriceChart } from "../components/PriceChart";
import { fmtEur, fmtPct, fmt } from "../utils/format";
import { HideAmount } from "../components/ui";

const RANGES = [
  { label: "1S",  range: "5d",  interval: "1d"  },
  { label: "1M",  range: "1mo", interval: "1d"  },
  { label: "1A",  range: "1y",  interval: "1d"  },
  { label: "MAX", range: "max", interval: "1wk" },
];

function Metric({ label, value, sub, color }) {
  if (value == null || value === "—") return null;
  return (
    <div style={{ background: "var(--surface)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function ReturnBadge({ label, value }) {
  if (value == null) return null;
  const pct = value * 100;
  const isUp = pct >= 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
      <div style={{ fontSize: 11, color: "var(--text3)" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: isUp ? "var(--accent)" : "var(--red)" }}>
        {isUp ? "+" : ""}{fmt(pct)}%
      </div>
    </div>
  );
}

export function PositionDetailScreen({ position, priceData, hideAmounts, onBack }) {
  const [tab, setTab]         = useState("1A");
  const [history, setHistory] = useState([]);
  const [detail, setDetail]   = useState(null);
  const [symbol, setSymbol]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoverPoint, setHoverPoint] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const sym = await resolveSymbol(position);
      setSymbol(sym);
      if (sym) {
        const [det, hist] = await Promise.all([
          fetchAssetDetail(sym, position.type),
          fetchPriceHistory(sym, "1y", "1d"),
        ]);
        setDetail(det);
        setHistory(hist);
      }
      setLoading(false);
    })();
  }, [position.id]);

  useEffect(() => {
    if (!symbol) return;
    const r = RANGES.find(r => r.label === tab);
    setHistory([]);
    fetchPriceHistory(symbol, r.range, r.interval).then(h => {
      setHistory(h);
      setHoverPoint(null);
    });
  }, [tab, symbol]);

  const currentPrice = priceData?.price;
  const units     = parseFloat(position.units) || 0;
  const avgPrice  = parseFloat(position.avgPrice) || 0;
  const invested  = units * avgPrice;

  const displayPrice = hoverPoint?.close ?? currentPrice;

  const basePrice    = history[0]?.close;
  const priceChange  = displayPrice && basePrice ? displayPrice - basePrice : null;
  const priceChangePct = priceChange && basePrice ? (priceChange / basePrice) * 100 : null;
  const chartUp      = priceChangePct == null ? true : priceChangePct >= 0;

  const currentValue = currentPrice ? units * currentPrice : null;
  const gainAbs  = currentValue != null ? currentValue - invested : null;
  const gainPct  = gainAbs != null && invested ? (gainAbs / invested) * 100 : null;
  const isUp     = (gainPct || 0) >= 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", maxWidth: 430, margin: "0 auto", paddingBottom: 48 }}>

      {/* Header */}
      <div style={{ padding: "52px 20px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "var(--surface)", border: "none", color: "var(--text2)", fontSize: 18, cursor: "pointer", padding: "8px 12px", borderRadius: 20 }}>
          ←
        </button>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{position.name}</div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>
            {position.isin || position.symbol || ""}
          </div>
        </div>
      </div>

      {/* Precio */}
      <div style={{ padding: "4px 20px 10px" }}>
        <div style={{ fontSize: 38, fontWeight: 800 }}>
          <HideAmount hide={hideAmounts}>{fmtEur(displayPrice)}</HideAmount>
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 16 }}>
          {priceChangePct != null && (
            <div style={{ color: chartUp ? "var(--accent)" : "var(--red)" }}>
              {fmtEur(priceChange)} ({fmt(priceChangePct)}%)
            </div>
          )}
          {hoverPoint && (
            <span style={{ fontSize: 13, color: "var(--text3)" }}>{hoverPoint.date}</span>
          )}
        </div>
      </div>

      {/* Gráfica */}
      <div>
        {loading ? (
          <div style={{ height: 380, display: "flex", alignItems: "center", justifyContent: "center" }}>
            Cargando...
          </div>
        ) : (
          <PriceChart
            points={history}
            rangeLabel={tab}
            height={380}
            showYAxis={true}
            onHover={setHoverPoint}
          />
        )}

        <div style={{ margin: "8px 16px 0", display: "flex" }}>
          {RANGES.map(r => (
            <button key={r.label} onClick={() => setTab(r.label)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mi posición */}
      <div style={{ padding: 16 }}>
        <div>Valor: {fmtEur(currentValue)}</div>
        <div>Invertido: {fmtEur(invested)}</div>
        <div>Ganancia: {fmtEur(gainAbs)}</div>
        <div>Rentabilidad: {fmtPct(gainPct)}</div>
      </div>

    </div>
  );
}
