import { useContext, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { AppContext } from "../../context/AppContext";
import { saveDrawing } from "../../api/drawingsApi";
import "../lobby/LobbyManager.css";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export default function SaveDrawing({ getThumbnail }: { getThumbnail: () => string | null }) {
  const { activeLobbyId, activeLobbyName, isAuthenticated } = useContext(AppContext);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [portalEl] = useState(() => document.createElement("div"));

  useEffect(() => {
    document.body.appendChild(portalEl);
    return () => {
      document.body.removeChild(portalEl);
    };
  }, [portalEl]);

  // Only signed-in users with an active lobby can save.
  if (!isAuthenticated || !activeLobbyId) return null;

  const handleOpen = () => {
    setTitle(activeLobbyName ?? "");
    setError(null);
    setDone(false);
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const thumbnail = getThumbnail();
    if (!thumbnail) {
      setError("Canvas konnte nicht gelesen werden.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveDrawing({ lobbyId: activeLobbyId, title, thumbnail });
      setDone(true);
      setTimeout(() => setOpen(false), 900);
    } catch (err: unknown) {
      setError(errorMessage(err, "Speichern fehlgeschlagen"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="top-bar-element" style={{ position: "absolute", top: 12, right: 12, zIndex: 50 }}>
        <button className="btn btn-secondary lm-trigger" onClick={handleOpen}>
          Zeichnung Speichern
        </button>
      </div>

      {open &&
        createPortal(
          <div className="lm-overlay" onClick={handleClose}>
            <div className="lm-window" onClick={(e) => e.stopPropagation()}>
              <div className="lm-head">
                <h2>Zeichnung speichern</h2>
                <button className="lm-close" aria-label="Schließen" onClick={handleClose}>
                  ✕
                </button>
              </div>
              <form className="lm-body" onSubmit={handleSave}>
                <label className="lm-field">
                  <span>Titel</span>
                  <input
                    className="lm-input"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titel der Zeichnung"
                    maxLength={60}
                    autoFocus
                  />
                </label>

                {error && <p className="lm-error">{error}</p>}
                {done && <p className="lm-prompt">Gespeichert ✓</p>}

                <button type="submit" className="btn btn-secondary lm-submit" disabled={busy}>
                  {busy ? "Speichern…" : "Im Account speichern"}
                </button>
              </form>
            </div>
          </div>,
          portalEl
        )}
    </>
  );
}
