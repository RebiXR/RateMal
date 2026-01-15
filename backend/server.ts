import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { lobbies, Lobby } from "./lobby.ts"
import { createDrawGame, GuessingGame } from "./GuessingGame.ts";

const app = express();
app.use(cors());

const httpServer = createServer(app);


const prompts = ["Haus", "Hund", "Katze", "Vogel", "Baum", "Blume", "Sonne", "Kuchen", "Pinsel", "Wolke", "Pferd", "Schmetterling", "Boot", "Apfel", "Karotte", "Hase", "Zug", "Tulpe", "Mann", "Frau", "Auto", "Stern", "Kleeblatt", "Blatt", "Maus", "Regenbogen", "Tropfen", "Schlange"];
const preposition = ["auf", "neben", "unter", "vor", "hinter"];

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// not nomalized 
type PointN = { x: number; y: number }; // normalized 0..1


type LineDrawEvent ={
  type:"line";
  from: PointN;
  to:PointN;
  color:string;
  width:number;
};
type BlobDrawEvent ={
  type:"blob";
  x: number;
  y:number;
  color:string;
};


type DrawEvent = LineDrawEvent| BlobDrawEvent;

// Zeichen-History pro Lobby (damit neue Joiner den aktuellen Canvas sehen)
const lobbyHistory = new Map<string, DrawEvent[]>();

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

  socket.on("draw", ({ lobbyId, data }: { lobbyId: string; data: DrawEvent }) => {
    if (!lobbyId) return;

    // speichern für spätere Joiner
    const hist = lobbyHistory.get(lobbyId) ?? [];
    hist.push(data);

    // optional: begrenzen, damit RAM nicht unendlich wächst
    // if (hist.length > 50_000) hist.splice(0, hist.length - 50_000);

    lobbyHistory.set(lobbyId, hist);

    socket.to(lobbyId).emit("draw", data)
  })

  //for the group: 
  //mit lobby ???????????????????????????
// for the group (Prompt nur in der Lobby senden)
  socket.on("newGroupPrompt", (lobbyId: string) => {
    const randomPrompt =
        prompts[Math.floor(Math.random() * prompts.length)] + " " +
        preposition[Math.floor(Math.random() * preposition.length)] + " " +
        prompts[Math.floor(Math.random() * prompts.length)];

    // nur an Spieler in dieser Lobby
    io.to(lobbyId).emit("groupPrompt", randomPrompt);
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


});

httpServer.listen(3000, () => console.log("Backend läuft auf Port 3000"));
