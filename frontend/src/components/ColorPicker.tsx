



import { useContext } from "react";
import { AppContext } from "../context/AppContext";

const colors = ["black","red","blue","green","yellow","purple","orange","pink"];

export default function ColorPicker() {
  const { currentColor, setCurrentColor } = useContext(AppContext);

  return (
    <div style={{position:"fixed", top:"10px", left:"10px", display:"flex", gap:"5px", backgroundColor:"white", padding:"10px", borderRadius:"8px", zIndex:1000, boxShadow:"0 0 10px rgba(0,0,0,0.2)"}}>
      {colors.map((color)=>(
        <div key={color} onClick={()=>setCurrentColor(color)}
          style={{
            width:"40px", height:"40px", borderRadius:"50%", cursor:"pointer",
            border: currentColor===color ? "3px solid black" : "2px solid gray",
            backgroundColor: color
          }}
        />
      ))}
    </div>
  );
}
