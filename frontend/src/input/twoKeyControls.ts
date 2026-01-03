
import { useEffect, useState, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { COLORS } from "../components/toolbar/ColorPicker";


export type ScanMode ="color";
//later : "shape" , "sticker" , "mode"


export function twoKeyControls(){
  const { setCurrentColor } = useContext(AppContext);

  const [scanMode] = useState<ScanMode>("color");
  const [scanIndex, setScanIndex] = useState(0);


   useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // SPACE = keep going
      if (e.key === " ") {
        setScanIndex((i) => (i + 1) % COLORS.length);
      }

      // ENTER = confirm
      if (e.key === "Enter") {
        if (scanMode === "color") {
          setCurrentColor(COLORS[scanIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scanIndex, scanMode, setCurrentColor]);

  return {
    scanIndex,
    scanMode,
  };


}






