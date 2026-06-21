import { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { socket } from '../../socket/socket';
import StickerMenu from '../sticker/stickerMenu';
import ImageSearch from '../canvas/ImageSearch';
import { pbnColorToCss, swatchTextColor } from '../../socket/PBNEvents';
import '../../App.css';

const WHEEL_RADIUS = 80;
const ITEM_SIZE = 68;
const COLORS = ['#000000', '#ffffff', '#1a6dd4', '#e23333', '#4caf50', '#ff9800', '#e91e8c', '#F5D800'];
const SIZES = [4, 12, 24];

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
    pbnPalette,
  } = useContext(AppContext);

  // In PBN mode (palette loaded) the colour submenu shows the PBN colours with their
  // numbers instead of the standard swatches.
  const usingPbn = Array.isArray(pbnPalette) && pbnPalette.length > 0;
  const colorSwatches: { bg: string; label: string; text?: string }[] = usingPbn
    ? pbnPalette.map((e: { index: number; color: { r: number; g: number; b: number } }) => ({
        bg: pbnColorToCss(e.color),
        label: String(e.index),
        text: swatchTextColor(e.color),
      }))
    : COLORS.map((c) => ({ bg: c, label: '' }));

  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [activeSub, setActiveSub] = useState<'color' | 'size' | 'sticker' | 'image' | null>(null);

  // State für den aktuell fokussierten Eintrag im Hauptmenü
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // State für den aktuell fokussierten Eintrag im submenü
  const [subIndex, setSubIndex] = useState<number>(0);

  // Erst true, sobald per Tastatur navigiert wurde — verhindert, dass das erste
  // Element ohne Interaktion als "fokussiert" markiert wird (Maus-Nutzung).
  const [navigated, setNavigated] = useState<boolean>(false);

  // Trigger-State, um ein Enter-Signal an Sticker/Bilder-Komponenten weiterzureichen
  const [triggerSelect, setTriggerSelect] = useState<boolean>(false);

  const wheelRef = useRef<HTMLDivElement>(null);

  // Rechte Mausklick --> Shortcut zum Öffnen
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
      setActiveIndex(0); // Setzt den Fokus beim Öffnen zurück auf das erste Element
      
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

  // Fokus im Submenü zurücksetzen, sobald sich activeSub ändert
  useEffect(() => {
    setSubIndex(0);
    setTriggerSelect(false);
    setNavigated(false);
  }, [activeSub]);

  const toggleMirror = () => {
    const next = !mirrorMode;
    setMirrorMode(next);
    if (activeLobbyId) socket.emit("toggleMirrorMode", activeLobbyId);
  };

  const handleStickerSelected = () => {
    setVisible(false); 
    setActiveSub(null);
  };

  const deactivateStickerMode = () => {
    setStickerModeActive(false);
    setTool('pen');      
    setActiveSub(null);  
  };

  // Wird aufgerufen, wenn im Bilder-Submenü ein Bild ausgewählt wurde
  const handleImageSelected = () => {
    setVisible(false);
    setActiveSub(null);
  };

  const menuItems = [
    { id: 'pen', icon: '✏️', label: 'Stift', action: () => { setTool('pen'); setVisible(false); } },
    { id: 'color', icon: '🎨', label: 'Farbe', action: () => setActiveSub('color') },
    { id: 'size', icon: '⬤', label: 'Größe', action: () => setActiveSub('size') },
    { id: 'sticker', icon: '✨', label: 'Sticker', action: () => { setStickerModeActive(true); setTool('shape'); setActiveSub('sticker'); } },
    { id: 'image', icon: '🖼️', label: 'Bilder', action: () => setActiveSub('image') },
    { id: 'mirror', icon: '🪞', label: 'Mirror', action: toggleMirror, active: mirrorMode },
  ];

  // Tastatursteuerung für Navigation im Hauptmenü UND in den Submenüs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;

      // Hauptmenü (ohne sub aktiv)
      if (activeSub === null) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setActiveIndex((prevIndex) => (prevIndex + 1) % menuItems.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          menuItems[activeIndex].action();
        }
        return;
      }

      // submenü colorselector
      if (activeSub === 'color') {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setNavigated(true);
          setSubIndex((prev) => (prev + 1) % colorSwatches.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          setCurrentColor(colorSwatches[subIndex].bg);
          setActiveSub(null);
          setVisible(false);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setActiveSub(null);
        }
        return;
      }

      // submenü stiftgröße
      if (activeSub === 'size') {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setNavigated(true);
          setSubIndex((prev) => (prev + 1) % SIZES.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          setPenWidth(SIZES[subIndex]);
          setActiveSub(null);
          setVisible(false);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setActiveSub(null);
        }
        return;
      }

      // submenü sticker
      if (activeSub === 'sticker') {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          // Erhöht den Index fortlaufend; das Modulo-Limit wird im StickerMenu berechnet
          setSubIndex((prev) => prev + 1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          setTriggerSelect(true); // Signalisiert Auswahl
        } else if (e.key === 'Escape') {
          e.preventDefault();
          deactivateStickerMode();
        }
        return;
      }

      // submenü bilder
      if (activeSub === 'image') {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          // Erhöht den Index fortlaufend; das Modulo-Limit wird im ImageSearch berechnet
          setSubIndex((prev) => prev + 1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          setTriggerSelect(true); // Signalisiert ImageSearch die Auswahl
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setActiveSub(null);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, activeIndex, subIndex, activeSub, menuItems, pbnPalette]);

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

            const isKeyboardFocused = i === activeIndex;

            return (
              <button
                key={item.id}
                onClick={item.action}
                style={{
                  ...itemStyle,
                  left: x,
                  top: y,
                  border: isKeyboardFocused
                    ? '3px solid #1a6dd4' 
                    : (item.id === 'pen' && tool === 'pen') || item.active 
                      ? '2px solid #F5D800' 
                      : '1px solid rgba(0,0,0,0.05)',
                  transform: isKeyboardFocused ? 'scale(1.18)' : 'scale(1)',
                  zIndex: isKeyboardFocused ? 100 : 1
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
          <div style={{ ...colorGridStyle, maxHeight: '160px', overflowY: 'auto', padding: '6px' }}>
            {colorSwatches.map((sw, i) => {
              const isKeyboardFocused = navigated && i === subIndex;
              return (
                <div
                  key={`${sw.bg}-${i}`}
                  onClick={() => {
                    setCurrentColor(sw.bg);
                    setActiveSub(null);
                    setVisible(false);
                  }}
                  style={{
                    ...colorCircleStyle,
                    background: sw.bg,
                    color: sw.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px',
                    outline: isKeyboardFocused
                      ? '3px solid #1a6dd4'
                      : currentColor === sw.bg
                        ? '2px solid #1a6dd4'
                        : '1px solid rgba(0,0,0,0.2)',
                    outlineOffset: '2px',
                    transform: isKeyboardFocused ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.15s ease, outline 0.15s ease'
                  }}
                >
                  {sw.label}
                </div>
              );
            })}
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
            {SIZES.map((s, i) => {
              const isKeyboardFocused = navigated && i === subIndex;
              return (
                <div 
                  key={s} 
                  onClick={() => { 
                    setPenWidth(s); 
                    setActiveSub(null);
                    setVisible(false); 
                  }} 
                  style={{ 
                    ...sizeCircleStyle, 
                    width: s + 40, height: s + 40, 
                    border: isKeyboardFocused
                      ? '3px solid #1a6dd4'
                      : penWidth === s 
                        ? '2px solid #1a6dd4' 
                        : '1px solid #ccc',
                    transform: isKeyboardFocused ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.15s ease, border 0.15s ease'
                  }}
                >
                  <div style={{ width: s, height: s, background: 'black', borderRadius: '50%' }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ANSICHT 4: UNTERMENÜ STICKER */}
      {activeSub === 'sticker' && (
        <div style={{ ...squareContainerStyle, width: '280px', height: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>Sticker</span>
            <button onClick={deactivateStickerMode} style={exitStickerModeButtonStyle}>Mode beenden</button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            <StickerMenu 
              onSelect={handleStickerSelected} 
              focusedIndex={subIndex}
              triggerSelect={triggerSelect}
            />
          </div>
        </div>
      )}

      {/* ANSICHT 5: UNTERMENÜ BILDER */}
      {activeSub === 'image' && (
        <div style={{ ...squareContainerStyle, width: '500px', height: '580px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>Bilder suchen</span>
            <button onClick={() => setActiveSub(null)} style={backButtonStyle}>Zurück</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            <ImageSearch 
              onSelect={handleImageSelected} 
              focusedIndex={subIndex}
              triggerSelect={triggerSelect}
            />
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
  transition: 'transform 0.15s ease, border 0.15s ease'
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