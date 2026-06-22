/* eslint-disable react-refresh/only-export-components, @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
//------------------------------------------------
//Remmember:
//Globel states: color, prompt, sticker,....
//----------------------------------------------------

import { createContext, useState, type ReactNode, useEffect } from "react";
import type { GuessingGame } from "../components/canvas/GuessingGame";
//import io from "socket.io-client";
import { socket } from "../socket/socket";
import { searchImages as fetchImages } from "../api/imageApi";
import type { PBNPaletteEntry } from "../socket/PBNEvents";


//const socket = io("http://localhost:3000");

const prompts = ["Haus", "Hund", "Katze", "Vogel", "Baum", "Blume", "Sonne", "Kuchen", "Pinsel", "Wolke", "Pferd", "Schmetterling", "Boot", "Apfel", "Karotte", "Hase", "Zug", "Tulpe", "Mensch", "Auto", "Stern", "Kleeblatt", "Blatt", "Maus", "Regenbogen", "Tropfen", "Schlange"];
const preposition = ["und", "neben", "vor", "mit"];

function randomPrompt() {
  return prompts[Math.floor(Math.random() * prompts.length)] + " " +
    preposition[Math.floor(Math.random() * preposition.length)] + " " +
    prompts[Math.floor(Math.random() * prompts.length)];
}

function getOrCreateGuestName(): string {
  const existing = localStorage.getItem("guest_username");
  if (existing) return existing;
  const name = `Gast-${Math.floor(1000 + Math.random() * 9000)}`;
  localStorage.setItem("guest_username", name);
  return name;
}



export const AppContext = createContext<any>({});
//export const AppContext = createContext<any>(null);


const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentColor, setCurrentColor] = useState("black");
  //const [currentPrompt, setCurrentPrompt] = useState("Zeichne etwas Einfaches");
  const [activeLobbyId, setActiveLobbyId] = useState<string | null>(null)
  const [activeLobbyName, setActiveLobbyName] = useState<string | null>(null)
  const [username, setUsername] = useState<string>(() => getOrCreateGuestName())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
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

  //for inspo pics
  const [images, setImages] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);

  // Active PBN palette; set by PBNGame on `pbn-ready`, cleared when leaving PBN mode.
  const [pbnPalette, setPbnPalette] = useState<PBNPaletteEntry[] | null>(null);

  const refreshUser = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsername(data.username);
        setIsAuthenticated(true);
        return;
      }
    } catch {
      // ignore errors fallback to guest
    }
    setUsername(getOrCreateGuestName());
    setIsAuthenticated(false);
  };

  useEffect(() => {
    refreshUser();
  }, []);


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
  const [currentPrompt, setCurrentPrompt] = useState(() => randomPrompt());

  // if user wants to intentionally change the prompt:
const changePrompt = () => {
  const newPrompt = randomPrompt();
  //für unterschiedliche schwierigkeiten
  //prompts[Math.floor(Math.random()* prompts.length)]; 
  //--------------------------------------
  setCurrentPrompt(newPrompt);
}

//for images
const searchImages = async (query: string) => {
  const data = await fetchImages(query);
  setImages(data);
};




  return (
    <AppContext.Provider 
    value={{ 
      currentColor, 
      setCurrentColor, 
      currentPrompt, 
      setCurrentPrompt, 
      activeLobbyId,
      setActiveLobbyId,
      activeLobbyName,
      setActiveLobbyName,
      username,
      isAuthenticated,
      refreshUser,
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
      images,
      searchImages,
      selectedImage,
      setSelectedImage,
      pbnPalette,
      setPbnPalette,

      }}>
  
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;


