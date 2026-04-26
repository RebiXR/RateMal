import ColorPicker from "./ColorPicker";
//import ShapeButton from "./ShapeButton";
import { useRef, useEffect, useContext, useState } from "react";
import { AppContext } from "../../context/AppContext";
import PenButton from "./PenButton";
import StickerMenu from "../sticker/stickerMenu";


// components/toolbar/Toolbar.tsx
export default function ToolBar() {

  const { showGrid, setShowGrid } = useContext(AppContext);

  return (
    <div style={{ 
      display: "flex", flexDirection: "column", gap: "15px",
      background: "rgba(255,255,255,0.8)", padding: "12px",
      borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
    }}>
      <PenButton />   {/* Aktiviert Stift + Rechte Bar */}
      <StickerMenu /> {/* Öffnet sich am besten nach RECHTS */}
      
      {/* Platzhalter Grid Button */}
      <button onClick={() => setShowGrid(!showGrid)} // Umschalten
        style={{ 
          fontSize: '20px', 
          padding: '10px', 
          borderRadius: '8px', 
          border: '1px solid #ccc',
          background: showGrid ? '#e0e0e0' : 'white', // Feedback, ob aktiv
          cursor: 'pointer'
        }}
        title="Grid umschalten"
      >
        #
      </button>
    </div>
  );
}


