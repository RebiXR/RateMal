import { socket } from "./socket";

export const requestLobbies = () => {
  socket.emit("get-lobbies");
};

export const onLobbyList = (callback: (lobbies: string[]) => void) => {
  socket.on("lobby-list", callback);
};

export const joinLobby = (lobbyId: string, userId: string) => {
  socket.emit("join-lobby", lobbyId, userId);
};
