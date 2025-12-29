import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { Socket } from "dgram";

const app = express();
app.use(cors());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const LobbyId = "userLobby"

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

    socket.join(LobbyId)
    socket.to(LobbyId).emit("User connected", socket.id)

  socket.on("draw", (data) => {
    //socket.broadcast.emit("draw", data);

    socket.to(LobbyId).emit("draw", data)
  });

  socket.on("disconnect", () => {
    socket.to(LobbyId).emit("User disconnected", socket.id)
    console.log("User disconnected:", socket.id);
  });
});

httpServer.listen(3000, () => console.log("Backend läuft auf Port 3000"));
