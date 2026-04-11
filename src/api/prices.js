// ─────────────────────────────────────────────────────────────────────────────
// api/prices.js
// Toda la lógica de obtención de precios en un único módulo.
// Estrategia por tipo de activo:
//   fund/etf → Yahoo por ISIN → fallback SecId mapa → fallback Morningstar genérico
//   crypto   → Yahoo SYMBOL-EUR → fallback CoinGecko (solo BTC)
//   gold     → open.er-api XAU → fallback metals.live + frankfurter
// ─────────────────────────────────────────────────────────────────────────────

import { MORNINGSTAR_FALLBACK } from "../constants";

// Todas las peticiones a APIs externas pasan por el proxy de Vercel para evitar CORS
const proxy = (url) => `/api/proxy?url=${encodeURIComponent(url)}`;

// ── Conversión de divisa a EUR ────────────────────────────────────────────────
async function toEUR(price, currency) {
  if (!currency || currency === "EUR") return price;
  const from = currency === "GBp" ? "GBP" : currency;
  const adjusted = currency === "GBp" ? price / 100 : price;
  try {
    const r = await fetch(proxy(`https://open.er-api.com/v6/latest/${from}`));
    const d = await r.json();
    const rate = d?.rates?.EUR;
    if (rate) return adjusted * rate;
  } catch (_) {}
  return null;
}

// ── Yahoo Finance: parsear respuesta de chart ─────────────────────────────────
async function parseYahooChart(data) {
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const rawPrice = result.meta?.regularMarketPrice;
  const currency = result.meta?.currency;
  if (!rawPrice) return null;

  const price = await toEUR(rawPrice, currency);
  if (!price) return null;

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];

  const history = (await Promise.all(
    timestamps.map(async (ts, i) => {
      if (closes[i] == null) return null;
      const c = await toEUR(closes[i], currency);
      return c
        ? { date: new Date(ts * 1000).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }), close: c }
        : null;
    })
  )).filter(Boolean);

  return { price, history };
}

// ── Yahoo Finance: fetch por símbolo ─────────────────────────────────────────
async function fetchByYahooSymbol(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`;
  const r = await fetch(proxy(url));
  const d = await r.json();
  return parseYahooChart(d);
}

// ── Fondo/ETF: fetch por ISIN ─────────────────────────────────────────────────
export async function fetchFundPrice(isin) {
  // Paso 1: Yahoo Search por ISIN
  try {
    const r = await fetch(proxy(`https://query2.finance.yahoo.com/v1/finance/search?q=${isin}&quotesCount=3&newsCount=0`));
    const d = await r.json();
    const hit = d?.quotes?.[0];
    if (hit?.symbol) {
      const parsed = await fetchByYahooSymbol(hit.symbol);
      if (parsed) return { ...parsed, name: hit.longname || hit.shortname || "" };
    }
  } catch (_) {}

  // Paso 2: SecId conocido en el mapa local
  const knownSecId = MORNINGSTAR_FALLBACK[isin];
  if (knownSecId) {
    try {
      const parsed = await fetchByYahooSymbol(`${knownSecId}.F`);
      if (parsed) return { ...parsed, name: "" };
    } catch (_) {}
  }

  // Paso 3: Buscar SecId en Morningstar genéricamente
  try {
    const universes = "FOESP%24%24ALL%7CFOIRL%24%24ALL%7CFOEUR%24%24ALL%7CFOLUX%24%24ALL%7CFOGBR%24%24ALL%7CETFESP%24%24ALL%7CETFEUR%24%24ALL";
    const msUrl = `https://lt.morningstar.com/api/rest.svc/9ccopwp0da/security/screener?page=1&pageSize=1&outputType=json&version=1&languageId=es-ES&currencyId=EUR&universeIds=${universes}&securityDataPoints=SecId,LegalName,NAV&filters=ISIN:EQ:${isin}&term=${isin}`;
    const r = await fetch(proxy(msUrl));
    const d = await r.json();
    const secId = d?.rows?.[0]?.SecId;
    const nav = d?.rows?.[0]?.NAV;
    const name = d?.rows?.[0]?.LegalName || "";
    if (secId) {
      try {
        const parsed = await fetchByYahooSymbol(`${secId}.F`);
        if (parsed) return { ...parsed, name };
      } catch (_) {}
      if (nav) return { price: parseFloat(nav), history: [], name };
    }
  } catch (_) {}

  throw new Error(`ISIN no encontrado: ${isin}`);
}

// ── Criptomoneda ──────────────────────────────────────────────────────────────
export async function fetchCrypto(symbol) {
  // Intentar par EUR directo
  try {
    const r = await fetch(proxy(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}-EUR?interval=1d&range=5d`));
    const d = await r.json();
    const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price && price > 0) return price;
  } catch (_) {}

  // Fallback par USD + conversión
  try {
    const [rCrypto, rFx] = await Promise.all([
      fetch(proxy(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}-USD?interval=1d&range=5d`)),
      fetch(proxy("https://open.er-api.com/v6/latest/USD")),
    ]);
    const dCrypto = await rCrypto.json();
    const dFx = await rFx.json();
    const usdPrice = dCrypto?.chart?.result?.[0]?.meta?.regularMarketPrice;
    const eurRate = dFx?.rates?.EUR;
    if (usdPrice && eurRate) return usdPrice * eurRate;
  } catch (_) {}

  // Último fallback: CoinGecko solo para BTC
  if (symbol === "BTC") {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur");
    const d = await r.json();
    return d.bitcoin.eur;
  }

  throw new Error(`Precio no disponible para ${symbol}`);
}

