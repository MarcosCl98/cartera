// ─────────────────────────────────────────────────────────────────────────────
// hooks/usePortfolio.js
// Toda la lógica de negocio de la cartera en un hook reutilizable.
// Los componentes solo llaman funciones y leen datos — no saben nada de APIs.
// Cuando se migre a React Native, este hook funciona sin cambios.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import * as sb from "../api/supabase";
import { fetchFundPrice, fetchCrypto } from "../api/prices";
import { STORAGE_KEY, SNAP_KEY } from "../constants";

// ── localStorage como caché offline ──────────────────────────────────────────
function loadCache(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}
function saveCache(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Ordenar snapshots por fecha (dd/mm) ───────────────────────────────────────
function sortSnapshots(snaps) {
  return snaps.sort((a, b) => {
    const [da, ma] = a.date.split("/").map(Number);
    const [db, mb] = b.date.split("/").map(Number);
    return ma !== mb ? ma - mb : da - db;
  });
}

export function usePortfolio(userId) {
  const [positions, setPositions]   = useState([]);
  const [prices, setPrices]         = useState({});
  const [snapshots, setSnapshots]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const fetchingRef = useRef(false);

  // ── Carga inicial + autoactualización cada 5 minutos ────────────────────────
  useEffect(() => {
    if (!userId) return;

    const load = async (isFirst = false) => {
      if (isFirst) setSyncing(true);
      try {
        const [remotePos, remoteSnaps] = await Promise.all([
          sb.getPositions(userId),
          sb.getSnapshots(userId),
        ]);
        setPositions(remotePos);
        setSnapshots(remoteSnaps);
        saveCache(STORAGE_KEY, remotePos);
        if (remotePos.length > 0) {
          fetchingRef.current = false;
          await _fetchPricesFor(remotePos, {});
        }
      } catch (e) {
        console.warn("Error cargando datos:", e);
        if (isFirst) {
          setPositions(loadCache(STORAGE_KEY));
          setSnapshots(loadCache(SNAP_KEY));
        }
      } finally {
        if (isFirst) setSyncing(false);
      }
    };

    load(true);

    // Autoactualizar precios cada 5 minutos
    const interval = setInterval(() => load(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);

  // Persiste caché local cuando cambian las posiciones
  useEffect(() => {
    if (positions.length > 0) saveCache(STORAGE_KEY, positions);
  }, [positions]);

  // ── Fetch precio de UNA posición ────────────────────────────────────────────
  async function _fetchOnePrice(pos) {
    try {
      if (pos.type === "bitcoin" || pos.type === "crypto") {
        const symbol = pos.type === "bitcoin" ? "BTC" : (pos.symbol || "BTC");
        return { price: await fetchCrypto(symbol), history: [], source: "yahoo" };
      }
      if (pos.type === "stock") {
        // Acciones: fetch por ticker (symbol) en Yahoo Finance
        try {
          const r = await fetchFundPrice(pos.symbol);
          return { price: r.price, history: r.history || [], source: "yahoo" };
        } catch {
          return { price: null, history: [], error: "Ticker no encontrado" };
        }
      }
      if (pos.isin) {
        try {
          const r = await fetchFundPrice(pos.isin);
          return { price: r.price, history: r.history || [], source: "yahoo" };
        } catch {
          return { price: null, history: [], error: "ISIN no encontrado" };
        }
      }
      return { price: null, history: [], error: "Sin precio" };
    } catch {
      return { price: null, history: [], error: "Error" };
    }
  }

  // ── Fetch precios en paralelo para una lista de posiciones ──────────────────
  async function _fetchPricesFor(posList, existingPrices) {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    const results = await Promise.all(posList.map(pos => _fetchOnePrice(pos)));
    const next = { ...existingPrices };
    posList.forEach((pos, i) => { next[pos.id] = results[i]; });

    setPrices(next);
    setLastUpdate(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }));

    // Reconstruir snapshots históricos desde el histórico de Yahoo
    setSnapshots(prev => {
      const merged = Object.fromEntries(prev.map(s => [s.date, s.total]));

      const allDates = new Set();
      posList.forEach(pos => (next[pos.id]?.history || []).forEach(h => allDates.add(h.date)));

      allDates.forEach(date => {
        let total = 0, complete = true;
        posList.forEach(pos => {
          const units = parseFloat(pos.units) || 0;
          const point = (next[pos.id]?.history || []).find(h => h.date === date);
          if (point) total += units * point.close;
          else if (next[pos.id]?.price) total += units * next[pos.id].price;
          else complete = false;
        });
        if (complete && total > 0) merged[date] = total;
      });

      // Snapshot de hoy
      const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
      const todayTotal = posList.reduce((s, p) => {
        const pr = next[p.id]?.price;
        return s + (pr ? parseFloat(p.units) * pr : 0);
      }, 0);
      if (todayTotal > 0) merged[today] = todayTotal;

      const sorted = sortSnapshots(
        Object.entries(merged).map(([date, total]) => ({ date, total }))
      ).slice(-365);

      saveCache(SNAP_KEY, sorted);
      sb.upsertSnapshots(sorted, userId).catch(() => {});
      return sorted;
    });

    setLoading(false);
    fetchingRef.current = false;
  }

  // ── API pública del hook ────────────────────────────────────────────────────

  const refreshPrices = useCallback(() => {
    _fetchPricesFor(positions, prices);
  }, [positions, prices]);

  const addOrUpdatePosition = useCallback(async (pos) => {
    const newPos = { ...pos, id: pos.id || Date.now().toString() };
    setPositions(prev => {
      const exists = prev.find(p => p.id === newPos.id);
      return exists ? prev.map(p => p.id === newPos.id ? newPos : p) : [...prev, newPos];
    });
    await sb.upsertPosition(newPos, userId).catch(e => console.warn("Error guardando posición:", e));
    setTimeout(() => _fetchPricesFor([newPos], prices), 100);
    return newPos;
  }, [userId, prices]);

  const removePosition = useCallback(async (id) => {
    setPositions(prev => prev.filter(p => p.id !== id));
    setPrices(prev => { const n = { ...prev }; delete n[id]; return n; });
    await sb.deletePosition(id).catch(e => console.warn("Error borrando posición:", e));
  }, []);

  const reset = useCallback(() => {
    setPositions([]);
    setPrices({});
    setSnapshots([]);
    setLastUpdate(null);
    fetchingRef.current = false;
  }, []);

  // ── Datos derivados (calculados, no guardados) ──────────────────────────────
  const enriched = positions.map(pos => {
    const pr = prices[pos.id];
    const units = parseFloat(pos.units) || 0;
    const avgPrice = parseFloat(pos.avgPrice) || 0;
    const currentPrice = pr?.price ?? null;
    const currentValue = currentPrice != null ? units * currentPrice : null;
    const invested = units * avgPrice;
    const gainAbs = currentValue != null && invested ? currentValue - invested : null;
    const gainPct = gainAbs != null && invested ? (gainAbs / invested) * 100 : null;
    return { ...pos, currentPrice, currentValue, invested, gainAbs, gainPct, priceError: pr?.error };
  });

  const totalValue    = enriched.reduce((s, p) => s + (p.currentValue || 0), 0);
  const totalInvested = enriched.reduce((s, p) => s + (p.invested || 0), 0);
  const totalGainAbs  = totalValue - totalInvested;
  const totalGainPct  = totalInvested ? (totalGainAbs / totalInvested) * 100 : 0;

  return {
    // Estado
    positions,
    prices,
    snapshots,
    loading,
    syncing,
    lastUpdate,
    // Datos derivados
    enriched,
    totalValue,
    totalInvested,
    totalGainAbs,
    totalGainPct,
    // Acciones
    refreshPrices,
    addOrUpdatePosition,
    removePosition,
    reset,
  };
}
