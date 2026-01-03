
import { useContext } from "react";
import { AppContext } from "../../context/AppContext";
import { twoKeyControls } from "../../input/twoKeyControls";

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
    <div style={{position:"fixed", top:"10px", left:"10px", display:"flex", gap:"5px", backgroundColor:"white", padding:"10px", borderRadius:"8px", zIndex:1000, boxShadow:"0 0 10px rgba(0,0,0,0.2)"}}>
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

    </div>
  );
}
