// ─────────────────────────────────────────────────────────────────────────────
// components/StockSearch.jsx
// Buscador de acciones con logo de empresa vía Clearbit
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import { searchStocks } from "../api/prices";

function StockLogo({ logo, name }) {
  const [err, setErr] = useState(false);
  const initial = (name || "?")[0].toUpperCase();

  if (err) {
    return (
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: "var(--surface3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, color: "var(--text2)", flexShrink: 0,
      }}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt={name}
      onError={() => setErr(true)}
      style={{
        width: 36, height: 36, borderRadius: 8,
        objectFit: "contain", background: "#fff",
        flexShrink: 0, padding: 2,
      }}
    />
  );
}

export function StockSearch({ value, onSelect }) {
  const [query, setQuery]         = useState(value || "");
  const [results, setResults]     = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected]   = useState(!!value);
  const debounceRef = useRef(null);

  const search = (q) => {
    if (!q || q.length < 1) { setResults([]); return; }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchStocks(q);
        setResults(r);
      } catch (_) { setResults([]); }
      setSearching(false);
    }, 350);
  };

  const handleSelect = (stock) => {
    setQuery(stock.name);
    setSelected(true);
    setResults([]);
    onSelect(stock.symbol, stock.name);
  };

  return (
    <div className="form-row" style={{ position: "relative" }}>
      <label className="form-label">Buscar acción</label>
      <input
        className="form-input"
        placeholder="Apple, Microsoft, Inditex..."
        value={query}
        autoComplete="off"
        onChange={e => { setQuery(e.target.value); setSelected(false); search(e.target.value); }}
      />
      {searching && (
        <div style={{ position: "absolute", right: 14, top: 42, fontSize: 11, color: "var(--text3)" }}>
          <span className="price-loading">buscando...</span>
        </div>
      )}
      {results.length > 0 && !selected && (
        <div className="crypto-results">
          {results.map(s => (
            <div key={s.symbol} className="crypto-result-item" onClick={() => handleSelect(s)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <StockLogo logo={s.logo} name={s.name} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                    {s.symbol} · {s.exchange}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!selected && query.length > 1 && results.length === 0 && !searching && (
        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
          Sin resultados. Prueba con el ticker exacto (AAPL, SAN.MC...)
        </div>
      )}
    </div>
  );
}
