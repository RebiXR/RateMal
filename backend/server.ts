import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { lobbies, Lobby } from "./lobby.ts"
import { createDrawGame, GuessingGame } from "./GuessingGame.ts";
import { DrawEvent } from "./DrawEvents.ts";
import { mirrorDrawEvent } from "./MirrorDraw.ts";


const app = express();
app.use(cors());

const httpServer = createServer(app);


const prompts = ["Haus", "Hund", "Katze", "Vogel", "Baum", "Blume", "Sonne", "Kuchen", "Pinsel", "Wolke", "Pferd", "Schmetterling", "Boot", "Apfel", "Karotte", "Hase", "Zug", "Tulpe", "Mensch", "Auto", "Stern", "Kleeblatt", "Blatt", "Maus", "Regenbogen", "Tropfen", "Schlange"];
const preposition = ["neben", "vor", "und", "mit"];
const drawingStyle = ["Comic", "Realistisch", "Schwarz Weiß", "3D"];

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// not nomalized 
/**type PointN = { x: number; y: number }; // normalized 0..1

type LineDrawEvent ={
  type:"line";
  from: PointN;
  to:PointN;
  color:string;
  width:number;
};
/*type BlobDrawEvent ={
  type:"blob";
  x: number;
  y:number;
  color:string;
};
};*/



//type DrawEvent = LineDrawEvent| ShapeDrawEvent;

// Zeichen-History pro Lobby (damit neue Joiner den aktuellen Canvas sehen)
const lobbyHistory = new Map<string, DrawEvent[]>();

// for mirrored drawing option
const lobbyMirrorMode = new Map<string, boolean>();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("get-lobbies", () => {
    socket.emit("lobby-list", Array.from(lobbies.keys()))
  })

  socket.on('join-lobby', (lobbyId: string, userId: string) => {
    const lobby = lobbies.get(lobbyId)
    if (!lobby) return

    socket.join(lobbyId)
    lobby.participants.add(socket.id)
    if (!lobbyHistory.has(lobbyId)) lobbyHistory.set(lobbyId, []);
    socket.emit("canvas-sync", lobbyHistory.get(lobbyId));
    socket.to(lobbyId).emit("User connected", userId)
  });

  socket.on("draw", ({ lobbyId, data, canvasWidth }: { lobbyId: string; data: DrawEvent; canvasWidth?:number }) => {
    if (!lobbyId) return;

    // speichern für spätere Joiner
    const hist = lobbyHistory.get(lobbyId) ?? [];

// for mirrored option:
    const mirrorMode = lobbyMirrorMode.get(lobbyId) ?? false; // false by default if nothing is picked

    if (mirrorMode && canvasWidth) {
    const mirrored = mirrorDrawEvent(data, canvasWidth);

    hist.push(data, mirrored);
    lobbyHistory.set(lobbyId, hist);

    socket.to(lobbyId).emit("draw", data);
    socket.to(lobbyId).emit("draw", mirrored);

    socket.emit("draw", mirrored);
    }else {    
    hist.push(data);

    // optional: begrenzen, damit RAM nicht unendlich wächst
    // if (hist.length > 50_000) hist.splice(0, hist.length - 50_000);
    lobbyHistory.set(lobbyId, hist);

    socket.to(lobbyId).emit("draw", data)
  }
  })


  //-------------------------------------
  //for the group: 


  socket.on("newGroupPrompt", () => {
    const randomPrompt = (prompts[Math.floor(Math.random() * prompts.length)] + " " + preposition[Math.floor(Math.random()*preposition.length)] + " " + prompts[Math.floor(Math.random()* prompts.length)] + " im Stil: " + drawingStyle[Math.floor(Math.random()*drawingStyle.length)]);
  
    // für die anderen spieler
    io.emit("groupPrompt", randomPrompt);
  });



  socket.on("generate-pbn", async ({ lobbyId, image, difficulty }: { lobbyId: string; image: string; difficulty?: number }) => {
    if (!lobbyId || !image) return;

    try {
      const response = await fetch("http://127.0.0.1:8000/processPicture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, difficulty: difficulty ?? 5 }),
      });

      if (!response.ok) {
        socket.emit("pbn-error", { message: "PBN generation failed" });
        return;
      }

      const result = await response.json();
      io.to(lobbyId).emit("pbn-ready", result);
    } catch {
      socket.emit("pbn-error", { message: "Could not reach PBN service" });
    }
  });

  socket.on("disconnect", () => {
    for(const lobby of lobbies.values()) {
      if(lobby.participants.delete(socket.id)){
        socket.to(lobby.id).emit("User disconnected", socket.id)
      }
    }
    console.log("User disconnected:", socket.id);
  });

  socket.on("createGuessingGame", (lobbyId: string) => {
    const lobby = lobbies.get(lobbyId)
    if (!lobby){
      socket.emit("No Lobby")
      return
    }
    // get random item from a Set
    function getRandomItem(set: Set<string>) {
        let items = Array.from(set);
        return items[Math.floor(Math.random() * items.length)];
    }

    const participants: Set<string> = lobby?.participants
    const host: string = getRandomItem(participants)

    const guessingGame = createDrawGame()
    guessingGame.participants = participants
    guessingGame.drawMasterId = host

    const guessingGameLobby = new Map<string, GuessingGame>()
    guessingGameLobby.set(lobbyId, guessingGame)

    io.to(lobbyId).emit("drawGuessGame", {
        id: guessingGame.id,
        drawPrompt: guessingGame.drawPrompt,
        drawMasterId: guessingGame.drawMasterId!,
        participants: Array.from(guessingGame.participants),
        answerOptions: Array.from(guessingGame.answers)
      
    })
  })

  socket.on("toggleMirrorMode", (lobbyId: string) => {
  const next = !(lobbyMirrorMode.get(lobbyId) ?? false);
  lobbyMirrorMode.set(lobbyId, next);

  io.to(lobbyId).emit("mirrorModeChanged", next);
});


});

httpServer.listen(3000, "0.0.0.0", () => console.log("Backend läuft auf Port 3000"));