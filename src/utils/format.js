// ─────────────────────────────────────────────────────────────────────────────
// utils/format.js
// Funciones de formateo reutilizables.
// Si se añade soporte multi-divisa o multi-idioma, solo se toca aquí.
// ─────────────────────────────────────────────────────────────────────────────

export const fmt = (n, dec = 2) =>
  n == null || isNaN(n)
    ? "—"
    : new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      }).format(n);

export const fmtEur = (n) =>
  n == null || isNaN(n) ? "—" : `${fmt(n)} €`;

export const fmtPct = (n) =>
  n == null || isNaN(n) ? "—" : `${n >= 0 ? "+" : ""}${fmt(n)}%`;

export const fmtDate = (date) =>
  new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
