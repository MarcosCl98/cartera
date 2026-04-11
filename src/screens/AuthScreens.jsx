// ─────────────────────────────────────────────────────────────────────────────
// screens/AuthScreens.jsx
// Todas las pantallas de autenticación agrupadas.
// Perfiles → PIN → App
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { getUsers, createUser, deleteUser } from "../api/supabase";
import { AVATARS } from "../constants";
import { Avatar, Modal } from "../components/ui";

// ── Pantalla de selección de perfil ──────────────────────────────────────────
export function ProfilesScreen({ onSelect, onAdd, onRefresh }) {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [editMode, setEditMode]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const reload = () => {
    setLoading(true);
    getUsers().then(u => { setUsers(u); setLoading(false); });
  };

  useEffect(() => { reload(); }, []);
  useEffect(() => { if (onRefresh) onRefresh(reload); }, []);

  return (
    <div className="profiles-screen">
      <div className="profiles-logo">alza<span>.</span></div>

      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: 13 }}>Cargando...</div>
      ) : (
        <>
          {users.length > 0 && (
            <button
              onClick={() => setEditMode(e => !e)}
              style={{ position: "absolute", top: 48, right: 24, background: "none", border: "none", color: "var(--text3)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              {editMode ? "Listo" : "Editar"}
            </button>
          )}

          <div className="profiles-grid">
            {users.map(u => (
              <div key={u.id} className="profile-item" onClick={() => !editMode && onSelect(u)}>
                <div style={{ position: "relative" }}>
                  <div className="profile-avatar" style={{ padding: 0, overflow: "hidden" }}>
                    <Avatar id={u.avatar} size={80} />
                  </div>
                  {editMode && (
                    <div
                      onClick={e => { e.stopPropagation(); setDeleteTarget(u); }}
                      style={{ position: "absolute", top: -4, right: -4, width: 22, height: 22, borderRadius: "50%", background: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", cursor: "pointer", fontWeight: 700, lineHeight: 1 }}>
                      −
                    </div>
                  )}
                </div>
                <div className="profile-name">{u.name}</div>
              </div>
            ))}

            {!editMode && (
              <div className="profile-item" onClick={onAdd}>
                <div className="profile-add">+</div>
                <div className="profile-name" style={{ color: "var(--text3)" }}>Añadir</div>
              </div>
            )}
          </div>
        </>
      )}

      {deleteTarget && (
        <DeleteProfileModal
          user={deleteTarget}
          onDeleted={() => { setDeleteTarget(null); setEditMode(false); reload(); }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ── Pantalla de PIN ───────────────────────────────────────────────────────────
export function PinScreen({ user, onSuccess, onBack }) {
  const [digits, setDigits] = useState([]);
  const [error, setError]   = useState(false);

  const handleKey = (k) => {
    if (digits.length >= 6) return;
    const next = [...digits, k];
    setDigits(next);
    if (next.length === 6) {
      setTimeout(() => {
        if (next.join("") === user.pin) {
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => { setDigits([]); setError(false); }, 800);
        }
      }, 150);
    }
  };

  return (
    <div className="pin-screen">
      <Avatar id={user.avatar} size={72} style={{ marginBottom: 12 }} />
      <div className="pin-name">{user.name}</div>
      <div className="pin-label">Introduce tu PIN</div>
      <div className="pin-dots">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`pin-dot ${i < digits.length ? (error ? "error" : "filled") : ""}`} />
        ))}
      </div>
      <div className="pin-error">{error ? "PIN incorrecto" : "\u00a0"}</div>
      <div className="pin-keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => (
          <button key={k} className="pin-key" onClick={() => handleKey(String(k))}>{k}</button>
        ))}
        <button className="pin-key empty" disabled />
        <button className="pin-key" onClick={() => handleKey("0")}>0</button>
        <button className="pin-key del" onClick={() => setDigits(d => d.slice(0, -1))}>⌫</button>
      </div>
      <button className="pin-back" onClick={onBack}>← Cambiar perfil</button>
    </div>
  );
}

// ── Modal: nuevo perfil ───────────────────────────────────────────────────────
export function NewProfileModal({ onSave, onClose }) {
  const [name, setName]     = useState("");
  const [pin, setPin]       = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0].id);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || pin.length !== 6) return;
    setSaving(true);
    const av = AVATARS.find(a => a.id === avatar) || AVATARS[0];
    await createUser({ name: name.trim(), pin, color: av.bg, avatar });
    onSave();
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Nuevo perfil</div>

      <div className="form-row">
        <label className="form-label">Elige tu avatar</label>
        <div className="avatar-grid">
          {AVATARS.map(av => (
            <div key={av.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                className={`avatar-opt ${avatar === av.id ? "selected" : ""}`}
                style={{ background: av.bg }}
                dangerouslySetInnerHTML={{ __html: av.svg }}
                onClick={() => setAvatar(av.id)}
              />
              <div className="avatar-label">{av.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label className="form-label">Nombre</label>
        <input className="form-input" placeholder="Tu nombre" value={name}
          autoComplete="off" onChange={e => setName(e.target.value)} />
      </div>

      <div className="form-row">
        <label className="form-label">PIN (6 dígitos)</label>
        <input className="form-input" type="password" inputMode="numeric"
          maxLength={6} placeholder="••••••" value={pin}
          autoComplete="new-password"
          onChange={e => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} />
      </div>

      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={handleSave}
          disabled={saving || !name.trim() || pin.length !== 6}>
          {saving ? "Guardando..." : "Crear perfil"}
        </button>
      </div>
    </Modal>
  );
}

// ── Modal: eliminar perfil ────────────────────────────────────────────────────
export function DeleteProfileModal({ user, onDeleted, onClose }) {
  const [pin, setPin]         = useState("");
  const [error, setError]     = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (pin !== user.pin) {
      setError("PIN incorrecto");
      setPin("");
      setTimeout(() => setError(""), 1500);
      return;
    }
    setDeleting(true);
    await deleteUser(user.id);
    onDeleted();
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-title" style={{ color: "var(--red)" }}>Eliminar perfil</div>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Avatar id={user.avatar} size={64} style={{ margin: "0 auto 8px" }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{user.name}</div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
          Se eliminarán todas sus posiciones permanentemente
        </div>
      </div>
      <div className="form-row">
        <label className="form-label">Confirma el PIN de {user.name}</label>
        <input className="form-input" type="password" inputMode="numeric"
          maxLength={6} placeholder="••••••" value={pin} autoComplete="off"
          onChange={e => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} />
        {error && <div style={{ color: "var(--red)", fontSize: 12, marginTop: 6 }}>{error}</div>}
      </div>
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={handleDelete}
          disabled={deleting || pin.length !== 6}
          style={{ background: "var(--red)" }}>
          {deleting ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </Modal>
  );
}
