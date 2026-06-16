import { useContext, useState, useEffect } from "react";
import { AppContext } from "../../context/AppContext";
import { STICKER_CATEGORIES } from "./stickers.ts";
import type { Sticker } from "./stickers.ts";

// Prop hinzugefügt, um Schließen-Event ans ToolWheel zu senden
export default function StickerMenu({ onSelect }: { onSelect?: () => void }) {
  const { setTool, activeShape, setActiveShape } = useContext(AppContext);
  const [customStickers, setCustomStickers] = useState<Sticker[]>([]);

  // Lade eigene Sticker beim Start
  useEffect(() => {
    const saved = localStorage.getItem("custom_stickers");
    if (saved) setCustomStickers(JSON.parse(saved));
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const newSticker: Sticker = {
        id: `custom-${Date.now()}`,
        label: "Upload",
        icon: reader.result as string, // Base64 String
        isImage: true
      };
      const updated = [...customStickers, newSticker];
      setCustomStickers(updated);
      localStorage.setItem("custom_stickers", JSON.stringify(updated));
    };
    reader.readAsDataURL(file);
  };

  // Kategorien zusammenführen
  const allCats = { ...STICKER_CATEGORIES, "Eigene": customStickers };

  return (
    <div style={{ padding: "5px" }}>
      {Object.entries(allCats).map(([category, stickers]) => (
        <div key={category} style={{ marginBottom: "20px" }}>
          <h3 className="category-title" style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#666' }}>{category}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
            
            {/* Spezieller Upload-Button nur in der Kategorie 'Eigene' */}
            {category === "Eigene" && (
              <label className="upload-btn" style={{ 
                aspectRatio: "1/1", border: "2px dashed #ccc", borderRadius: "12px",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" 
              }}>
                <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                <span style={{ fontSize: "20px", color: '#666' }}>+</span>
              </label>
            )}

            {stickers.map(s => (
              <button 
                key={s.id} 
                onClick={() => { 
                  setTool("shape"); 
                  setActiveShape(s.id); 
                  if (onSelect) onSelect(); // Feuert das automatische Schließen des ToolWheels ab!
                }}
                className={activeShape === s.id ? "active-sticker" : ""}
                style={{ 
                  aspectRatio: "1/1", borderRadius: "12px", padding: "6px",
                  background: activeShape === s.id ? "#eef" : "#f9f9f9",
                  border: activeShape === s.id ? "2px solid #1a6dd4" : "2px solid transparent"
                }}
              >
                {s.isImage || s.icon.startsWith("data:") ? (
                  <img src={s.icon} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: "20px" }}>{s.icon}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}