import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { socket } from '../../socket/socket';
import '../../App.css';

// --- Konfiguration ---
const WHEEL_RADIUS = 80;
const ITEM_SIZE = 68;
const COLORS = ['#000000', '#ffffff', '#1a6dd4', '#e23333', '#4caf50', '#ff9800', '#e91e8c', '#F5D800'];

export default function ToolWheel({ onOpenStickers}: { onOpenStickers: () => void }) {
  const { 
    currentColor, setCurrentColor, 
    tool, setTool, 
    mirrorMode, setMirrorMode, 
    activeLobbyId, 
    penWidth, setPenWidth,
    showGrid, setShowGrid 
  } = useContext(AppContext);

  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [activeSub, setActiveSub] = useState<'color' | 'size' | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Rechtsklick-Steuerung
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
      setActiveSub(null);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (wheelRef.current && !wheelRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMirror = () => {
    const next = !mirrorMode;
    setMirrorMode(next);
    if (activeLobbyId) socket.emit("toggleMirrorMode", activeLobbyId);
  };

  const menuItems = [
    { id: 'pen', icon: '✏️', label: 'Stift', action: () => { setTool('pen'); setVisible(false); } },
    { id: 'color', icon: '🎨', label: 'Farbe', action: () => setActiveSub('color') },
    { id: 'size', icon: '⬤', label: 'Größe', action: () => setActiveSub('size') },
    { id: 'sticker', icon: '✨', label: 'Sticker', action: () => { onOpenStickers(); setTool('shape'); setVisible(false); } },
    { id: 'grid', icon: '▦', label: 'Grid', action: () => { setShowGrid(!showGrid); setVisible(false); } },
    { id: 'mirror', icon: '🪞', label: 'Mirror', action: toggleMirror, active: mirrorMode },
  ];

  if (!visible) return null;








  return (
    <div ref={wheelRef} style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 }}>
      {/* Zentrales Schließen X */}

      <div style={wheelContainerStyle} />
      <div onClick={() => setVisible(false)} style={centerStyle}>✕</div>

      {/* Buttons im Kreis */}
      {menuItems.map((item, i) => {
        const angle = (i / menuItems.length) * 2 * Math.PI - Math.PI / 2;
        const x = Math.cos(angle) * WHEEL_RADIUS - ITEM_SIZE / 2;
        const y = Math.sin(angle) * WHEEL_RADIUS - ITEM_SIZE / 2;

        return (
          <button
            key={item.id}
            onClick={item.action}
            style={{
              ...itemStyle,
              left: x, top: y,
              border: (item.id === 'pen' && tool === 'pen') || item.active ? '2px solid #F5D800' : '1px solid rgba(0,0,0,0.05)'
            }}
          >
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
          </button>
        );
      })}

      {/* Untermenü: Farben (erscheint rechts neben dem Wheel) */}
      {activeSub === 'color' && (
        <div style={{ ...subMenuStyle, left: WHEEL_RADIUS + 20, top: -60 }}>
          <div style={colorGridStyle}>
            {COLORS.map(c => (
              <div key={c} onClick={() => { setCurrentColor(c); setActiveSub(null); setVisible(false); }} 
                   style={{ ...colorCircleStyle, background: c, border: currentColor === c ? '2px solid white' : 'none' }} />
            ))}
          </div>
          <input type="color" value={currentColor} onChange={(e) => setCurrentColor(e.target.value)} style={{ width: '100%', marginTop: '10px' }} />
        </div>
      )}

      {/* Untermenü: Pen Size */}
      {activeSub === 'size' && (
        <div style={{ ...subMenuStyle, left: WHEEL_RADIUS + 20, top: -20, display: 'flex', gap: '10px' }}>
          {[4, 12, 24].map(s => (
            <div key={s} onClick={() => { setPenWidth(s); setVisible(false); }} 
                 style={{ ...sizeCircleStyle, width: s+10, height: s+10, border: penWidth === s ? '2px solid #1a6dd4' : '1px solid #ccc' }}>
              <div style={{ width: s, height: s, background: 'black', borderRadius: '50%' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Ändere diese Styles in deiner ToolWheel.tsx
const itemStyle: React.CSSProperties = {
  position: 'absolute', 
  width: ITEM_SIZE, 
  height: ITEM_SIZE, 
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.9)', 
  backdropFilter: 'blur(10px)',
  cursor: 'pointer', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)', 
  border: '1px solid rgba(255,255,255,0.2)',
  transition: 'transform 0.2s ease'
};

const centerStyle: React.CSSProperties = {
  position: 'absolute', 
  left: -20, top: -20, 
  width: 40, height: 40, 
  borderRadius: '50%',
  background: '#1a6dd4', 
  color: 'white', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center',
  cursor: 'pointer', 
  boxShadow: '0 4px 12px rgba(26, 109, 212, 0.4)',
  zIndex: 10,
  border: '2px solid white'
};


const wheelContainerStyle: React.CSSProperties = {
  position: 'absolute',
  width: '250px',
  height: '250px',
  background: 'rgba(30, 30, 30, 0.8)', //
  backdropFilter: 'blur(15px)',
  borderRadius: '50%',
  transform: 'translate(-50%, -50%)', //zentriert am Mauszeiger
  boxShadow: '0 15px 50px rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)'

};

const subMenuStyle: React.CSSProperties = {
  position: 'absolute', background: 'white', padding: '12px', borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.2)', minWidth: '120px'
};

const colorGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' };
const colorCircleStyle: React.CSSProperties = { width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer', boxShadow: 'inset 0 0 2px rgba(0,0,0,0.2)' };
const sizeCircleStyle: React.CSSProperties = { borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f0f0f0' };







/*
// --- Styles ---
const itemStyle: React.CSSProperties = {
  position: 'absolute', width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: '50%',
  background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: 'none', transition: 'transform 0.1s'
};

const centerStyle: React.CSSProperties = {
  position: 'absolute', left: -15, top: -15, width: 30, height: 30, borderRadius: '50%',
  background: '#333', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', fontSize: '12px', zIndex: 10
};


*/