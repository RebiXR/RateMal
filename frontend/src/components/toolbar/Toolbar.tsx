//import ShapeButton from "./ShapeButton";
import { useContext } from "react";
import { AppContext } from "../../context/AppContext";
import PenButton from "./PenButton";
import StickerMenu from "../sticker/stickerMenu";
import { undoDraw } from "../../socket/drawingEvents";


// components/toolbar/Toolbar.tsx
export default function ToolBar() {

  const { activeLobbyId, showGrid, setShowGrid } = useContext(AppContext);

  const toolButtonStyle = {
    fontSize: "20px",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    background: "white",
    cursor: "pointer",
  };

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
          ...toolButtonStyle,
          background: showGrid ? '#e0e0e0' : 'white', // Feedback, ob aktiv
        }}
        title="Grid umschalten"
      >
        #
      </button>
      <button
        onClick={() => activeLobbyId && undoDraw(activeLobbyId)}
        disabled={!activeLobbyId}
        style={{
          ...toolButtonStyle,
          opacity: activeLobbyId ? 1 : 0.55,
          cursor: activeLobbyId ? "pointer" : "not-allowed",
        }}
        title="Undo"
      >
        Undo
      </button>
    </div>
  );
}


