//------------------------------------------------
//Remember:
//Global states: color, prompt, sticker,....
//----------------------------------------------------

import { createContext, useState, type ReactNode, useEffect } from "react";
import io from "socket.io-client";
// createContext --> context for sharing global values
// useState --> hook for managing local states
// reactNode --> type for everything that can be rendered as a child component

const socket = io("http://localhost:3000");

const prompts = ["Haus", "Hund", "Katze", "Vogel", "Baum", "Blume", "Sonne", "Kuchen", "Pinsel", "Wolke", "Pferd", "Schmetterling", "Boot", "Apfel", "Karotte", "Hase", "Zug", "Tulpe", "Mann", "Frau", "Auto", "Stern", "Kleeblatt", "Blatt", "Maus", "Regenbogen", "Tropfen", "Schlange"];
const preposition = ["und", "neben", "unter", "vor", "hinter"];


export const AppContext = createContext<any>({});


const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentColor, setCurrentColor] = useState("black");

  //--------------------------------
  // this is the group prompt:
  const [groupPrompt, setGroupPrompt] = useState("Was sollen wir heute zeichnen?");

  useEffect(() => {
  socket.on("groupPrompt", (prompt: string) => {
    setGroupPrompt(prompt);
  });

  return () => {
    socket.off("groupPrompt");
  };
}, []);

const requestGroupPrompt = () => {
 socket.emit("newGroupPrompt");
};
  //---------------------------------------

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
    <AppContext.Provider value={{ currentColor, setCurrentColor, currentPrompt, changePrompt, groupPrompt, requestGroupPrompt}}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;



