


// components/toolbar/StickerMenu.tsx
import { useContext, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { STICKER_CATEGORIES } from "./stickers";

export default function StickerMenu() {
  const { tool, setTool, activeShape, setActiveShape } = useContext(AppContext);
  const [isOpen, setIsOpen] = useState(false);

  // Findet das Icon des aktuell gewählten Stickers für den Haupt-Button
  const activeSticker = Object.values(STICKER_CATEGORIES)
    .flat()
    .find(s => s.id === activeShape);

  const selectSticker = (id: string) => {
    setTool("shape");
    setActiveShape(id);
    setIsOpen(false);
  };

  console.log("Aktiver Sticker:", activeSticker); // Schau im Browser-Tab "Konsole" nach!

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Der Haupt-Button in der Toolbar */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`btn ${tool === "shape" ? "active" : ""}`}
        style={{
          padding: "10px",
          background: tool === "shape" ? "#e0e0e0" : "#fff",
          border: "1px solid #ccc",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px"
        }}
      >
        {/*Prüfe ob das Icon ein Bild ist oder ein Emoji */}
        {activeSticker?.isImage || activeSticker?.icon.startsWith("/") ? (
          <img
            src={activeSticker.icon}
            alt=""
            style={{ width: "20px", height: "20px", marginRight: "8px" }}
          />
        ) : (
          <span style={{ marginRight: "8px" }}>{activeSticker?.icon || "🖼️"}</span>
        )}
        {tool === "shape" ? "Sticker aktiv" : "Sticker"}
      </button>

      {/*Dropdown-Menü (Sticker-Auswahl) */}
      {isOpen && (
        <div style={{
          position: "absolute", 
          top: "100%", // Öffnet sich nach oben, da Toolbar meist unten ist
          left: "0",
          marginLeft: "10px",
          background: "white", 
          border: "1px solid #ccc", 
          borderRadius: "12px",
          padding: "15px", 
          zIndex: 100,
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          minWidth: "200px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontWeight: "bold" }}>Sticker wählen</span>
            <button onClick={() => setIsOpen(false)} style={{ border: "none", background: "none", cursor: "pointer" }}>✕</button>
          </div>

          {Object.entries(STICKER_CATEGORIES).map(([category, stickers]) => (
            <div key={category} style={{ marginBottom: "10px" }}>
              <p style={{ fontSize: "12px", color: "#666", textTransform: "uppercase", margin: "5px 0" }}>{category}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "5px" }}>
                {stickers.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => selectSticker(s.id)} 
                    title={s.label}
                    style={{ 
                      fontSize: "24px", 
                      padding: "8px", 
                      background: activeShape === s.id ? "#eee" : "transparent",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {s.isImage || s.icon.startsWith("/") ? (
                      <img 
                        src={s.icon} 
                        alt={s.label} 
                        style={{ width: "24px", height: "24px", objectFit: "contain" }} 
                      />
                    ) : (
                      <span style={{ fontSize: "24px" }}>{s.icon}</span>
                    )}


                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

