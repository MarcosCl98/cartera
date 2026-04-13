// ─────────────────────────────────────────────────────────────────────────────
// screens/PositionDetailScreen.jsx
// Pantalla completa de detalle de una posición — gráfica + info + métricas
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
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

function MiniChart({ history, color }) {
  if (!history || history.length < 2) return null;
  const W = 800, H = 120, PAD = { t: 8, r: 8, b: 8, l: 8 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const vals = history.map(p => p.close);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const pts = history.map((p, i) => ({
    x: PAD.l + (i / (history.length - 1)) * iW,
    y: PAD.t + iH - ((p.close - minV) / range) * iH,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fillD = `${pathD} L${pts[pts.length-1].x},${PAD.t+iH} L${pts[0].x},${PAD.t+iH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 120 }}>
      <defs>
        <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#dg)"/>
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
    </svg>
  );
}

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
  const [tab, setTab] = useState("1A");
  const [history, setHistory] = useState([]);
  const [detail, setDetail] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);
  const svgRef = useRef(null);

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
    fetchPriceHistory(symbol, r.range, r.interval).then(setHistory);
  }, [tab, symbol]);

  const currentPrice = priceData?.price;
  const units = parseFloat(position.units) || 0;
  const avgPrice = parseFloat(position.avgPrice) || 0;
  const currentValue = currentPrice ? units * currentPrice : null;
  const invested = units * avgPrice;
  const gainAbs = currentValue ? currentValue - invested : null;
  const gainPct = gainAbs != null && invested ? (gainAbs / invested) * 100 : null;
  const isUp = (gainPct || 0) >= 0;

  // Gráfica interactiva
  // hoverPoint ahora es estado directo (setHoverPoint)
  const displayPrice = hoverPoint ? hoverPoint.close : currentPrice;
  const basePrice = history[0]?.close;
  const priceChange = displayPrice && basePrice ? displayPrice - basePrice : null;
  const priceChangePct = priceChange && basePrice ? (priceChange / basePrice) * 100 : null;
  const chartUp = priceChangePct == null ? true : priceChangePct >= 0;
  const lineColor = chartUp ? "var(--accent)" : "var(--red)";

  let pathD = "", fillD = "", hoverPt = null;
  const W = 800, H = 180, PAD = { t: 12, r: 8, b: 28, l: 8 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;

  if (history.length >= 2) {
    const vals = history.map(p => p.close);
    const minV = Math.min(...vals), maxV = Math.max(...vals);
    const diff = maxV - minV;
    const margin = diff > 0 ? diff * 0.15 : maxV * 0.01;
    const yMin = minV - margin, yMax = maxV + margin;
    const yRange = yMax - yMin || 1;
    const pts = history.map((p, i) => ({
      x: PAD.l + (i / (history.length - 1)) * iW,
      y: PAD.t + iH - ((p.close - yMin) / yRange) * iH,
    }));
    pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    fillD = `${pathD} L${pts[pts.length-1].x},${PAD.t+iH} L${pts[0].x},${PAD.t+iH} Z`;
    hoverPt = hoverIdx != null ? pts[Math.min(hoverIdx, pts.length-1)] : pts[pts.length-1];
  }

  const handleMove = (e) => {
    if (!history.length || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = ((clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((x - PAD.l) / iW) * (history.length - 1));
    setHoverIdx(Math.max(0, Math.min(history.length - 1, idx)));
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", maxWidth: 430, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ padding: "56px 24px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--text2)", fontSize: 22, cursor: "pointer", padding: "4px 8px 4px 0" }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{position.name}</div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
            {position.isin || position.symbol || position.type}
          </div>
        </div>
      </div>

      {/* Precio actual */}
      <div style={{ padding: "0 24px 24px" }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em" }}>
          <HideAmount hide={hideAmounts} size="lg">{fmtEur(displayPrice)}</HideAmount>
        </div>
        {/* Fecha del punto hover o cambio total */}
        {hoverPoint ? (
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 6 }}>
            {hoverPoint.date}
          </div>
        ) : priceChangePct != null ? (
          <div style={{ fontSize: 14, fontWeight: 600, color: chartUp ? "var(--accent)" : "var(--red)", marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
            <span>{chartUp ? "↑" : "↓"} {chartUp ? "+" : ""}{fmtEur(priceChange)}</span>
            <span style={{ opacity: 0.7 }}>({chartUp ? "+" : ""}{fmt(priceChangePct)}%)</span>
          </div>
        ) : null}
      </div>

      {/* Gráfica */}
      {loading ? (
        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)" }}>
          <span className="price-loading">Cargando...</span>
        </div>
      ) : (
        <div style={{ padding: "0 16px" }}>
          <PriceChart
            points={history}
            rangeLabel={tab}
            height={240}
            showYAxis={true}
            onHover={p => { setHoverIdx(p ? history.indexOf(p) : null); setHoverPoint(p || null); }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, background: "var(--surface2)", borderRadius: 10, padding: 3 }}>
            {RANGES.map(r => (
              <button key={r.label} onClick={() => { setTab(r.label); setHoverIdx(null); }}
                style={{ flex: 1, background: tab === r.label ? "var(--surface3)" : "none", border: "none", color: tab === r.label ? "var(--text)" : "var(--text3)", fontFamily: "inherit", fontSize: 12, fontWeight: tab === r.label ? 700 : 500, padding: "5px 0", borderRadius: 8, cursor: "pointer" }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Mi posición */}
        <div style={{ background: "var(--surface)", borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text3)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>Mi posición</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>Valor actual</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
                <HideAmount hide={hideAmounts}>{fmtEur(currentValue)}</HideAmount>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>Invertido</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
                <HideAmount hide={hideAmounts}>{fmtEur(invested)}</HideAmount>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>Ganancia</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: isUp ? "var(--accent)" : "var(--red)" }}>
                <HideAmount hide={hideAmounts}>{gainAbs != null ? `${gainAbs >= 0 ? "+" : ""}${fmtEur(gainAbs)}` : "—"}</HideAmount>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>Rentabilidad</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: isUp ? "var(--accent)" : "var(--red)" }}>
                {fmtPct(gainPct)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>{position.type === "gold" ? "Gramos" : "Participaciones"}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{fmt(units, units % 1 === 0 ? 0 : 4)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>Precio medio</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
                <HideAmount hide={hideAmounts}>{fmtEur(avgPrice)}</HideAmount>
              </div>
            </div>
          </div>
        </div>

        {/* Rentabilidades históricas (fondos) */}
        {detail?.returns && Object.values(detail.returns).some(v => v != null) && (
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text3)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>Rentabilidad histórica</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <ReturnBadge label="YTD"  value={detail.returns.ytd} />
              <ReturnBadge label="1M"   value={detail.returns.oneMonth} />
              <ReturnBadge label="3M"   value={detail.returns.threeMonth} />
              <ReturnBadge label="1A"   value={detail.returns.oneYear} />
              <ReturnBadge label="3A"   value={detail.returns.threeYear} />
              <ReturnBadge label="5A"   value={detail.returns.fiveYear} />
            </div>
          </div>
        )}

        {/* Métricas del activo */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {detail?.ter != null && (
            <Metric label="Coste anual (TER)" value={`${fmt(detail.ter * 100, 2)}%`} />
          )}
          {detail?.dividendYield != null && (
            <Metric label="Dividendo" value={`${fmt(detail.dividendYield * 100, 2)}%`}
              sub={detail.exDividendDate ? `Ex-div: ${detail.exDividendDate}` : null}
              color="var(--accent)" />
          )}
          {detail?.high52 != null && (
            <Metric label="Máximo 52 sem." value={fmtEur(detail.high52)} />
          )}
          {detail?.low52 != null && (
            <Metric label="Mínimo 52 sem." value={fmtEur(detail.low52)} />
          )}
          {detail?.pe != null && (
            <Metric label="PER" value={fmt(detail.pe, 1)} />
          )}
          {detail?.beta != null && (
            <Metric label="Beta" value={fmt(detail.beta, 2)} />
          )}
          {detail?.totalAssets != null && (
            <Metric label="Patrimonio" value={`${fmt(detail.totalAssets / 1e9, 2)}B€`} />
          )}
          {detail?.category && (
            <Metric label="Categoría" value={detail.category} />
          )}
        </div>

        {/* Top holdings (fondos) */}
        {detail?.topHoldings?.length > 0 && (
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text3)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>Principales posiciones</div>
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
