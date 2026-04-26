//------------------------------------------------
//Remmember:
//Globel states: color, prompt, sticker,....
//----------------------------------------------------

import { createContext, useState, type ReactNode, useEffect } from "react";
import type { GuessingGame } from "../components/canvas/GuessingGame";
//import io from "socket.io-client";
import { socket } from "../socket/socket";


//const socket = io("http://localhost:3000");

const prompts = ["Haus", "Hund", "Katze", "Vogel", "Baum", "Blume", "Sonne", "Kuchen", "Pinsel", "Wolke", "Pferd", "Schmetterling", "Boot", "Apfel", "Karotte", "Hase", "Zug", "Tulpe", "Mensch", "Auto", "Stern", "Kleeblatt", "Blatt", "Maus", "Regenbogen", "Tropfen", "Schlange"];
const preposition = ["und", "neben", "vor", "mit"];



export const AppContext = createContext<any>({});


const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentColor, setCurrentColor] = useState("black");
  //const [currentPrompt, setCurrentPrompt] = useState("Zeichne etwas Einfaches");
  const [activeLobbyId, setActiveLobbyId] = useState<string | null>(null)
  const [tool, setTool] = useState<"pen" | "shape">("pen");
  //const [activeShape, setActiveShape] = useState<"blob" | null>(null);
  const [mirrorMode, setMirrorMode] = useState(false);
  const [activeShape, setActiveShape] = useState<string | null>(null);
  //--------------------------------
  // this is the group prompt:
  const [groupPrompt, setGroupPrompt] = useState("Was sollen wir heute zeichnen?");
  const [guessingGame, setGuessingGame] = useState<GuessingGame | null>(null)

  const [stickerSize, setStickerSize] = useState (60)  
  const [penWidth, setPenWidth] = useState(4)
  const [showGrid, setShowGrid] = useState(false);
   
  useEffect(() => {
  socket.on("groupPrompt", (prompt: string) => {
    setGroupPrompt(prompt);
  });

  return () => {
    socket.off("groupPrompt");
  };
}, []);

  useEffect(() => {

    socket.on("drawGuessGame", (game: GuessingGame) => {
      setGuessingGame(game);
    });

    return () => {
      socket.off("drawGuessGame");
    };
  }, []);

const requestGroupPrompt = () => {
  if (!activeLobbyId) return;
  socket.emit("newGroupPrompt", activeLobbyId);
};
  //---------------------------------------
  // this is the personal initial prompt
  const [currentPrompt, setCurrentPrompt] = useState(prompts[Math.floor(Math.random() * prompts.length)] + " " + preposition[Math.floor(Math.random()*preposition.length)] + " " + prompts[Math.floor(Math.random()* prompts.length)]);

  // if user wants to intentionally change the prompt:
  const changePrompt = () => {
  const newPrompt = (prompts[Math.floor(Math.random() * prompts.length)] + " " + preposition[Math.floor(Math.random()*preposition.length)] + " " + prompts[Math.floor(Math.random()* prompts.length)]);
  //für unterschiedliche schwierigkeiten
  //prompts[Math.floor(Math.random()* prompts.length)]; 
  //--------------------------------------
  setCurrentPrompt(newPrompt);
}




  return (
    <AppContext.Provider 
    value={{ 
      currentColor, 
      setCurrentColor, 
      currentPrompt, 
      setCurrentPrompt, 
      activeLobbyId, 
      setActiveLobbyId,
      changePrompt, 
      groupPrompt, 
      requestGroupPrompt,
      tool,
      setTool, 
      activeShape,
      setActiveShape,
      guessingGame,
      mirrorMode,
      setMirrorMode,
      stickerSize,
      setStickerSize,
      penWidth,
      setPenWidth,
      showGrid,
      setShowGrid,

      }}>
  
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;

 

