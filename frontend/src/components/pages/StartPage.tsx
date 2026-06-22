export type GameMode = 'group-draw' | 'guessing-game' | 'paint-by-numbers' | 'memory';

interface StartPageProps {
  onSelectMode: (mode: GameMode) => void;
}

export default function StartPage({ onSelectMode }: StartPageProps) {
  return (
    <div
      style={{
        padding: "40px 24px",
        maxWidth: "1200px",
        margin: "0 auto",
        animation: "fadeIn 0.5s ease-out",
      }}
    >
      <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}>
        Jetzt loslegen
      </h1>
      <p style={{ color: "#666", marginBottom: "40px" }}>Waehle einen Spielmodus.</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
        }}
      >
        <div
          onClick={() => onSelectMode("group-draw")}
          style={{
            gridColumn: "span 2",
            background: "#1a6dd4",
            color: "white",
            padding: "40px",
            borderRadius: "24px",
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(26,109,212,0.2)",
          }}
          className="mode-card-main"
        >
          <div style={{ fontSize: "40px", marginBottom: "20px" }}>Team</div>
          <h2 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "12px" }}>
            Gemeinsam zeichnen
          </h2>
          <p style={{ opacity: 0.9, fontSize: "18px" }}>
            Zusammen auf einem geteilten Canvas in Echtzeit.
          </p>
        </div>

        <div
          onClick={() => onSelectMode("guessing-game")}
          style={{
            background: "#fffbeb",
            border: "2px solid #fef3c7",
            padding: "32px",
            borderRadius: "24px",
            cursor: "pointer",
          }}
          className="mode-card-sub"
        >
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>Rate</div>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#92400e",
              marginBottom: "8px",
            }}
          >
            Rate-Spiel
          </h3>
          <p style={{ color: "#b45309" }}>Erkenne, was deine Freunde zeichnen.</p>
        </div>

        <div
          onClick={() => onSelectMode("paint-by-numbers")}
          style={{
            background: "#fffbeb",
            border: "2px solid #fef3c7",
            padding: "32px",
            borderRadius: "24px",
            cursor: "pointer",
          }}
          className="mode-card-sub"
        >
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>Zahlen</div>
          <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#92400e", marginBottom: "8px" }}>
            Malen nach Zahlen
          </h3>
          <p style={{ color: "#b45309" }}>Faerbe ein Bild Feld fuer Feld nach Zahlen.</p>
        </div>

        <div
          onClick={() => onSelectMode("memory")}
          style={{
            background: "white",
            border: "1px solid rgba(0,0,0,0.05)",
            padding: "32px",
            borderRadius: "24px",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          }}
          className="mode-card-sub"
        >
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>Memory</div>
          <h3 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>
            Memory
          </h3>
          <p style={{ color: "#666" }}>
            Spiele allein oder gemeinsam mit Bildern aus Suche und Zeichnungen.
          </p>
        </div>
      </div>
    </div>
  );
}
