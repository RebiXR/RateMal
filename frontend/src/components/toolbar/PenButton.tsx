import { useContext } from "react";
import { AppContext } from "../../context/AppContext";
import "../../style/buttons.css";


export default function PenButton() {
  const { tool, setTool, setActiveShape } = useContext(AppContext);

  const activatePen = () => {
    setTool("pen");
    setActiveShape(null);
  };

  return (
    <button
      className="btn btn-secondary"
      onClick={activatePen}
      style={{
        padding: "10px",
        borderRadius: "8px",
        background: tool === "pen" ? "#ddd" : "#fff",
        cursor: "pointer",
      }}
    >
      Pen
    </button>
  );
}

