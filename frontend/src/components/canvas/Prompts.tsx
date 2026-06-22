import { useContext, useState } from "react";
import { AppContext } from "../../context/AppContext";
//import "../../style/buttons.css";
import "../../App.css";

const PromptBar = () => {
  const { currentPrompt, changePrompt, groupPrompt, requestGroupPrompt } = useContext(AppContext);

  // Vor dem ersten Klick zeigen die Buttons nur ihr Label im Lobby-Stil;
  // erst beim Klick wird die Zeichenanweisung geholt und farbig angezeigt.
  const [groupShown, setGroupShown] = useState(false);
  const [personalShown, setPersonalShown] = useState(false);

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      {/* Gruppen-Zeichenanweisung */}
      {groupShown ? (
        <button className="btn-prompt" onClick={() => requestGroupPrompt()} title="Klicken für neuen Gruppen-Vorschlag">
          <span style={{ fontSize: '1.1rem' }}>G:</span>
          <span style={{ marginLeft: '8px', color: '#92400e', fontWeight: 700 }}>
            {groupPrompt || "Lass uns zeichnen!"}
          </span>
        </button>
      ) : (
        <button
          className="btn btn-secondary lm-trigger"
          onClick={() => { requestGroupPrompt(); setGroupShown(true); }}
        >
          Gruppen-Zeichenanweisung
        </button>
      )}

      {/* Persönliche Zeichenanweisung */}
      {personalShown ? (
        <button className="btn-prompt-personal" onClick={() => changePrompt()} title="Klicken für neuen eigenen Vorschlag">
          <span style={{ fontSize: '1.1rem' }}>ME:</span>
          <span style={{ marginLeft: '8px', color: '#075985', fontWeight: 700 }}>
            {currentPrompt}
          </span>
        </button>
      ) : (
        <button
          className="btn btn-secondary lm-trigger"
          onClick={() => { changePrompt(); setPersonalShown(true); }}
        >
          Zeichenanweisung für Mich
        </button>
      )}
    </div>
  );
};

export default PromptBar;