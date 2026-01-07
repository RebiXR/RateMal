//------------------------------------------------
//Remmember:
//Globel states: color, prompt, sticker,....
//----------------------------------------------------

import { createContext, useState, type ReactNode } from "react";

export const AppContext = createContext<any>({});


const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentColor, setCurrentColor] = useState("black");
  const [currentPrompt, setCurrentPrompt] = useState("Zeichne etwas Einfaches");
  const [activeLobbyId, setActiveLobbyId] = useState<string | null>(null)
  const [tool, setTool] = useState<"pen" | "shape">("pen");
  const [activeShape, setActiveShape] = useState<"blob" | null>(null);

  return (
    <AppContext.Provider 
    value={{ 
      currentColor, 
      setCurrentColor, 
      currentPrompt, 
      setCurrentPrompt, 
      activeLobbyId, 
      setActiveLobbyId,
      tool,
      setTool, 
      activeShape,
      setActiveShape,
      }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;

 

