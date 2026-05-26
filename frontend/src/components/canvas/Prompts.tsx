import { useContext } from "react";
import { AppContext } from "../../context/AppContext";
//import "../../style/buttons.css";
import "../../App.css";

const PromptBar = () => {
  const { currentPrompt, changePrompt, groupPrompt, requestGroupPrompt } = useContext(AppContext);

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      {/* Globaler Vorschlag (Gelber Look aus Inspo) */}
      <button className="btn-prompt" onClick={requestGroupPrompt} title="Klicken für neuen Gruppen-Vorschlag">
        <span style={{ fontSize: '1.1rem' }}>G:</span>
        <span style={{ marginLeft: '8px', color: '#92400e', fontWeight: 700 }}>
          {groupPrompt || "Lass uns zeichnen!"}
        </span>
      </button>

      {/* Persönlicher Vorschlag (Blauer Look) */}
      <button className="btn-prompt-personal" onClick={changePrompt} title="Klicken für neuen eigenen Vorschlag">
        <span style={{ fontSize: '1.1rem' }}>ME:</span>
        <span style={{ marginLeft: '8px', color: '#075985', fontWeight: 700 }}>
          {currentPrompt}
        </span>
      </button>
    </div>
  );
};

export default PromptBar;