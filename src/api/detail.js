// ─────────────────────────────────────────────────────────────────────────────
// api/detail.js
// Obtiene información detallada de un activo via Yahoo Finance quoteSummary.
// ─────────────────────────────────────────────────────────────────────────────

import { MORNINGSTAR_FALLBACK } from "../constants";

const proxy = (url) => `/api/proxy?url=${encodeURIComponent(url)}`;

// Resuelve el símbolo de Yahoo para cualquier tipo de posición
export async function resolveSymbol(pos) {
  if (pos.type === "bitcoin") return "BTC-EUR";
  if (pos.type === "crypto") return `${pos.symbol}-EUR`;
  if (pos.type === "stock" && pos.symbol) return pos.symbol;
  if (pos.type === "gold") return "SGLN.MI";
  if (pos.isin) {
    // Intentar buscar por ISIN
    try {
      const r = await fetch(proxy(`https://query2.finance.yahoo.com/v1/finance/search?q=${pos.isin}&quotesCount=1&newsCount=0`));
      const d = await r.json();
      const sym = d?.quotes?.[0]?.symbol;
      if (sym) return sym;
    } catch (_) {}
    // Fallback mapa
    const secId = MORNINGSTAR_FALLBACK[pos.isin];
    if (secId) return `${secId}.F`;
  }
  return null;
}

// Obtiene datos detallados del activo
export async function fetchAssetDetail(symbol, type) {
  const isFund = type === "fund" || type === "etf";
  const isCrypto = type === "crypto" || type === "bitcoin";
  const isStock = type === "stock";

  // Módulos según tipo
  let modules = "price,summaryDetail,defaultKeyStatistics";
  if (isFund) modules += ",fundProfile,fundPerformance,topHoldings";
  if (isStock) modules += ",financialData";

  try {
    const r = await fetch(
      proxy(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}`)
    );
    const d = await r.json();
    const result = d?.quoteSummary?.result?.[0];
    if (!result) return null;

    const price = result.price || {};
    const summary = result.summaryDetail || {};
    const stats = result.defaultKeyStatistics || {};
    const fundProfile = result.fundProfile || {};
    const fundPerf = result.fundPerformance || {};
    const holdings = result.topHoldings || {};
    const financial = result.financialData || {};

    return {
      // Precio e info básica
      name: price.longName || price.shortName || symbol,
      currency: price.currency || "EUR",
      marketCap: price.marketCap?.raw,
      exchange: price.exchangeName,

      // 52 semanas
      high52: summary.fiftyTwoWeekHigh?.raw,
      low52:  summary.fiftyTwoWeekLow?.raw,
      avg50:  summary.fiftyDayAverage?.raw,
      avg200: summary.twoHundredDayAverage?.raw,

      // Dividendo
      dividendYield: summary.dividendYield?.raw,
      dividendRate:  summary.dividendRate?.raw,
      exDividendDate: summary.exDividendDate?.fmt,

      // Fondos
      ter: fundProfile.annualReportExpenseRatio?.raw
        || stats.annualHoldingsTurnover?.raw
        || null,
      category: fundProfile.categoryName,
      totalAssets: summary.totalAssets?.raw,
      returns: {
        ytd:  fundPerf.trailingReturns?.ytd?.raw,
        oneMonth:  fundPerf.trailingReturns?.oneMonth?.raw,
        threeMonth: fundPerf.trailingReturns?.threeMonth?.raw,
        oneYear:   fundPerf.trailingReturns?.oneYear?.raw,
        threeYear: fundPerf.trailingReturns?.threeYear?.raw,
        fiveYear:  fundPerf.trailingReturns?.fiveYear?.raw,
        tenYear:   fundPerf.trailingReturns?.tenYear?.raw,
      },
      topHoldings: (holdings.holdings || []).slice(0, 5).map(h => ({
        name: h.holdingName,
        pct: h.holdingPercent?.raw,
      })),

      // Acciones
      pe: summary.trailingPE?.raw || summary.forwardPE?.raw,
      beta: stats.beta?.raw,
      eps: stats.trailingEps?.raw,
      revenueGrowth: financial.revenueGrowth?.raw,
      grossMargins:  financial.grossMargins?.raw,
    };
  } catch (e) {
    console.warn("Error fetching detail:", e);
    return null;
  }
}

// Histórico de precios para la gráfica de detalle
export async function fetchPriceHistory(symbol, range = "1y", interval = "1d") {
  try {
    const r = await fetch(
      proxy(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`)
    );
    const d = await r.json();
    const result = d?.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const currency = result.meta?.currency;

    return timestamps.map((ts, i) => ({
      ts,
      date: new Date(ts * 1000).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
      close: closes[i] ?? null,
      currency,
    })).filter(p => p.close !== null);
  } catch {
    return [];
  }
}
