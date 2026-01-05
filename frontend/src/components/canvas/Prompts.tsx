import { useContext } from "react";
import { AppContext } from "../../context/AppContext";

const PromptBar = () => {
  const { currentPrompt, changePrompt, groupPrompt, requestGroupPrompt} = useContext(AppContext);

  return (
    <div>
      <p>
        Wir alle zeichnen: <strong>{groupPrompt}</strong>
      </p>
      <button onClick={requestGroupPrompt}>
        Lass uns zeichnen!
      </button>

      <p>
        Nur für dich: <strong>{currentPrompt}</strong>
      </p>

      <button onClick={changePrompt}>
        Neuer Zeichenvorschlag
      </button>
    </div>
  );
};

export default PromptBar;