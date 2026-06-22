import { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AppContext } from "../../context/AppContext";
import { listDrawings, loadDrawing, deleteDrawing, type DrawingSummary } from "../../api/drawingsApi";
import "../lobby/LobbyManager.css";
import "./SavedDrawings.css";

export default function SavedDrawingsGallery() {
  const { isAuthenticated, activeLobbyId } = useContext(AppContext);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DrawingSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [portalEl] = useState(() => document.createElement("div"));

  useEffect(() => {
    document.body.appendChild(portalEl);
    return () => {
      document.body.removeChild(portalEl);
    };
  }, [portalEl]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBusy(true);
    listDrawings()
      .then(setItems)
      .catch((e) => setError(e?.message ?? "Laden fehlgeschlagen"))
      .finally(() => setBusy(false));
  }, [open]);

  if (!isAuthenticated) return null;

  const handleLoad = async (id: string) => {
    if (!activeLobbyId) {
      setError("Erst einer Lobby beitreten.");
      return;
    }
    try {
      await loadDrawing(id, activeLobbyId);
      setOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "Laden fehlgeschlagen");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDrawing(id);
      setItems((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      setError(e?.message ?? "Löschen fehlgeschlagen");
    }
  };

  return (
    <>
      <button className="btn btn-secondary lm-trigger" onClick={() => setOpen(true)}>
        Meine Zeichnungen
      </button>

      {open &&
        createPortal(
          <div className="lm-overlay" onClick={() => setOpen(false)}>
            <div className="lm-window" onClick={(e) => e.stopPropagation()}>
              <div className="lm-head">
                <h2>Meine Zeichnungen</h2>
                <button className="lm-close" aria-label="Schließen" onClick={() => setOpen(false)}>
                  ✕
                </button>
              </div>
              <div className="lm-body">
                {error && <p className="lm-error">{error}</p>}
                {busy ? (
                  <p className="lm-empty">Lädt…</p>
                ) : items.length === 0 ? (
                  <p className="lm-empty">Noch keine gespeicherten Zeichnungen.</p>
                ) : (
                  <div className="sd-grid">
                    {items.map((d) => (
                      <div key={d.id} className="sd-card">
                        <img className="sd-thumb" src={d.thumbnail} alt={d.title} />
                        <div className="sd-title">{d.title}</div>
                        <div className="sd-actions">
                          <button className="btn btn-secondary" onClick={() => handleLoad(d.id)}>
                            Laden
                          </button>
                          <button className="btn" aria-label="Löschen" onClick={() => handleDelete(d.id)}>
                            Löschen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          portalEl
        )}
    </>
  );
}
