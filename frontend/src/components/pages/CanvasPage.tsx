import { useContext, useState } from 'react';
import '../../App.css';

import Canvas from '../canvas/Canvas';
import ToolWheel from '../toolbar/ToolWheel';
import { AppContext } from '../../context/AppContext';

export default function CanvasPage() {
  const { showGrid } = useContext(AppContext);
  
  // Trackt, ob der Sticker-Modus global aktiv ist
  const [stickerModeActive, setStickerModeActive] = useState(false);

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', overflow: 'hidden' }}>
      
      <div style={{ flex: 1, position: 'relative', background: '#e7efe9' }}>
        {showGrid && <div className="grid-overlay" />} 
        <Canvas />
      </div>

      {/* Das ToolWheel übernimmt jetzt das gesamte Rendering an Ort und Stelle */}
      <ToolWheel 
        stickerModeActive={stickerModeActive} 
        setStickerModeActive={setStickerModeActive} 
      />
    </div>
  );
}