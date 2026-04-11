// ─────────────────────────────────────────────────────────────────────────────
// context/AuthContext.jsx
// Estado global del usuario autenticado.
// Cualquier componente puede leer currentUser o hacer logout sin prop-drilling.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  const login = (user) => setCurrentUser(user);

  const logout = () => setCurrentUser(null);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
