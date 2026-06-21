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
  pbnColorToCss,
  swatchTextColor,
  type PBNPaletteEntry,
  type PBNResult,
} from "../../socket/PBNEvents";
import "./PBNGame.css";

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
  const { activeLobbyId, currentColor, setCurrentColor, pbnPalette, setPbnPalette } =
    useContext(AppContext);

  const [open, setOpen] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string | null>(null);
  const [portalEl] = useState(() => document.createElement("div"));

  useEffect(() => {
    document.body.appendChild(portalEl);
    return () => {
      document.body.removeChild(portalEl);
    };
  }, [portalEl]);

  // Clear the shared palette when leaving PBN mode (component unmounts) so the
  // tool wheel only shows PBN colours while this mode is active.
  useEffect(() => () => setPbnPalette(null), []);

  useEffect(() => {
    const handleReady = (result: PBNResult) => {
      setPbnPalette(result.palette);
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
      <button className="btn btn-secondary lm-trigger" onClick={() => setOpen(true)}>
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
                {pbnPalette ? (
                  <div className="pbn-palette">
                    {pbnPalette.map((entry: PBNPaletteEntry) => {
                      const css = pbnColorToCss(entry.color);
                      return (
                        <div
                          key={entry.index}
                          className={"pbn-swatch" + (currentColor === css ? " is-selected" : "")}
                          style={{ background: css, color: swatchTextColor(entry.color) }}
                          onClick={() => setCurrentColor(css)}
                          role="button"
                          title={`Farbe ${entry.index} auswählen`}
                        >
                          {entry.index}
                        </div>
                      );
                    })}
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
