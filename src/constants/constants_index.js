// ─────────────────────────────────────────────────────────────────────────────
// constants/index.js
// Fuente única de verdad para todos los datos estáticos de la app.
// Al añadir un nuevo tipo de activo, avatar o crypto solo se toca aquí.
// ─────────────────────────────────────────────────────────────────────────────

export const ASSET_TYPES = [
  { value: "fund",   label: "Fondo de Inversión" },
  { value: "etf",    label: "ETF" },
  { value: "stock",  label: "Acción" },
  { value: "crypto", label: "Criptomoneda" },
];

export const CRYPTO_SUGGESTIONS = [
  { symbol: "BTC",   name: "Bitcoin" },
  { symbol: "ETH",   name: "Ethereum" },
  { symbol: "SOL",   name: "Solana" },
  { symbol: "XRP",   name: "XRP" },
  { symbol: "ADA",   name: "Cardano" },
  { symbol: "DOT",   name: "Polkadot" },
  { symbol: "MATIC", name: "Polygon" },
  { symbol: "LINK",  name: "Chainlink" },
  { symbol: "AVAX",  name: "Avalanche" },
  { symbol: "ATOM",  name: "Cosmos" },
];

// ISINs con SecId de Morningstar conocido (fallback cuando Yahoo no encuentra por ISIN)
export const MORNINGSTAR_FALLBACK = {
  "ES0112611001": "0P00016YQ5",  // azValor Internacional
  "ES0119207001": "0P0000YXLI",  // Cobas Selección
  "IE000ZYRH0Q7": "0P0001XF40",  // iShares Dev World
  "IE00B4L5Y983": "0P0000X2HQ",  // iShares MSCI World ETF
  "IE00B4ND3602": "0P0001BQTW",  // iShares Physical Gold
  "LU2145461757": "0P0001KWJF",  // RobecoSAM Smart Energy
};

export const PALETTE = [
  "#c8a96e","#5b8dd9","#4caf82","#e05c5c","#9b7dd4",
  "#e09a4c","#4cb8c8","#d96b8d","#7ec85b","#8899bb",
];

export const CHART_RANGES = [
  { label: "1S", range: "1mo", interval: "1d" },
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "3M", range: "3mo", interval: "1d" },
  { label: "6M", range: "6mo", interval: "1d" },
  { label: "1A", range: "1y",  interval: "1d" },
  { label: "5A", range: "5y",  interval: "1wk" },
];

