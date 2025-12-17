//------------------------------------------------
//Remmember:
//Globel states: color, prompt, sticker,....
//----------------------------------------------------

import { createContext, useState, type ReactNode } from "react";

export const AppContext = createContext<any>({});

const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentColor, setCurrentColor] = useState("black");
  const [currentPrompt, setCurrentPrompt] = useState("Zeichne etwas Einfaches");

  return (
    <AppContext.Provider value={{ currentColor, setCurrentColor, currentPrompt, setCurrentPrompt }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;



