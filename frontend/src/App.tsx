import { useContext, useState } from 'react';
import './App.css';
import CanvasPage from "./components/pages/CanvasPage";
import StartPage from './components/pages/StartPage';
import TopBar from './components/pages/TopBar';
import Auth from './components/auth/Auth';
import { AppContext } from './context/AppContext';

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
  const [view, setView] = useState<'home' | 'canvas'>('home');
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar view={view} onBack={() => setView('home')} onLoginClick={() => setIsAuthOpen(true)} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {view === 'home' ? (
          <StartPage onSelectMode={() => setView('canvas')} />
        ) : (
          <CanvasPage />
        )}
      </main>

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
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