export const AVATARS = [
  { id: "fox",     label: "Zorro",    bg: "#ea580c", svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="44" r="22" fill="#f97316"/><polygon points="20,30 10,10 28,26" fill="#f97316"/><polygon points="60,30 70,10 52,26" fill="#f97316"/><polygon points="20,30 10,10 28,26" fill="#fff" opacity="0.4"/><polygon points="60,30 70,10 52,26" fill="#fff" opacity="0.4"/><ellipse cx="40" cy="50" rx="14" ry="10" fill="#fde8d8"/><circle cx="33" cy="40" r="5" fill="#1a1a1a"/><circle cx="47" cy="40" r="5" fill="#1a1a1a"/><circle cx="34.5" cy="38.5" r="1.5" fill="#fff"/><circle cx="48.5" cy="38.5" r="1.5" fill="#fff"/><ellipse cx="40" cy="48" rx="3" ry="2" fill="#f472b6"/><path d="M35,52 Q40,56 45,52" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { id: "panda",   label: "Panda",    bg: "#6b7280", svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="44" r="22" fill="#f8f8f8"/><circle cx="26" cy="32" r="9" fill="#1a1a1a"/><circle cx="54" cy="32" r="9" fill="#1a1a1a"/><circle cx="26" cy="34" r="5" fill="#f8f8f8"/><circle cx="54" cy="34" r="5" fill="#f8f8f8"/><circle cx="33" cy="41" r="5" fill="#1a1a1a"/><circle cx="47" cy="41" r="5" fill="#1a1a1a"/><circle cx="34.5" cy="39.5" r="1.5" fill="#fff"/><circle cx="48.5" cy="39.5" r="1.5" fill="#fff"/><ellipse cx="40" cy="50" rx="10" ry="7" fill="#e5e5e5"/><ellipse cx="40" cy="49" rx="4" ry="2.5" fill="#f472b6"/><path d="M35,54 Q40,58 45,54" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { id: "lion",    label: "León",     bg: "#d97706", svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="42" r="26" fill="#92400e" opacity="0.3"/><circle cx="40" cy="44" r="18" fill="#fbbf24"/><circle cx="33" cy="40" r="5" fill="#1a1a1a"/><circle cx="47" cy="40" r="5" fill="#1a1a1a"/><circle cx="34.5" cy="38.5" r="1.5" fill="#fff"/><circle cx="48.5" cy="38.5" r="1.5" fill="#fff"/><ellipse cx="40" cy="50" rx="12" ry="8" fill="#fde68a"/><ellipse cx="40" cy="49" rx="3.5" ry="2" fill="#f472b6"/><path d="M34,54 Q40,58 46,54" fill="none" stroke="#92400e" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { id: "penguin", label: "Pingüino", bg: "#1e3a5f", svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="44" r="22" fill="#1a1a2e"/><ellipse cx="40" cy="50" rx="13" ry="16" fill="#f8f8f8"/><circle cx="33" cy="38" r="5.5" fill="#f8f8f8"/><circle cx="47" cy="38" r="5.5" fill="#f8f8f8"/><circle cx="33" cy="39" r="4" fill="#1a1a2e"/><circle cx="47" cy="39" r="4" fill="#1a1a2e"/><circle cx="34" cy="37.5" r="1.5" fill="#fff"/><circle cx="48" cy="37.5" r="1.5" fill="#fff"/><ellipse cx="40" cy="46" rx="5" ry="3" fill="#fb923c"/><path d="M36,50 Q40,54 44,50" fill="none" stroke="#1a1a2e" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { id: "rabbit",  label: "Conejo",   bg: "#7c3aed", svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><ellipse cx="29" cy="22" rx="7" ry="16" fill="#e5e7eb"/><ellipse cx="51" cy="22" rx="7" ry="16" fill="#e5e7eb"/><ellipse cx="29" cy="22" rx="4" ry="13" fill="#fca5a5"/><ellipse cx="51" cy="22" rx="4" ry="13" fill="#fca5a5"/><circle cx="40" cy="46" r="20" fill="#f3f4f6"/><circle cx="33" cy="41" r="5" fill="#1a1a1a"/><circle cx="47" cy="41" r="5" fill="#1a1a1a"/><circle cx="34.5" cy="39.5" r="1.5" fill="#fff"/><circle cx="48.5" cy="39.5" r="1.5" fill="#fff"/><ellipse cx="40" cy="50" rx="4" ry="3" fill="#fca5a5"/><path d="M35,54 Q40,57 45,54" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { id: "bear",    label: "Oso",      bg: "#92400e", svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="30" r="10" fill="#a16207"/><circle cx="56" cy="30" r="10" fill="#a16207"/><circle cx="40" cy="44" r="22" fill="#a16207"/><circle cx="24" cy="30" r="6" fill="#c4953a"/><circle cx="56" cy="30" r="6" fill="#c4953a"/><ellipse cx="40" cy="52" rx="14" ry="10" fill="#c4953a"/><circle cx="33" cy="40" r="5" fill="#1a1a1a"/><circle cx="47" cy="40" r="5" fill="#1a1a1a"/><circle cx="34.5" cy="38.5" r="1.5" fill="#fff"/><circle cx="48.5" cy="38.5" r="1.5" fill="#fff"/><ellipse cx="40" cy="49" rx="4" ry="3" fill="#7c3411"/><path d="M35,54 Q40,58 45,54" fill="none" stroke="#7c3411" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { id: "cat",     label: "Gato",     bg: "#6366f1", svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><polygon points="22,32 14,12 30,28" fill="#9ca3af"/><polygon points="58,32 66,12 50,28" fill="#9ca3af"/><circle cx="40" cy="44" r="22" fill="#9ca3af"/><ellipse cx="40" cy="51" rx="13" ry="9" fill="#d1d5db"/><circle cx="33" cy="40" r="5" fill="#1a1a1a"/><circle cx="47" cy="40" r="5" fill="#1a1a1a"/><circle cx="34.5" cy="38.5" r="2" fill="#4ade80"/><circle cx="48.5" cy="38.5" r="2" fill="#4ade80"/><circle cx="34.5" cy="38.5" r="1" fill="#1a1a1a"/><circle cx="48.5" cy="38.5" r="1" fill="#1a1a1a"/><ellipse cx="40" cy="49" rx="3" ry="2" fill="#fca5a5"/><path d="M35,53 Q40,57 45,53" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { id: "koala",   label: "Koala",    bg: "#4b5563", svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="36" r="13" fill="#9ca3af"/><circle cx="60" cy="36" r="13" fill="#9ca3af"/><circle cx="20" cy="38" r="9" fill="#d1d5db"/><circle cx="60" cy="38" r="9" fill="#d1d5db"/><circle cx="40" cy="46" r="20" fill="#9ca3af"/><ellipse cx="40" cy="54" rx="14" ry="9" fill="#d1d5db"/><circle cx="33" cy="40" r="5" fill="#1a1a1a"/><circle cx="47" cy="40" r="5" fill="#1a1a1a"/><ellipse cx="40" cy="50" rx="6" ry="4" fill="#6b7280"/><path d="M35,56 Q40,60 45,56" fill="none" stroke="#4b5563" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { id: "owl",     label: "Búho",     bg: "#7c3aed", svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><polygon points="28,28 20,10 36,24" fill="#a78bfa"/><polygon points="52,28 60,10 44,24" fill="#a78bfa"/><circle cx="40" cy="46" r="22" fill="#a78bfa"/><circle cx="30" cy="40" r="10" fill="#fff"/><circle cx="50" cy="40" r="10" fill="#fff"/><circle cx="30" cy="40" r="7" fill="#fbbf24"/><circle cx="50" cy="40" r="7" fill="#fbbf24"/><circle cx="30" cy="40" r="4" fill="#1a1a1a"/><circle cx="50" cy="40" r="4" fill="#1a1a1a"/><circle cx="31.5" cy="38.5" r="1.5" fill="#fff"/><circle cx="51.5" cy="38.5" r="1.5" fill="#fff"/><polygon points="40,48 36,44 44,44" fill="#fb923c"/></svg>` },
  { id: "tiger",   label: "Tigre",    bg: "#ea580c", svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><circle cx="26" cy="30" r="8" fill="#fb923c"/><circle cx="54" cy="30" r="8" fill="#fb923c"/><circle cx="40" cy="44" r="22" fill="#fb923c"/><ellipse cx="40" cy="52" rx="13" ry="9" fill="#fde68a"/><circle cx="33" cy="40" r="5" fill="#1a1a1a"/><circle cx="47" cy="40" r="5" fill="#1a1a1a"/><circle cx="34.5" cy="38.5" r="1.5" fill="#fff"/><circle cx="48.5" cy="38.5" r="1.5" fill="#fff"/><ellipse cx="40" cy="50" rx="4" ry="2.5" fill="#f472b6"/><path d="M35,54 Q40,58 45,54" fill="none" stroke="#92400e" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { id: "dolphin", label: "Delfín",   bg: "#0891b2", svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><ellipse cx="40" cy="46" rx="22" ry="18" fill="#38bdf8"/><ellipse cx="40" cy="52" rx="15" ry="10" fill="#bae6fd"/><polygon points="40,20 30,36 50,36" fill="#38bdf8"/><circle cx="33" cy="40" r="5" fill="#1a1a1a"/><circle cx="47" cy="40" r="5" fill="#1a1a1a"/><circle cx="34.5" cy="38.5" r="1.5" fill="#fff"/><circle cx="48.5" cy="38.5" r="1.5" fill="#fff"/><path d="M35,54 Q40,58 45,54" fill="none" stroke="#0369a1" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { id: "wolf",    label: "Lobo",     bg: "#374151", svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><polygon points="24,34 12,10 30,28" fill="#6b7280"/><polygon points="56,34 68,10 50,28" fill="#6b7280"/><circle cx="40" cy="46" r="22" fill="#6b7280"/><ellipse cx="40" cy="53" rx="14" ry="10" fill="#d1d5db"/><circle cx="33" cy="40" r="5.5" fill="#1a1a1a"/><circle cx="47" cy="40" r="5.5" fill="#1a1a1a"/><circle cx="31" cy="38" r="2" fill="#fbbf24"/><circle cx="45" cy="38" r="2" fill="#fbbf24"/><circle cx="31" cy="38" r="1" fill="#1a1a1a"/><circle cx="45" cy="38" r="1" fill="#1a1a1a"/><path d="M34,55 Q40,59 46,55" fill="none" stroke="#4b5563" stroke-width="1.5" stroke-linecap="round"/></svg>` },
];

export const STORAGE_KEY = "alza_positions_v1";
export const SNAP_KEY    = "alza_snapshots_v1";
