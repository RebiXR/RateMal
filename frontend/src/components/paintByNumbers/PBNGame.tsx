import { useContext, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { AppContext } from "../../context/AppContext";
import {
  emitGeneratePBN,
  onPBNReady,
  offPBNReady,
  onPBNError,
  offPBNError,
  toPngDataUrl,
  type PBNColor,
  type PBNPaletteEntry,
  type PBNResult,
} from "../../socket/PBNEvents";
import "./PBNGame.css";

/** Picks a readable text colour for a swatch based on its luminance. */
function swatchTextColor({ r, g, b }: PBNColor): string {
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? "#1a1a1a" : "#ffffff";
}

// Restiction to 1200px img size for PBN pipeline speedup
const MAX_DIM = 1200;

//loads pic downscales and returns as jpeg
function downscaleImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas error"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("error loading image"));
    };
    img.src = url;
  });
}

export default function PBNGame() {
  const { activeLobbyId } = useContext(AppContext);

  const [open, setOpen] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [palette, setPalette] = useState<PBNPaletteEntry[] | null>(null);
  const [completed, setCompleted] = useState<string | null>(null);
  const [portalEl] = useState(() => document.createElement("div"));

  useEffect(() => {
    document.body.appendChild(portalEl);
    return () => {
      document.body.removeChild(portalEl);
    };
  }, [portalEl]);

  useEffect(() => {
    const handleReady = (result: PBNResult) => {
      setPalette(result.palette);
      setCompleted(result.completed);
      setLoading(false);
    };
    const handleError = (err: { message: string }) => {
      setError(err.message);
      setLoading(false);
    };
    onPBNReady(handleReady);
    onPBNError(handleError);
    return () => {
      offPBNReady(handleReady);
      offPBNError(handleError);
    };
  }, []);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    try {
      setImageDataUrl(await downscaleImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "file handling error");
    }
  };

  const handleGenerate = () => {
    if (!activeLobbyId || !imageDataUrl) return;
    setError(null);
    setLoading(true);
    emitGeneratePBN({ lobbyId: activeLobbyId, image: imageDataUrl, difficulty });
  };

  return (
    <>
      <button className="btn btn-secondary" onClick={() => setOpen(true)}>
        Malen Nach Zahlen
      </button>

      {open && createPortal(
        <div className="pbn-overlay" onClick={() => setOpen(false)}>
          <div className="pbn-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbn-window__head">
              <h2>Malen Nach Zahlen</h2>
              <button className="pbn-close" aria-label="Schließen" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <div className="pbn-panels">
              {/* Panel 1 — upload + difficulty */}
              <section className="pbn-panel">
                <h3>1 · Bild &amp; Schwierigkeit</h3>

                <label className="pbn-upload">
                  <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                  {imageDataUrl ? (
                    <img src={imageDataUrl} alt="Vorschau des hochgeladenen Bildes" />
                  ) : (
                    <span>Bild auswählen</span>
                  )}
                </label>
                {fileName && <p className="pbn-filename">{fileName}</p>}

                <label className="pbn-difficulty">
                  <span>
                    Schwierigkeit: <strong>{difficulty}</strong>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value))}
                  />
                  <span className="pbn-difficulty__hint">1 = wenige Farben · 10 = viele Details</span>
                </label>

                <button
                  className="btn btn-secondary pbn-generate"
                  onClick={handleGenerate}
                  disabled={!imageDataUrl || !activeLobbyId || loading}
                >
                  {loading ? "Wird generiert…" : "Generieren"}
                </button>

                {!activeLobbyId && <p className="pbn-warn">Tritt zuerst einer Lobby bei.</p>}
                {error && <p className="pbn-error">{error}</p>}
              </section>

              {/* Panel 2 — palette */}
              <section className="pbn-panel">
                <h3>2 · Farbpalette</h3>
                {palette ? (
                  <div className="pbn-palette">
                    {palette.map((entry) => (
                      <div
                        key={entry.index}
                        className="pbn-swatch"
                        style={{
                          background: `rgb(${entry.color.r}, ${entry.color.g}, ${entry.color.b})`,
                          color: swatchTextColor(entry.color),
                        }}
                        title={`Farbe ${entry.index}`}
                      >
                        {entry.index}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="pbn-placeholder">Noch keine Palette.</p>
                )}
              </section>

              {/* Panel 3 — completed preview */}
              <section className="pbn-panel">
                <h3>3 · Vorschau</h3>
                {completed ? (
                  <img
                    className="pbn-completed"
                    src={toPngDataUrl(completed)}
                    alt="Fertiges Bild in Flächenfarben"
                  />
                ) : (
                  <p className="pbn-placeholder">Noch kein Ergebnis.</p>
                )}
              </section>
            </div>
          </div>
        </div>,
        portalEl
      )}
    </>
  );
}
