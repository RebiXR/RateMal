
import { useContext } from "react";
import { AppContext } from "../../context/AppContext";
import { twoKeyControls } from "../../input/twoKeyControls";
import "../../style/colorPicker.css";
import { useState, useRef } from 'react';
//import './colorPicker.css';


// Deine bestehenden Farben hier eintragen
export const COLORS = ['#111827', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'];

export default function ColorPicker({ currentColor, setCurrentColor, scanIndex }: {
  currentColor: string;
  setCurrentColor: (c: string) => void;
  scanIndex?: number;
}) {
  //const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /*const handleWheelClick = () => {
    setPickerOpen(true);
    // kleiner Timeout damit der Input sicher gemountet ist
    setTimeout(() => inputRef.current?.click(), 50);
  };

  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentColor(e.target.value);
    setPickerOpen(false);
  };*/

  return (
    <div className="color-picker">
      {COLORS.map((color, index) => {
        const classes = [
          'color-swatch',
          color === '#ffffff' ? 'white' : '',
          currentColor === color ? 'active' : '',
          index === scanIndex ? 'scan' : '',
        ].join(' ');

        return (
          <div
            key={color}
            className={classes}
            style={{ backgroundColor: color }}
            onClick={() => setCurrentColor(color)}
          />
        );
      })}

      {/* Farbenrad-Button */}
      <div
        className="color-swatch color-wheel-btn"
        title="Eigene Farbe wählen"
        onClick={ ()=>inputRef.current?.click()}
        style={{
          background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* versteckter native color input */}
        <input
          ref={inputRef}
          type="color"
          value={currentColor}
          onChange={(e) => setCurrentColor(e.target.value)}
          style={{
            position: 'absolute',
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
            top: 0,
            left: 0,
          }}
        />
      </div>
    </div>
  );
}