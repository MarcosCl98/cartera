// ─────────────────────────────────────────────────────────────────────────────
// components/PositionModal.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ASSET_TYPES } from "../constants";
import { Modal } from "./ui";
import { CryptoSearch } from "./CryptoSearch";

export function PositionModal({ pos, onSave, onClose }) {
  const [form, setForm] = useState(pos || {
    name: "", type: "fund", isin: "", symbol: "", units: "", avgPrice: "", manualPrice: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const needsISIN  = form.type === "fund" || form.type === "etf";
  const needsStock = form.type === "stock";

  const handleSave = () => {
    if (!form.name || !form.units) return;
    onSave({ ...form, id: form.id || Date.now().toString() });
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">{pos ? "Editar posición" : "Nueva posición"}</div>

      <div className="form-row">
        <label className="form-label">Tipo de activo</label>
        <select className="form-select" value={form.type} onChange={e => set("type", e.target.value)}>
          {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="form-row">
        <label className="form-label">Nombre</label>
        <input className="form-input" placeholder="Ej: iShares MSCI World"
          value={form.name} onChange={e => set("name", e.target.value)} />
      </div>

      {needsISIN && (
        <div className="form-row">
          <label className="form-label">ISIN</label>
          <input className="form-input" placeholder="IE00B4L5Y983"
            value={form.isin} onChange={e => set("isin", e.target.value.toUpperCase())} />
          <div className="hint">Se usará para obtener el precio NAV automáticamente</div>
        </div>
      )}

      {form.type === "crypto" && (
        <CryptoSearch
          value={form.symbol || ""}
          onSelect={(symbol, name) => { set("symbol", symbol); if (!form.name) set("name", name); }}
        />
      )}

      {needsStock && (
        <div className="form-row">
          <label className="form-label">Ticker</label>
          <input className="form-input" placeholder="AAPL, MSFT, AMZN..." value={form.symbol || ""}
            onChange={e => set("symbol", e.target.value.toUpperCase())} />
          <div className="hint">Símbolo de Yahoo Finance. Ej: AAPL (Apple), SAN.MC (Santander)</div>
        </div>
      )}

      <div className="form-row-2">
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label className="form-label">Participaciones</label>
          <input className="form-input" type="number" min="0" step="any" placeholder="0.00"
            value={form.units} onChange={e => set("units", e.target.value)} />
        </div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label className="form-label">Precio medio (€)</label>
          <input className="form-input" type="number" min="0" step="any" placeholder="0.00"
            value={form.avgPrice} onChange={e => set("avgPrice", e.target.value)} />
        </div>
      </div>

      {needsManual && (
        <div className="form-row" style={{ marginTop: 16 }}>
          <label className="form-label">Precio actual manual (€/g)</label>
          <input className="form-input" type="number" min="0" step="any" placeholder="0.00"
            value={form.manualPrice} onChange={e => set("manualPrice", e.target.value)} />
          <div className="hint">Se intentará obtener automáticamente. Rellena como respaldo.</div>
        </div>
      )}

      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={handleSave}>Guardar</button>
      </div>
    </Modal>
  );
}
