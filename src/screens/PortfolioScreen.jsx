// ─────────────────────────────────────────────────────────────────────────────
// screens/PortfolioScreen.jsx
// Pantalla principal de cartera. Solo renderiza UI y llama al hook.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { usePortfolio } from "../hooks/usePortfolio";
import { ASSET_TYPES } from "../constants";
import { fmtEur, fmtPct } from "../utils/format";
import { HideAmount } from "../components/ui";
import { DonutChart } from "../components/DonutChart";
import { LineChart } from "../components/LineChart";
import { PositionModal } from "../components/PositionModal";
import { PositionDetailScreen } from "./PositionDetailScreen";

export function PortfolioScreen({ user, onLogout }) {
  const [modal, setModal]             = useState(null); // null | "new" | positionObj
  const [detailPos, setDetailPos]     = useState(null); // posición seleccionada para detalle
  const [hideAmounts, setHideAmounts] = useState(false);

  const {
    enriched, positions, prices, snapshots,
    loading, syncing, lastUpdate,
    totalValue, totalInvested, totalGainAbs, totalGainPct,
    refreshPrices, addOrUpdatePosition, removePosition,
  } = usePortfolio(user.id);

  const donutItems = enriched
    .filter(p => p.currentValue > 0)
    .sort((a, b) => b.currentValue - a.currentValue)
    .map(p => ({ name: p.name, value: p.currentValue }));

  const handleSave = async (pos) => {
    await addOrUpdatePosition(pos);
    setModal(null);
  };

  // Pantalla de detalle
  if (detailPos) return (
    <PositionDetailScreen
      position={detailPos}
      priceData={prices[detailPos.id]}
      hideAmounts={hideAmounts}
      onBack={() => setDetailPos(null)}
    />
  );

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div>
          <div className="header-title">Mi cartera {syncing ? "·" : ""}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{user.name}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="refresh-btn" disabled={loading} onClick={refreshPrices}>
            {loading ? "···" : "↻ Actualizar"}
          </button>
          <button
            className="refresh-btn"
            onClick={() => setHideAmounts(h => !h)}
            style={{ padding: "6px 10px", display: "flex", alignItems: "center" }}
            title={hideAmounts ? "Mostrar importes" : "Ocultar importes"}
          >
            {hideAmounts ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
          <button
            className="refresh-btn"
            onClick={onLogout}
            style={{ padding: "6px 10px", display: "flex", alignItems: "center", gap: 4 }}
            title="Cerrar sesión"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Salir
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="hero">
        <div className="hero-value">
          <HideAmount hide={hideAmounts} size="lg">{fmtEur(totalValue)}</HideAmount>
        </div>
        <div className={`hero-sub ${totalGainAbs >= 0 ? "up" : "down"}`}>
          <span>{totalGainAbs >= 0 ? "↗" : "↘"}</span>
          <span>
            <HideAmount hide={hideAmounts} size="md">
              {totalGainAbs >= 0 ? "+" : ""}{fmtEur(totalGainAbs)}
            </HideAmount>
            {" · "}{fmtPct(totalGainPct)}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="summary">
        <div className="card">
          <div className="card-label">Invertido</div>
          <div className="card-value">
            <HideAmount hide={hideAmounts}>{fmtEur(totalInvested)}</HideAmount>
          </div>
        </div>
        <div className="card">
          <div className="card-label">Posiciones</div>
          <div className="card-value">{positions.length}</div>
        </div>
      </div>

      {/* Gráfica */}
      <LineChart snapshots={snapshots} positions={positions} prices={prices} hideAmounts={hideAmounts} />

      {/* Donut */}
      {donutItems.length > 0 && <DonutChart items={donutItems} hideAmounts={hideAmounts} />}

      {/* Lista de posiciones */}
      <div className="section-label">
        <span>Posiciones</span>
        <button className="add-btn" onClick={() => setModal("new")}>+ Añadir</button>
      </div>

      {lastUpdate && (
        <div className="last-update">Actualizado: {lastUpdate}</div>
      )}

      {positions.length === 0 ? (
        <div className="empty-state">
          <div className="big">📊</div>
          <div>Todavía no tienes posiciones.</div>
          <div style={{ marginTop: 8 }}>Pulsa "Añadir" para empezar.</div>
        </div>
      ) : (
        <div className="positions">
          {enriched.map(p => (
            <div key={p.id} className="position" onClick={() => setDetailPos(p)} style={{cursor:"pointer"}}>
              <div className="pos-name">{p.name}</div>
              <div className="pos-value">
                <HideAmount hide={hideAmounts}>{fmtEur(p.currentValue)}</HideAmount>
              </div>
              <div className="pos-type">
                {ASSET_TYPES.find(t => t.value === p.type)?.label}
                {p.type === "crypto" || p.type === "stock" ? ` · ${p.symbol}` : p.isin ? ` · ${p.isin}` : ""}
                {p.currentPrice != null
                  ? ` · ${fmtEur(p.currentPrice)}`
                  : p.priceError ? ` · ${p.priceError}` : " · cargando…"}
              </div>
              <div className={`pos-gain ${(p.gainPct || 0) >= 0 ? "up" : "down"}`}>
                {fmtPct(p.gainPct)}
                {p.gainAbs != null && (
                  <HideAmount hide={hideAmounts}>
                    {" · "}{p.gainAbs >= 0 ? "+" : ""}{fmtEur(p.gainAbs)}
                  </HideAmount>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, gridColumn: "span 2", justifyContent: "flex-end", marginTop: 4 }}>
                <button className="icon-btn" onClick={() => setModal(p)}>✎ Editar</button>
                <button className="icon-btn del" onClick={() => removePosition(p.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal posición */}
      {modal && (
        <PositionModal
          pos={modal === "new" ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
