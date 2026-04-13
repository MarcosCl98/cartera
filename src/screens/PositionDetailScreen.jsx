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

  // Cargar símbolo + detalle + histórico inicial
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

  // Cambiar histórico al cambiar tab
  useEffect(() => {
    if (!symbol) return;
    const r = RANGES.find(r => r.label === tab);
    setHistory([]);
    fetchPriceHistory(symbol, r.range, r.interval).then(h => {
      setHistory(h);
      setHoverPoint(null);
    });
  }, [tab, symbol]);

  // ── Cálculos ────────────────────────────────────────────────────────────────
  const currentPrice = priceData?.price;
  const units     = parseFloat(position.units) || 0;
  const avgPrice  = parseFloat(position.avgPrice) || 0;
  const invested  = units * avgPrice;

  // Precio mostrado: hover o actual
  const displayPrice = hoverPoint?.close ?? currentPrice;

  // Cambio respecto al inicio del rango
  const basePrice    = history[0]?.close;
  const priceChange  = displayPrice && basePrice ? displayPrice - basePrice : null;
  const priceChangePct = priceChange && basePrice ? (priceChange / basePrice) * 100 : null;
  const chartUp      = priceChangePct == null ? true : priceChangePct >= 0;

  // Rentabilidad de MI posición en el punto hover
  const hoverValue   = hoverPoint && currentPrice ? units * hoverPoint.close : null;
  const hoverGainAbs = hoverValue != null ? hoverValue - invested : null;
  const hoverGainPct = hoverGainAbs != null && invested ? (hoverGainAbs / invested) * 100 : null;

  // Sin hover: rentabilidad actual
  const currentValue = currentPrice ? units * currentPrice : null;
  const gainAbs  = currentValue != null ? currentValue - invested : null;
  const gainPct  = gainAbs != null && invested ? (gainAbs / invested) * 100 : null;
  const isUp     = (gainPct || 0) >= 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", maxWidth: 430, margin: "0 auto", paddingBottom: 48 }}>

      {/* Header */}
      <div style={{ padding: "52px 20px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "var(--surface)", border: "none", color: "var(--text2)", fontSize: 18, cursor: "pointer", padding: "8px 12px", borderRadius: 20, lineHeight: 1 }}>
          ←
        </button>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{position.name}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
            {position.isin || position.symbol || ""}
          </div>
        </div>
      </div>

      {/* Precio + cambio + rentabilidad posición */}
      <div style={{ padding: "4px 20px 10px" }}>
        {/* Precio */}
        <div style={{ fontSize: 38, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1 }}>
          <HideAmount hide={hideAmounts} size="lg">{fmtEur(displayPrice)}</HideAmount>
        </div>

        {/* Cambio del rango + fecha si hay hover */}
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "6px 16px", alignItems: "center" }}>
          {priceChangePct != null && (
            <div style={{ fontSize: 14, fontWeight: 600, color: chartUp ? "var(--accent)" : "var(--red)", display: "flex", gap: 6, alignItems: "center" }}>
              <span>{chartUp ? "↑" : "↓"} {chartUp ? "+" : ""}{fmtEur(priceChange)}</span>
              <span style={{ opacity: 0.75 }}>({chartUp ? "+" : ""}{fmt(priceChangePct)}%)</span>
            </div>
          )}
          {hoverPoint ? (
            <span style={{ fontSize: 13, color: "var(--text3)" }}>{hoverPoint.date}</span>
          ) : null}
        </div>

        {/* Rentabilidad de MI posición en ese punto */}
        {hoverPoint && hoverGainAbs != null ? (
          <div style={{ marginTop: 6, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>Mi posición:</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: (hoverGainPct||0) >= 0 ? "var(--accent)" : "var(--red)" }}>
              <HideAmount hide={hideAmounts}>
                {(hoverGainPct||0) >= 0 ? "+" : ""}{fmtEur(hoverGainAbs)}
              </HideAmount>
              {" "}({fmtPct(hoverGainPct)})
            </span>
          </div>
        ) : null}
      </div>

      {/* Gráfica — sin padding lateral, pegada al contenido */}
      <div>
        {loading ? (
          <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)" }}>
            <span className="price-loading">Cargando...</span>
          </div>
        ) : (
          <PriceChart
            points={history}
            rangeLabel={tab}
            height={300}
            showYAxis={true}
            onHover={setHoverPoint}
          />
        )}

        {/* Tabs pegados a la gráfica */}
        <div style={{ margin: "8px 16px 0", display: "flex", background: "var(--surface2)", borderRadius: 10, padding: 3 }}>
          {RANGES.map(r => (
            <button key={r.label} onClick={() => setTab(r.label)}
              style={{ flex: 1, background: tab === r.label ? "var(--surface3)" : "none", border: "none", color: tab === r.label ? "var(--text)" : "var(--text3)", fontFamily: "inherit", fontSize: 13, fontWeight: tab === r.label ? 700 : 500, padding: "7px 0", borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Mi posición */}
        <div style={{ background: "var(--surface)", borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>Mi posición</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "Valor actual", val: <HideAmount hide={hideAmounts}>{fmtEur(currentValue)}</HideAmount> },
              { label: "Invertido",    val: <HideAmount hide={hideAmounts}>{fmtEur(invested)}</HideAmount> },
              { label: "Ganancia",     val: <HideAmount hide={hideAmounts}>{gainAbs != null ? `${gainAbs >= 0 ? "+" : ""}${fmtEur(gainAbs)}` : "—"}</HideAmount>, color: isUp ? "var(--accent)" : "var(--red)" },
              { label: "Rentabilidad", val: fmtPct(gainPct), color: isUp ? "var(--accent)" : "var(--red)" },
              { label: position.type === "gold" ? "Gramos" : "Participaciones", val: fmt(units, units % 1 === 0 ? 0 : 4) },
              { label: "Precio medio", val: <HideAmount hide={hideAmounts}>{fmtEur(avgPrice)}</HideAmount> },
            ].map(({ label, val, color }, i) => (
              <div key={i}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: color || "var(--text)" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rentabilidades históricas */}
        {detail?.returns && Object.values(detail.returns).some(v => v != null) && (
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>Rentabilidad histórica</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <ReturnBadge label="YTD" value={detail.returns.ytd} />
              <ReturnBadge label="1M"  value={detail.returns.oneMonth} />
              <ReturnBadge label="3M"  value={detail.returns.threeMonth} />
              <ReturnBadge label="1A"  value={detail.returns.oneYear} />
              <ReturnBadge label="3A"  value={detail.returns.threeYear} />
              <ReturnBadge label="5A"  value={detail.returns.fiveYear} />
            </div>
          </div>
        )}

        {/* Métricas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {detail?.ter != null && <Metric label="Coste anual (TER)" value={`${fmt(detail.ter * 100, 2)}%`} />}
          {detail?.dividendYield != null && <Metric label="Dividendo" value={`${fmt(detail.dividendYield * 100, 2)}%`} sub={detail.exDividendDate ? `Ex-div: ${detail.exDividendDate}` : null} color="var(--accent)" />}
          {detail?.high52 != null && <Metric label="Máx. 52 semanas" value={fmtEur(detail.high52)} />}
          {detail?.low52  != null && <Metric label="Mín. 52 semanas" value={fmtEur(detail.low52)} />}
          {detail?.pe     != null && <Metric label="PER" value={fmt(detail.pe, 1)} />}
          {detail?.beta   != null && <Metric label="Beta" value={fmt(detail.beta, 2)} />}
          {detail?.totalAssets != null && <Metric label="Patrimonio" value={`${fmt(detail.totalAssets / 1e9, 2)}B€`} />}
          {detail?.category   && <Metric label="Categoría" value={detail.category} />}
        </div>

        {/* Top holdings */}
        {detail?.topHoldings?.length > 0 && (
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>Principales posiciones</div>
            {detail.topHoldings.map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: i < detail.topHoldings.length - 1 ? 10 : 0, marginBottom: i < detail.topHoldings.length - 1 ? 10 : 0, borderBottom: i < detail.topHoldings.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ fontSize: 14, color: "var(--text2)" }}>{h.name}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{fmt(h.pct * 100, 1)}%</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
