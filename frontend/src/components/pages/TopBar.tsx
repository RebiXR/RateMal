import { useContext } from "react";
import LobbyManager from "../lobby/LobbyManager";
import LobbyParticipants from "../lobby/LobbyParticipants";
import Prompts from "../canvas/Prompts";
import GuessingGameCreator from "../canvas/GuessingGame";
import PBNGame from "../paintByNumbers/PBNGame";
import SavedDrawingsGallery from "../canvas/SavedDrawingsGallery";
import { AppContext } from "../../context/AppContext";
import type { GameMode } from "./StartPage";

interface TopBarProps {
  view: "home" | "canvas" | "memory";
  selectedMode?: GameMode | null;
  onBack: () => void;
  onLoginClick?: () => void;
  onMemoryClick?: () => void;
}

export default function TopBar({ view, selectedMode, onBack, onLoginClick, onMemoryClick }: TopBarProps) {
  const { isAuthenticated, username } = useContext(AppContext);

  return (
    <header
      className="app-topbar"
      style={{
        minHeight: "72px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "0 24px",
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        zIndex: 1000,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: "1 1 220px" }}>
        {view !== "home" && (
          <button onClick={onBack} className="btn" aria-label="Zur Startseite zurueck" style={{ padding: "8px 15px", marginRight: "10px" }}>
            Zurueck
          </button>
        )}
        <div
          style={{
            width: "40px",
            height: "40px",
            background: "#1a6dd4",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
          }}
        >
          R
        </div>
        <span style={{ fontWeight: 800, color: "#333", fontSize: "18px" }}>
          Rate<span style={{ color: "#1a6dd4" }}>Mal</span>
        </span>
      </div>

      <nav aria-label="Lobby" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", flex: "1 1 260px" }}>
        {view !== "home" && (
          <>
            <div className="top-bar-element">
              <LobbyManager />
            </div>
            <div className="top-bar-element">
              <LobbyParticipants />
            </div>
          </>
        )}
      </nav>

      <nav aria-label="Spielaktionen" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", flex: "1 1 320px", flexWrap: "wrap" }}>
        {view === "canvas" && (
          <>
            {selectedMode === "group-draw" && (
              <div className="top-bar-element">
                <Prompts />
              </div>
            )}
            {selectedMode === "guessing-game" && (
              <div className="top-bar-element">
                <GuessingGameCreator />
              </div>
            )}
            {selectedMode === "paint-by-numbers" && (
              <div className="top-bar-element">
                <PBNGame />
              </div>
            )}
            <SavedDrawingsGallery />
            <button className="btn btn-secondary" onClick={onMemoryClick} aria-label="Memory Spiel oeffnen">
              Memory
            </button>
          </>
        )}
        {view === "home" && (
          <button className="btn btn-secondary">?</button>
        )}
        {isAuthenticated ? (
          <span
            className="btn btn-secondary"
            aria-label={`Angemeldet als ${username}`}
            style={{ cursor: "default" }}
          >
            {username}
          </span>
        ) : (
          <button
            onClick={onLoginClick}
            aria-label="Anmelden oder registrieren"
            style={{
              background: "#0a3cff",
              color: "#fff",
              padding: "10px 24px",
              fontWeight: 700,
              fontSize: "15px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Anmelden
          </button>
        )}
      </nav>
    </header>
  );
}
