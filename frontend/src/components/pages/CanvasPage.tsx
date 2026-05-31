import { useContext, useState } from 'react';
import '../../App.css';

import Canvas from '../canvas/Canvas';
import ToolWheel from '../toolbar/ToolWheel';
import Prompts from '../canvas/Prompts';
import GuessingGameCreator from '../canvas/GuessingGame';
import { AppContext } from '../../context/AppContext';
import StickerMenu from '../sticker/stickerMenu';

export default function CanvasPage() {
  const { stickerSize, setStickerSize, showGrid } = useContext(AppContext);
  const [stickerOpen, setStickerOpen] = useState(false);


  const toggleStickers = () => {
  setStickerOpen(prev => !prev);
};


  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', overflow: 'hidden' }}>
      
      <div style={{ flex: 1, position: 'relative', background: '#e7efe9' }}>
        {showGrid && <div className="grid-overlay" />} 
        <Canvas />
      </div>

      {stickerOpen && (
        <div className="sticker-overlay-container">
          <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Sticker</span>
              <button onClick={() => setStickerOpen(false)} className="btn" style={{ borderRadius: '50%' }}>✕</button>
            </div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#666' }}>Größe: {stickerSize}px</label>
            <input 
              type="range" min="20" max="300" value={stickerSize} 
              onChange={(e) => setStickerSize(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#1a6dd4', marginTop: '8px' }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
            <StickerMenu /> 
          </div>
        </div>
      )}

      <ToolWheel onOpenStickers={() => setStickerOpen(true)} />
    </div>
  );




}