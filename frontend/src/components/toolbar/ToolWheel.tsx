import { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { socket } from '../../socket/socket';
import StickerMenu from '../sticker/stickerMenu';
import '../../App.css';

// --- Konfiguration ---
const WHEEL_RADIUS = 80;
const ITEM_SIZE = 68;
const COLORS = ['#000000', '#ffffff', '#1a6dd4', '#e23333', '#4caf50', '#ff9800', '#e91e8c', '#F5D800'];

interface ToolWheelProps {
  stickerModeActive: boolean;
  setStickerModeActive: (active: boolean) => void;
}

export default function ToolWheel({ stickerModeActive, setStickerModeActive }: ToolWheelProps) {
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
  const [activeSub, setActiveSub] = useState<'color' | 'size' | 'sticker' | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Rechtsklick-Steuerung / Shortcut zum Öffnen
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
      
      // CRITICAL: Wenn der Sticker-Modus aktiv ist, direkt ins Sticker-Submenü springen!
      if (stickerModeActive) {
        setActiveSub('sticker');
      } else {
        setActiveSub(null);
      }
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
  }, [stickerModeActive]);

  const toggleMirror = () => {
    const next = !mirrorMode;
    setMirrorMode(next);
    if (activeLobbyId) socket.emit("toggleMirrorMode", activeLobbyId);
  };

  // Callback, wenn im verlinkten StickerMenu eine Auswahl getroffen wurde
  const handleStickerSelected = () => {
    setVisible(false); // Schließt das ToolWheel sofort nach der Auswahl
  };

  // Funktion zum Beenden des Sticker-Modus
  const deactivateStickerMode = () => {
    setStickerModeActive(false);
    setTool('pen');      // Setzt das Werkzeug zurück auf Default (Stift)
    setActiveSub(null);  // Schaltet das Untermenü zurück zur Hauptansicht
  };

  const menuItems = [
    { id: 'pen', icon: '✏️', label: 'Stift', action: () => { setTool('pen'); setVisible(false); } },
    { id: 'color', icon: '🎨', label: 'Farbe', action: () => setActiveSub('color') },
    { id: 'size', icon: '⬤', label: 'Größe', action: () => setActiveSub('size') },
    { id: 'sticker', icon: '✨', label: 'Sticker', action: () => { setStickerModeActive(true); setTool('shape'); setActiveSub('sticker'); } },
    { id: 'grid', icon: '▦', label: 'Grid', action: () => { setShowGrid(!showGrid); setVisible(false); } },
    { id: 'mirror', icon: '🪞', label: 'Mirror', action: toggleMirror, active: mirrorMode },
  ];

  if (!visible) return null;

  return (
    <div ref={wheelRef} style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 }}>
      
      {/* ANSICHT 1: DAS RUNDE TOOLWHEEL */}
      {activeSub === null && (
        <>
          <div style={wheelContainerStyle} />
          <div onClick={() => setVisible(false)} style={centerStyle}>✕</div>
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
        </>
      )}

      {/* ANSICHT 2: UNTERMENÜ FARBEN */}
      {activeSub === 'color' && (
        <div style={squareContainerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>Farbe wählen</span>
            <button onClick={() => setActiveSub(null)} style={backButtonStyle}>Zurück</button>
          </div>
          <div style={colorGridStyle}>
            {COLORS.map(c => (
              <div 
                key={c} 
                onClick={() => { 
                  setCurrentColor(c); 
                  setActiveSub(null); 
                  setVisible(false); 
                }} 
                style={{ 
                  ...colorCircleStyle, 
                  background: c, 
                  outline: currentColor === c ? '2px solid #1a6dd4' : '1px solid rgba(0,0,0,0.2)',
                  outlineOffset: '2px'
                }} 
              />
            ))}
          </div>
          <input type="color" value={currentColor} onChange={(e) => setCurrentColor(e.target.value)} style={{ width: '100%', marginTop: '12px', cursor: 'pointer' }} />
        </div>
      )}

      {/* ANSICHT 3: UNTERMENÜ GRÖSSE */}
      {activeSub === 'size' && (
        <div style={squareContainerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>Größe wählen</span>
            <button onClick={() => setActiveSub(null)} style={backButtonStyle}>Zurück</button>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            {[4, 12, 24].map(s => (
              <div 
                key={s} 
                onClick={() => { 
                  setPenWidth(s); 
                  setActiveSub(null);
                  setVisible(false); 
                }} 
                style={{ ...sizeCircleStyle, width: s + 40, height: s + 40, border: penWidth === s ? '2px solid #1a6dd4' : '1px solid #ccc' }}
              >
                <div style={{ width: s, height: s, background: 'black', borderRadius: '50%' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANSICHT 4: UNTERMENÜ STICKER (Viereckiges Container-Fenster mit Scrollbereich) */}
      {activeSub === 'sticker' && (
        <div style={{ ...squareContainerStyle, width: '280px', height: '320px' }}> {/* Etwas geräumiger für Stickerkategorien */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>Sticker</span>
            <button onClick={deactivateStickerMode} style={exitStickerModeButtonStyle}>Mode beenden</button>
          </div>
          
          {/* Scrollbarer Content für deine Sticker-Kategorien */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            <StickerMenu onSelect={handleStickerSelected} />
          </div>
        </div>
      )}

    </div>
  );
}

// --- Styles ---
const itemStyle: React.CSSProperties = {
  position: 'absolute', width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.2)',
  transition: 'transform 0.2s ease'
};

const centerStyle: React.CSSProperties = {
  position: 'absolute', left: -20, top: -20, width: 40, height: 40, borderRadius: '50%',
  background: '#1a6dd4', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', boxShadow: '0 4px 12px rgba(26, 109, 212, 0.4)', zIndex: 10, border: '2px solid white'
};

const wheelContainerStyle: React.CSSProperties = {
  position: 'absolute', width: '250px', height: '250px', background: 'rgba(30, 30, 30, 0.8)',
  backdropFilter: 'blur(15px)', borderRadius: '50%', transform: 'translate(-50%, -50%)',
  boxShadow: '0 15px 50px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)'
};

const squareContainerStyle: React.CSSProperties = {
  position: 'absolute', width: '240px', height: '240px', 
  transform: 'translate(-50%, -50%)',
  background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 15px 50px rgba(0,0,0,0.3)',
  border: '1px solid rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column',
  justifyContent: 'space-between', fontFamily: 'sans-serif'
};

const backButtonStyle: React.CSSProperties = {
  background: '#f0f0f0', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#555'
};

const exitStickerModeButtonStyle: React.CSSProperties = {
  background: '#ffebee', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', color: '#c62828'
};

const colorGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' };
const colorCircleStyle: React.CSSProperties = { width: '42px', height: '42px', borderRadius: '8px', cursor: 'pointer', boxShadow: 'inset 0 0 2px rgba(0,0,0,0.2)' };
const sizeCircleStyle: React.CSSProperties = { borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f0f0f0' };