// ── Oro ───────────────────────────────────────────────────────────────────────
export async function fetchGold() {
  // open.er-api: 1 oz XAU en EUR → convertir a EUR/gramo
  try {
    const r = await fetch(proxy("https://open.er-api.com/v6/latest/XAU"));
    const d = await r.json();
    const eurOz = d?.rates?.EUR;
    if (eurOz && eurOz > 100) return eurOz / 31.1035;
    throw new Error("XAU inválido");
  } catch {
    // Fallback: metals.live + frankfurter
    const r = await fetch(proxy("https://api.metals.live/v1/spot/gold"));
    const d = await r.json();
    const usdOz = d[0]?.price;
    if (!usdOz) throw new Error("Gold unavailable");
    const r2 = await fetch(proxy("https://api.frankfurter.app/latest?from=USD&to=EUR"));
    const d2 = await r2.json();
    return (usdOz * d2.rates.EUR) / 31.1035;
  }
}

// ── Búsqueda de criptos (para el buscador) ────────────────────────────────────
export async function searchCryptos(query) {
  const r = await fetch(
    proxy(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0&listsCount=0`)
  );
  const d = await r.json();
  const cryptos = (d?.quotes || []).filter(item => item.quoteType === "CRYPTOCURRENCY");

  const map = {};
  for (const item of cryptos) {
    const base = (item.symbol || "").split("-")[0].split("=")[0];
    if (!base || base.length > 10) continue;
    const rawName = item.longname || item.shortname || base;
    const cleanName = rawName.replace(/ (EUR|USD|GBP|BTC|USDT)$/i, "").trim();
    if (!map[base]) map[base] = { symbol: base, name: cleanName };
  }

  return Object.values(map).slice(0, 6);
}

// ── Histórico para la gráfica de cartera ─────────────────────────────────────
export async function fetchChartSeries(positions, range, interval) {
  const allSeries = await Promise.all(positions.map(async (pos) => {
    try {
      let symbol = null;

      if (pos.type === "bitcoin") symbol = "BTC-EUR";
      else if (pos.type === "crypto") symbol = `${pos.symbol || "BTC"}-EUR`;
      else if (pos.type === "stock" && pos.symbol) symbol = pos.symbol;
      else if (pos.isin) {
        try {
          const sr = await fetch(proxy(`https://query2.finance.yahoo.com/v1/finance/search?q=${pos.isin}&quotesCount=1&newsCount=0`));
          const sd = await sr.json();
          symbol = sd?.quotes?.[0]?.symbol;
        } catch (_) {}
        if (!symbol) {
          const secId = MORNINGSTAR_FALLBACK[pos.isin];
          if (secId) symbol = `${secId}.F`;
        }
      }

      if (!symbol) return null;

      const r = await fetch(proxy(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`));
      const d = await r.json();
      const result = d?.chart?.result?.[0];
      if (!result) return null;

      return {
        timestamps: result.timestamp || [],
        closes: result.indicators?.quote?.[0]?.close || [],
        currency: result.meta?.currency,
        units: parseFloat(pos.units),
      };
    } catch { return null; }
  }));

  return allSeries.filter(s => s && s.timestamps.length > 1);
}

// ── Búsqueda de acciones ──────────────────────────────────────────────────────
export async function searchStocks(query) {
  const r = await fetch(
    proxy(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0`)
  );
  const d = await r.json();

  return (d?.quotes || [])
    .filter(item => item.quoteType === "EQUITY" && item.symbol && item.longname)
    .slice(0, 6)
    .map(item => ({
      symbol: item.symbol,
      name: item.longname || item.shortname || item.symbol,
      exchange: item.exchDisp || "",
      // Logo vía Clearbit usando el dominio inferido del ticker
      logo: `https://logo.clearbit.com/${inferDomain(item.symbol, item.longname)}`,
    }));
}

function inferDomain(symbol, name) {
  // Mapa de tickers conocidos a dominios
  const known = {
    "AAPL": "apple.com", "MSFT": "microsoft.com", "GOOGL": "google.com",
    "GOOG": "google.com", "AMZN": "amazon.com", "META": "meta.com",
    "TSLA": "tesla.com", "NVDA": "nvidia.com", "NFLX": "netflix.com",
    "AMD": "amd.com", "INTC": "intel.com", "ORCL": "oracle.com",
    "CRM": "salesforce.com", "ADBE": "adobe.com", "PYPL": "paypal.com",
    "SAN.MC": "santander.com", "BBVA.MC": "bbva.com", "ITX.MC": "inditex.com",
    "TEF.MC": "telefonica.com", "IBE.MC": "iberdrola.com", "REP.MC": "repsol.com",
    "ASML": "asml.com", "SAP": "sap.com", "NVO": "novonordisk.com",
    "MC.PA": "lvmh.com", "OR.PA": "loreal.com", "TTE.PA": "totalenergies.com",
    "BRK-B": "berkshirehathaway.com", "JPM": "jpmorganchase.com",
    "V": "visa.com", "MA": "mastercard.com", "BAC": "bankofamerica.com",
    "WMT": "walmart.com", "DIS": "disney.com", "KO": "coca-cola.com",
  };
  if (known[symbol]) return known[symbol];
  // Fallback: usar nombre de empresa para inferir dominio
  const clean = (name || "").toLowerCase()
    .replace(/,?\s*(inc|corp|ltd|plc|sa|ag|nv|se|group|holdings?|co)\.?$/i, "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
  return `${clean}.com`;
}
