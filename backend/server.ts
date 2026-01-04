import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors()); // vite frontend can access this server

const httpServer = createServer(app); // socket.IO needs http server ---> express app put into server to use at the same time

const prompts = ["Haus", "Hund", "Katze", "Vogel", "Baum", "Blume", "Sonne", "Kuchen", "Pinsel", "Wolke", "Pferd", "Schmetterling", "Boot", "Apfel", "Karotte", "Hase", "Zug", "Tulpe", "Mann", "Frau", "Auto", "Stern", "Kleeblatt", "Blatt", "Maus", "Regenbogen", "Tropfen", "Schlange"];
const preposition = ["auf", "neben", "unter", "vor", "hinter"];


const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// when client connects --> this callback is executed
io.on("connection", (socket) => {
  console.log("User connected:", socket.id); // socket.id from client
  //listens for draw events from client
  socket.on("draw", (data) => {
    socket.broadcast.emit("draw", data);
  });


//for the group: 
socket.on("newGroupPrompt", () => {
    const randomPrompt = (prompts[Math.floor(Math.random() * prompts.length)] + " " + preposition[Math.floor(Math.random()*preposition.length)] + " " + prompts[Math.floor(Math.random()* prompts.length)]);
  
    // für die anderen spieler
    io.emit("groupPrompt", randomPrompt);
  });


  // listens for client disconnecting 
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// starts server
httpServer.listen(3000, () => console.log("Backend läuft auf Port 3000"));
