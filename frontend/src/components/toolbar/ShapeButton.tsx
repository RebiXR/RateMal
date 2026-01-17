import { useContext } from "react";
import { AppContext } from "../../context/AppContext";

export default function ShapeMenu() {
  const { tool, setTool, setActiveShape } = useContext(AppContext);

  const activateBlob = () => {
    setTool("shape");
    setActiveShape("blob");
  };

  return (
    <button
      onClick={activateBlob}
      style={{
        padding: "10px",
        borderRadius: "8px",
        background: tool === "shape" ? "#ddd" : "#fff",
        cursor: "pointer",
      }}
    >
      Fleck
    </button>
  );
}

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  /*return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => {
          setTool("shape");
          setActiveShape("blob");
        }}
        style={{ padding: 10 }}
      >
        Fleck
      </button>
    </div>
  );
}*/