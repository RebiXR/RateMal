import { useContext } from 'react'
import './App.css'
import Prompts from './components/canvas/Prompts';
import Canvas from "./components/canvas/Canvas";
import ColorPicker from './components/toolbar/ColorPicker';
import LobbySelector from './components/canvas/LobbySelector';
import { twoKeyControls } from './input/twoKeyControls';
import GuessingGameCreator from './components/canvas/GuessingGame';
import ToolBar from './components/toolbar/Toolbar';
import { AppContext } from "./context/AppContext";

const TOP_BAR_HEIGHT = 72;
//const BOTTOM_BAR_HEIGHT = 48;
const LEFT_SIDEBAR_WIDTH = 60;
const RIGHT_SIDEBAR_WIDTH = 56; // schmaler

function App() {
  const { tool, currentColor, setCurrentColor,setPenWidth, penWidth, setStickerSize, stickerSize } = useContext(AppContext);
  twoKeyControls();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#e7efe9'
    }}>

      {/* 1. TOP-BAR — Lobby + Prompts + GuessingGame */}
      <div style={{
        height: TOP_BAR_HEIGHT,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '0 24px',
        background: 'rgba(255,255,255,0.95)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
        zIndex: 10,
        flexWrap: 'wrap'
      }}>
        <LobbySelector />
        <Prompts />
        {/* Trenner */}
        <div style={{ width: '1px', height: '32px', background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />
        <GuessingGameCreator />
      </div>

      {/* 2. MITTLERE REIHE */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LINKE SIDEBAR */}
        <div style={{
          width: LEFT_SIDEBAR_WIDTH,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          gap: '8px',
          background: 'rgba(255,255,255,0.92)',
          borderRight: '1px solid rgba(0,0,0,0.07)',
          //boxShadow: '1px 0 6px rgba(0,0,0,0.04)',
          //zIndex: 10,
        }}>
          <ToolBar />
        </div>

        {/* CANVAS */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Canvas />
        </div>

        {/* RECHTE SIDEBAR */}
        <div style={{
          width: RIGHT_SIDEBAR_WIDTH,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '14px 0',
          gap: '10px',
          background: 'rgba(255,255,255,0.92)',
          borderLeft: '1px solid rgba(0,0,0,0.07)',
          //boxShadow: '-1px 0 6px rgba(0,0,0,0.04)',
          //zIndex: 10,
          //overflowY: 'auto',
        }}>
          {tool === "pen" && (
            <>
              {/* Stiftgrößen */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>

               {[4, 12, 24].map((size) => (
                  <button
                    key={size}
                    onClick={() => setPenWidth(size)} // set strongness
                    style={{
                      width: '40px', 
                      height: '40px',
                      borderRadius: '50%',
                      border: penWidth === size ? '2px solid #3b82f6' : '1px solid transparent', // Blauer Ring wenn aktiv
                      background: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    {/* Der visuelle Punkt im Button */}
                    <div style={{ 
                      width: `${size}px`, 
                      height: `${size}px`, 
                      borderRadius: '50%', 
                      background: '#333' 
                    }} />
                  </button>
                ))}
              </div>

              <div style={{ width: '36px', height: '1px', background: '#eee', margin: '10px 0' }} />
            </>
          )}



          {(tool ==="pen" || tool=== "shape") ? /* Farben + Farbenrad-Button */(
              <ColorPicker currentColor={currentColor} setCurrentColor={setCurrentColor} />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', color: '#ccc', writingMode: 'vertical-rl', letterSpacing: '0.05em' }}>
                Optionen
              </span>
            </div>
          )}


          {/* SEKTION: STICKER-GRÖSSE (Nur bei Shape / Sticker) */}
          {tool === "shape" && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '12px',
              paddingBottom: '20px' 
            }}>
              {/* Plus Button */}
              <button 
                onClick={() => setStickerSize(Math.min(300, stickerSize + 20))}
                style={{ width: '40px', height: '40px', fontSize: '20px', borderRadius: '8px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}
              >
                ＋
              </button>

              {/* Der vertikale Slider */}
              <input 
                type="range" 
                min="20" 
                max="300" 
                value={stickerSize} 
                onChange={(e) => setStickerSize(parseInt(e.target.value))}
                style={{ 
                  WebkitAppearance: 'slider-vertical',
                  appearance: 'slider-vertical' as any, // Für Browser-Unterstützung
                  width: '8px',
                  height: '100px',
                  cursor: 'pointer'
                }} 
              />

              {/* Minus Button */}
              <button 
                onClick={() => setStickerSize(Math.max(20, stickerSize - 20))}
                style={{ width: '40px', height: '40px', fontSize: '20px', borderRadius: '8px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}
              >
                －
              </button>
              
              <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{stickerSize}px</span>
            </div>
          )}












        </div>

      </div>

      {/* 3. BOTTOM-BAR — kann leer bleiben oder für spätere Infos genutzt werden */}
      

    </div>
  )
}

export default App;