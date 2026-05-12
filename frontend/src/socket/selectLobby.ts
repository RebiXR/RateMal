import { socket } from "./socket";

export type LobbyInfo = {
  id: string;
  name?: string;
  position: number;
  participantCount: number;
};

export const requestLobbies = () => {
  socket.emit("get-lobbies");
};

export const createLobby = (name?: string) => {
  socket.emit("create-lobby", { name });
};

export const deleteLobby = (lobbyId: string) => {
  socket.emit("delete-lobby", lobbyId);
};

export const onLobbyList = (callback: (lobbies: LobbyInfo[]) => void) => {
  socket.on("lobby-list", callback);
};

export const offLobbyList = () => {
  socket.off("lobby-list");
};

export const onLobbyDeleted = (callback: (lobbyId: string) => void) => {
  socket.on("lobby-deleted", callback);
};

export const offLobbyDeleted = () => {
  socket.off("lobby-deleted");
};

export const joinLobby = (lobbyId: string, userId: string) => {
  socket.emit("join-lobby", lobbyId, userId);
};

export const startGuessingGame = (lobbyId: string) => {
  socket.emit("createGuessingGame", lobbyId)
}

export const giveGuess = (lobbyId: string, guess: string) => {
  socket.emit("submitGuess", { lobbyId, guess})
}
