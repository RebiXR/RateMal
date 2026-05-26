import React from 'react';

interface StartPageProps {
  onSelectMode: (mode: 'canvas' | 'guessing-game') => void;
}

export default function StartPage({ onSelectMode }: StartPageProps) {
  return (
    <div style={{ 
      padding: '40px 24px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      animation: 'fadeIn 0.5s ease-out' 
    }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Jetzt loslegen</h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>Wähle einen Zeichenmodus.</p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '24px' 
      }}>
        
        {/* Hauptkarte: Gemeinsam Zeichnen */}
        <div 
          onClick={() => onSelectMode('canvas')}
          style={{ 
            gridColumn: 'span 2',
            background: '#1a6dd4',
            color: 'white',
            padding: '40px',
            borderRadius: '24px',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(26,109,212,0.2)'
          }}
          className="mode-card-main"
        >
          <div style={{ fontSize: '40px', marginBottom: '20px' }}>👥</div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>Gemeinsam zeichnen</h2>
          <p style={{ opacity: 0.9, fontSize: '18px' }}>Zusammen auf einem geteilten Canvas in Echtzeit.</p>
        </div>

        {/* Karte: Rate Spiel */}
        <div 
          onClick={() => onSelectMode('guessing-game')}
          style={{ 
            background: '#fffbeb',
            border: '2px solid #fef3c7',
            padding: '32px',
            borderRadius: '24px',
            cursor: 'pointer'
          }}
          className="mode-card-sub"
        >
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎨</div>
          <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#92400e', marginBottom: '8px' }}>Rate-Spiel</h3>
          <p style={{ color: '#b45309' }}>Erkenne, was deine Freunde zeichnen.</p>
        </div>

        {/* Platzhalter für weitere Spiele */}
        <div style={{ 
          background: 'white', 
          border: '1px solid rgba(0,0,0,0.05)', 
          padding: '32px', 
          borderRadius: '24px',
          opacity: 0.6
        }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🪞</div>
          <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>Spiegel-Zeichnen</h3>
          <p style={{ color: '#666' }}>Symmetrische Kunst (Bald verfügbar).</p>
        </div>

      </div>
    </div>
  );
}