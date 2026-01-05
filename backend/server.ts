import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { lobbies } from "../backend/lobby.ts"

const app = express();
app.use(cors());

const httpServer = createServer(app);


const prompts = ["Haus", "Hund", "Katze", "Vogel", "Baum", "Blume", "Sonne", "Kuchen", "Pinsel", "Wolke", "Pferd", "Schmetterling", "Boot", "Apfel", "Karotte", "Hase", "Zug", "Tulpe", "Mann", "Frau", "Auto", "Stern", "Kleeblatt", "Blatt", "Maus", "Regenbogen", "Tropfen", "Schlange"];
const preposition = ["auf", "neben", "unter", "vor", "hinter"];

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

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
    socket.to(lobbyId).emit("User connected", userId)
  });

  socket.on("draw", ({lobbyId, data}) => {
    //socket.broadcast.emit("draw", data);

    socket.to(lobbyId).emit("draw", data)
  })

  //for the group: 
  //mit lobby ???????????????????????????
  socket.on("newGroupPrompt", () => {
    const randomPrompt = (prompts[Math.floor(Math.random() * prompts.length)] + " " + preposition[Math.floor(Math.random()*preposition.length)] + " " + prompts[Math.floor(Math.random()* prompts.length)]);
  
    // für die anderen spieler
    io.emit("groupPrompt", randomPrompt);
  });


  socket.on("disconnect", () => {
    for(const lobby of lobbies.values()) {
      if(lobby.participants.delete(socket.id)){
        socket.to(lobby.id).emit("User disconnected", socket.id)
      }
    }
    console.log("User disconnected:", socket.id);
  });

  
});

httpServer.listen(3000, () => console.log("Backend läuft auf Port 3000"));
