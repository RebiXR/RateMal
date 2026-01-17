
import { useContext } from "react";
import { AppContext } from "../../context/AppContext";
import { twoKeyControls } from "../../input/twoKeyControls";
import "../../style/colorPicker.css";

export const COLORS = [
  "black",
  "red",
  "green",
  "blue",
  "yellow",
  "purple",
  "cyan",
  "white",
];
//const colors = ["black","red","blue","green","yellow","purple","orange","pink"];


export default function ColorPicker() {
  const { currentColor, setCurrentColor } = useContext(AppContext);
  const { scanIndex}= twoKeyControls();

  return (
    /*
    <div className="color-picker">
      {COLORS.map((color, index)=>(

        <div key={color} onClick={()=>setCurrentColor(color)}
          style={{
            width:"40px", height:"40px", borderRadius:"50%", cursor:"pointer",
            backgroundColor: color,
            border: 
              index ===scanIndex
                ? "4px solid #00FF00"
                :currentColor===color 
                ? "3px solid black" 
                : "2px solid gray",

          }}
        />

      ))}

    </div>*/
    
    <div className="color-picker">
      {COLORS.map((color, index) => {
        const classes = [
          "color-swatch",
          color === "white" ? "white" : "",
          currentColor === color ? "active" : "",
          index === scanIndex ? "scan" : "",
        ].join(" ");

        return (
          <div
            key={color}
            className={classes}
            style={{ backgroundColor: color }}
            onClick={() => setCurrentColor(color)}
          />
                 );
      })}
    </div>

  );
}
