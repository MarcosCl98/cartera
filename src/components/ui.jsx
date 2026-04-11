// ─────────────────────────────────────────────────────────────────────────────
// components/ui.jsx
// Componentes UI primitivos reutilizables en toda la app.
// ─────────────────────────────────────────────────────────────────────────────

import { AVATARS } from "../constants";

// ── HideAmount: oculta importes con píldoras ──────────────────────────────────
export function HideAmount({ children, hide, size = "md" }) {
  if (!hide) return <>{children}</>;
  const h = size === "lg" ? 14 : size === "sm" ? 8 : 11;
  const w = size === "lg" ? 80 : size === "sm" ? 40 : 60;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, verticalAlign: "middle" }}>
      {[w, Math.round(w * 0.6)].map((ww, i) => (
        <span key={i} style={{
          display: "inline-block", width: ww, height: h,
          borderRadius: h / 2, background: "var(--surface3)", verticalAlign: "middle",
        }} />
      ))}
    </span>
  );
}

// ── Avatar: renderiza el SVG de un avatar ────────────────────────────────────
export function Avatar({ id, size = 80, style = {} }) {
  const av = AVATARS.find(a => a.id === id) || AVATARS[0];
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: av.bg, overflow: "hidden", flexShrink: 0, ...style,
      }}
      dangerouslySetInnerHTML={{ __html: av.svg }}
    />
  );
}

// ── Spinner de carga ──────────────────────────────────────────────────────────
export function LoadingDots({ label = "Cargando..." }) {
  return <span className="price-loading">{label}</span>;
}

// ── Modal base ────────────────────────────────────────────────────────────────
export function Modal({ children, onClose }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        {children}
      </div>
    </div>
  );
}
