// ─────────────────────────────────────────────────────────────────────────────
// api/supabase.js
// Toda la comunicación con Supabase en un único módulo.
// Si en el futuro cambia el backend (o se migra a otra BD), solo se toca aquí.
// ─────────────────────────────────────────────────────────────────────────────

const SB_URL = "https://fdwdhdskumcuwcimzpnv.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkd2RoZHNrdW1jdXdjaW16cG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NTQyMTQsImV4cCI6MjA5MTMzMDIxNH0.OOWMuxVHbBzbKZ58NuFjF6vuD-pvcIoBJSA144sx11I";

const headers = {
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

const upsertHeaders = {
  ...headers,
  "Prefer": "resolution=merge-duplicates,return=representation",
};

// ── Helpers internos ──────────────────────────────────────────────────────────
const sb = (path) => `${SB_URL}/rest/v1/${path}`;

async function get(path) {
  const r = await fetch(sb(path), { headers });
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}

async function post(path, body, merge = false) {
  const r = await fetch(sb(path), {
    method: "POST",
    headers: merge ? upsertHeaders : headers,
    body: JSON.stringify(body),
  });
  const d = await r.json();
  return Array.isArray(d) ? d[0] : d;
}

async function del(path) {
  await fetch(sb(path), { method: "DELETE", headers });
}

// ── Usuarios ──────────────────────────────────────────────────────────────────
export async function getUsers() {
  const rows = await get("users?select=*&order=created_at.asc");
  return rows;
}

export async function createUser({ name, pin, color, avatar }) {
  return post("users", { name, pin, color, avatar });
}

export async function deleteUser(id) {
  await del(`users?id=eq.${id}`);
}

// ── Posiciones ────────────────────────────────────────────────────────────────
export async function getPositions(userId) {
  const rows = await get(`positions?select=*&order=created_at.asc&user_id=eq.${userId}`);
  return rows.map(mapPosition);
}

export async function upsertPosition(pos, userId) {
  await post("positions", {
    id: pos.id,
    name: pos.name,
    type: pos.type,
    isin: pos.isin || null,
    symbol: pos.symbol || null,
    units: parseFloat(pos.units),
    avg_price: parseFloat(pos.avgPrice),
    manual_price: pos.manualPrice ? parseFloat(pos.manualPrice) : null,
    user_id: userId,
  }, true);
}

export async function deletePosition(id) {
  await del(`positions?id=eq.${id}`);
}

// ── Snapshots ─────────────────────────────────────────────────────────────────
export async function getSnapshots(userId) {
  const rows = await get(`snapshots?select=*&order=date.asc&user_id=eq.${userId}`);
  return rows.map(s => ({ date: s.date, total: s.total }));
}

export async function upsertSnapshots(snaps, userId) {
  if (!snaps.length) return;
  await post("snapshots", snaps.map(s => ({
    date: s.date,
    total: s.total,
    user_id: userId,
  })), true);
}

// ── Mappers ───────────────────────────────────────────────────────────────────
function mapPosition(p) {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    isin: p.isin || "",
    symbol: p.symbol || "",
    units: String(p.units),
    avgPrice: String(p.avg_price),
    manualPrice: p.manual_price ? String(p.manual_price) : "",
  };
}
