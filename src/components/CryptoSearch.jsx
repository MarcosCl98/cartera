// ─────────────────────────────────────────────────────────────────────────────
// components/CryptoSearch.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import { searchCryptos } from "../api/prices";
import { CRYPTO_SUGGESTIONS } from "../constants";

export function CryptoSearch({ value, onSelect }) {
  const [query, setQuery]       = useState(value || "");
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(!!value);
  const debounceRef = useRef(null);

  const search = (q) => {
    if (!q || q.length < 1) { setResults([]); return; }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchCryptos(q);
        setResults(r);
      } catch (_) { setResults([]); }
      setSearching(false);
    }, 350);
  };

  const handleSelect = (crypto) => {
    setQuery(crypto.name);
    setSelected(true);
    setResults([]);
    onSelect(crypto.symbol, crypto.name);
  };

  return (
    <div className="form-row" style={{ position: "relative" }}>
      <label className="form-label">Buscar criptomoneda</label>
      <input
        className="form-input"
        placeholder="Bitcoin, ETH, Solana..."
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
          {results.map(c => (
            <div key={c.symbol} className="crypto-result-item" onClick={() => handleSelect(c)}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{c.symbol}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>{c.symbol}-EUR</div>
            </div>
          ))}
        </div>
      )}
      {!selected && query.length > 1 && results.length === 0 && !searching && (
        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
          Sin resultados. Sugerencias:
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {CRYPTO_SUGGESTIONS.map(c => (
              <span key={c.symbol} onClick={() => handleSelect(c)}
                style={{ cursor: "pointer", background: "var(--surface2)", padding: "3px 8px", borderRadius: 6, fontSize: 11, color: "var(--text2)" }}>
                {c.symbol}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
