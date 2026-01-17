import { useContext } from "react";
import { AppContext } from "../../context/AppContext";
import "../../style/buttons.css";

const PromptBar = () => {
  const { currentPrompt, changePrompt, groupPrompt, requestGroupPrompt} = useContext(AppContext);

  return (
    <div>
      <p style={{ fontFamily: "'Arial', sans-serif", fontSize: "1.3rem", lineHeight: "1.5" }}>

        Alle zusammen: <strong>{groupPrompt}</strong>
      </p>
      <button className="btn" onClick={requestGroupPrompt}>
        Lass uns zeichnen!
      </button>

      <p style={{ fontFamily: "'Arial', sans-serif", fontSize: "1.3rem", lineHeight: "1.5" }}>
        Nur für dich: <strong>{currentPrompt}</strong>
      </p>

      <button className="btn" onClick={changePrompt}>
        Neuer Zeichenvorschlag
      </button>
    </div>
  );
};

export default PromptBar;
