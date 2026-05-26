import { useContext, useState } from 'react';
import './App.css';
import Canvas from "./components/canvas/Canvas";
import ToolWheel from './components/toolbar/ToolWheel';
import Prompts from './components/canvas/Prompts';
import LobbySelector from './components/canvas/LobbySelector';
import GuessingGameCreator from './components/canvas/GuessingGame';
import { AppContext } from "./context/AppContext";
import StickerMenu from './components/sticker/stickerMenu';


import CanvasPage from "./components/pages/CanvasPage";
import StartPage from './components/pages/StartPage';
import TopBar from './components/pages/TopBar';





export default function App() {
  const [view, setView] = useState<'home' | 'canvas'>('home');

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Top Bar ist immer da, passt sich aber der View an */}
      <TopBar view={view} onBack={() => setView('home')} />

      {/* Hauptinhalt je nach View */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {view === 'home' ? (
          <StartPage onSelectMode={() => setView('canvas')} />
        ) : (
          <CanvasPage />
        )}
      </main>
      
    </div>
  );
}


/*
export default function App() {

  //const { stickerSize, setStickerSize, showGrid } = useContext(AppContext);
  //const [stickerOpen, setStickerOpen] = useState(false);
  const [view, setView] = useState<'home' | 'canvas'>('home');

  return (
    <div className="main-layout">
      <TopBar currentView={view} onBack={() => setView('home')} />
      
      <main style={{ flex: 1, position: 'relative' }}>
        {view === 'home' ? (
          <StartPage onSelectMode={() => setView('canvas')} />
        ) : (
          <CanvasPage />
        )}
      </main>
    </div>
  );
}*/