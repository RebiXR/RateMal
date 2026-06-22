import { useContext, useState } from 'react';
import './App.css';
import CanvasPage from "./components/pages/CanvasPage";
import StartPage, { type GameMode } from './components/pages/StartPage';
import TopBar from './components/pages/TopBar';
import Auth from './components/auth/Auth';
import { AppContext } from './context/AppContext';
import MemoryPage from './components/memory/MemoryPage';

function AuthModal({ onClose }: { onClose: () => void }) {
  const { refreshUser } = useContext(AppContext);
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
      await refreshUser();
      onClose();
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
      await refreshUser();
      onClose();
    } catch {
      setError('could not reach server');
    }
  }

  return (
    <>
      {error && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#fee2e2', color: '#991b1b', padding: '10px 20px', borderRadius: 8, zIndex: 10000, fontWeight: 600 }}>
          {error}
        </div>
      )}
      <Auth
        overlay
        onClose={onClose}
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
  const [view, setView] = useState<'home' | 'canvas' | 'memory'>('home');
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const openMode = (mode: GameMode) => {
    if (mode === 'memory') {
      setSelectedMode(null);
      setView('memory');
      return;
    }
    setSelectedMode(mode);
    setView('canvas');
  };

  const goHome = () => {
    setView('home');
    setSelectedMode(null);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <a className="skip-link" href="#main-content">
        Zum Inhalt springen
      </a>
      <TopBar
        view={view}
        selectedMode={selectedMode}
        onBack={goHome}
        onLoginClick={() => setIsAuthOpen(true)}
        onMemoryClick={() => openMode('memory')}
      />

      <main id="main-content" tabIndex={-1} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {view === 'home' ? (
          <StartPage onSelectMode={openMode} />
        ) : view === 'canvas' ? (
          <CanvasPage />
        ) : (
          <MemoryPage />
        )}
      </main>

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
    </div>
  );
}
