/* eslint-disable react-hooks/exhaustive-deps */
import { useContext, useState, useEffect } from "react";
import { AppContext } from "../../context/AppContext";

type SearchImage = {
  id: number | string;
  url: string;
  alt: string;
};

interface ImageSearchProps {
  onSelect?: () => void;
  focusedIndex?: number;    // Index aus dem ToolWheel
  triggerSelect?: boolean;  // Enter-Signal aus dem ToolWheel
}

export default function ImageSearch({ onSelect, focusedIndex = 0, triggerSelect = false }: ImageSearchProps) {
  const [query, setQuery] = useState("");
  const { images, searchImages, selectedImage, setSelectedImage } = useContext(AppContext);

  const handleSearch = async () => {
    if (!query.trim()) return;
    await searchImages(query);
  };

  useEffect(() => {
    if (!selectedImage) return;
    searchImages(selectedImage.alt || query);
  }, [selectedImage]);

  // auf Enter aus dem ToolWheel reagieren
  useEffect(() => {
    if (triggerSelect && images?.length > 0) {
      // Modulo-Rechnung stellt sicher, dass man nicht out of bounds geht
      const targetIndex = focusedIndex % images.length;
      const targetImg = images[targetIndex] as SearchImage | undefined;
      if (targetImg) {
        setSelectedImage(targetImg);
        onSelect?.();
      }
    }
  }, [triggerSelect, focusedIndex, images]);

  const handleImageClick = (img: SearchImage) => {
    setSelectedImage(img);
    onSelect?.();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>

      {/* Suchleiste */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
            // Verhindert, dass ArrowRight im Input-Feld das Grid steuert
            if (e.key === 'ArrowRight') {
              e.stopPropagation();
            }
          }}
          placeholder="Lass dich inspirieren :)"
          style={searchInputStyle}
        />
        <button onClick={handleSearch} style={searchButtonStyle}>
          🔍
        </button>
      </div>

      {/* Ergebnis-Grid */}
      {images?.length > 0 ? (
        <div style={imageGridStyle}>
          {(images as SearchImage[]).map((img, idx) => {
            const isSelected = selectedImage?.id === img.id;
            // Berechne, ob dieses Bild den Tastaturfokus hat
            const isKeyboardFocused = (focusedIndex % images.length) === idx;

            return (
              <img
                key={img.id}
                src={img.url}
                alt={img.alt}
                onClick={() => handleImageClick(img)}
                style={{
                  ...imageThumbStyle,
                  outline: isKeyboardFocused
                    ? '3px solid #1a6dd4'
                    : isSelected 
                      ? '2px solid #1a6dd4' 
                      : '1px solid rgba(0,0,0,0.1)',
                  outlineOffset: isKeyboardFocused ? '2px' : '0px',
                  transform: isKeyboardFocused || isSelected ? 'scale(1.05)' : 'scale(1)',
                }}
              />
            );
          })}
        </div>
      ) : (
        <div style={emptyStateStyle}>
          Suche nach einem Begriff, um Bilder zu finden.
        </div>
      )}
    </div>
  );
}

// Styles 
const searchInputStyle: React.CSSProperties = { flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '13px', outline: 'none' };
const searchButtonStyle: React.CSSProperties = { width: '38px', borderRadius: '8px', border: 'none', background: '#1a6dd4', color: 'white', cursor: 'pointer', fontSize: '14px' };
const imageGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', overflowY: 'auto', flex: 1, paddingRight: '2px' };
const imageThumbStyle: React.CSSProperties = { width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.15s ease, outline 0.15s ease' };
const emptyStateStyle: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#999', fontSize: '12px', padding: '0 12px' };
