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

import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Auth from './components/auth/Auth';

function AuthPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn({ email, password }: { email: string; password: string; remember: boolean }) {
    setError(null);
    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }
      navigate('/');
    } catch {
      setError('Could not reach server');
    }
  }

  async function handleRegister({ name, email, password }: { name: string; email: string; password: string }) {
    setError(null);
    try {
      const res = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, username: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.error) ? data.error[0]?.message : data.error;
        setError(msg ?? 'registration error');
        return;
      }
      navigate('/');
    } catch {
      setError('could not reach server');
    }
  } return (
    <>
      {error && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#fee2e2', color: '#991b1b', padding: '10px 20px', borderRadius: 8, zIndex: 100, fontWeight: 600 }}>
          {error}
        </div>
      )}
      <Auth
        initialView="signin"
        brandName="RateMal"
        brandLetter="R"
        onSignIn={handleSignIn}
        onRegister={handleRegister}
        onForgotPassword={() => {}}
      />
    </>
  );
}





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

      <BrowserRouter>
        <nav>
          <Link to="/login">Login</Link>
        </nav>

        <Routes>
          <Route path="/login" element={<AuthPage />} />
        </Routes>
      </BrowserRouter>
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