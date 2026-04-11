// ─────────────────────────────────────────────────────────────────────────────
// App.jsx
// Router principal. Solo gestiona qué pantalla mostrar.
// No contiene lógica de negocio ni de UI.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import "./styles/global.css";
import { ProfilesScreen, PinScreen, NewProfileModal } from "./screens/AuthScreens";
import { PortfolioScreen } from "./screens/PortfolioScreen";

// Pantallas posibles
const SCREENS = { PROFILES: "profiles", PIN: "pin", APP: "app" };

export default function App() {
  const [screen, setScreen]           = useState(SCREENS.PROFILES);
  const [currentUser, setCurrentUser] = useState(null);
  const [showNewProfile, setShowNewProfile] = useState(false);
  const profileReloadRef = useRef(null);

  const handleSelectProfile = (user) => {
    setCurrentUser(user);
    setScreen(SCREENS.PIN);
  };

  const handlePinSuccess = () => {
    setScreen(SCREENS.APP);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setScreen(SCREENS.PROFILES);
  };

  const handleBackFromPin = () => {
    setCurrentUser(null);
    setScreen(SCREENS.PROFILES);
  };

  const handleProfileCreated = () => {
    setShowNewProfile(false);
    if (profileReloadRef.current) profileReloadRef.current();
  };

  if (screen === SCREENS.PROFILES) return (
    <>
      {showNewProfile && (
        <NewProfileModal
          onSave={handleProfileCreated}
          onClose={() => setShowNewProfile(false)}
        />
      )}
      <ProfilesScreen
        onSelect={handleSelectProfile}
        onAdd={() => setShowNewProfile(true)}
        onRefresh={fn => { profileReloadRef.current = fn; }}
      />
    </>
  );

  if (screen === SCREENS.PIN) return (
    <PinScreen
      user={currentUser}
      onSuccess={handlePinSuccess}
      onBack={handleBackFromPin}
    />
  );

  return (
    <PortfolioScreen
      user={currentUser}
      onLogout={handleLogout}
    />
  );
}
