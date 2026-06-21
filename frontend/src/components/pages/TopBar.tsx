import LobbyManager from '../lobby/LobbyManager';
import LobbyParticipants from '../lobby/LobbyParticipants';
import Prompts from '../canvas/Prompts';
import GuessingGameCreator from '../canvas/GuessingGame';
import PBNGame from '../paintByNumbers/PBNGame';
import SavedDrawingsGallery from '../canvas/SavedDrawingsGallery';
import type { GameMode } from './StartPage';

interface TopBarProps {
  view: 'home' | 'canvas';
  selectedMode?: GameMode | null;
  onBack: () => void;
  onLoginClick?: () => void;
}

export default function TopBar({ view, selectedMode, onBack, onLoginClick }: TopBarProps) {
  return (
    <div style={{ 
      height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      padding: '0 24px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(0,0,0,0.08)', zIndex: 1000 
    }}>
      
      {/* LINKS: Logo & Back-Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 0 0' }}>
        {view === 'canvas' && (
          <button onClick={onBack} className="btn" style={{ padding: '8px 15px', marginRight: '10px' }}>
            ← Zurück
          </button>
        )}
        <div style={{ 
          width: '40px', height: '40px', background: '#1a6dd4', borderRadius: '10px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' 
        }}>R</div>
        <span style={{ fontWeight: 800, color: '#333', fontSize: '18px', letterSpacing: '-0.5px' }}>
          Rate<span style={{ color: '#1a6dd4' }}>Mal</span>
        </span>
      </div>

      {/* MITTE: Lobby (Nur im Spiel) */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flex: '1 0 0' }}>
        {view === 'canvas' && (
          <>
            <div className="top-bar-element"><LobbyManager /></div>
            <div className="top-bar-element"><LobbyParticipants /></div>
          </>
        )}
      </div>

      {/* RECHTS: Game-Controls (Nur im Spiel, abhängig vom gewählten Modus) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', flex: '1 0 0' }}>
        {view === 'canvas' && (
          <>
            {selectedMode === 'group-draw' && (
              <div className="top-bar-element"><Prompts /></div>
            )}
            {selectedMode === 'guessing-game' && (
              <div className="top-bar-element"><GuessingGameCreator /></div>
            )}
            {selectedMode === 'paint-by-numbers' && (
              <div className="top-bar-element"><PBNGame /></div>
            )}
            <div className="top-bar-element"><SavedDrawingsGallery /></div>
          </>
        )}
        {view === 'home' && (
          <>
            <button
              onClick={onLoginClick}
              style={{
                background: '#0a3cff',
                color: '#fff',
                padding: '10px 24px',
                fontWeight: 700,
                fontSize: '15px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              Login
            </button>
            <button className="btn btn-secondary">?</button>
          </>
        )}
      </div>
    </div>
  );
}