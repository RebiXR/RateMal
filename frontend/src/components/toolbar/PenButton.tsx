import { useContext } from "react";
import { AppContext } from "../../context/AppContext";

export default function PenButton() {
  const { tool, setTool, setActiveShape } = useContext(AppContext);

  const activatePen = () => {
    setTool("pen");
    setActiveShape(null);
  };

  return (
    <button
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

