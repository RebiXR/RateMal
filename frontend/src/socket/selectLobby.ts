import { socket } from "./socket";

export type LobbyInfo = {
  id: string;
  name: string;
  isPrivate: boolean;
  participantCount: number;
};

export type JoinResponse = { ok: boolean; error?: string };
export type CreateResponse = { ok: boolean; error?: string; lobbyId?: string };

export type Participant = { id: string; username: string; isAdmin: boolean };

export const requestLobbies = () => {
  socket.emit("get-lobbies");
};

export const requestParticipants = (
  lobbyId: string,
  ack: (participants: Participant[]) => void
) => {
  socket.emit("get-participants", lobbyId, ack);
};

export const onLobbyList = (callback: (lobbies: LobbyInfo[]) => void) => {
  socket.on("lobby-list", callback);
};

export const offLobbyList = (callback: (lobbies: LobbyInfo[]) => void) => {
  socket.off("lobby-list", callback);
};

export const joinLobby = (
  lobbyId: string,
  username: string,
  password: string | undefined,
  ack: (res: JoinResponse) => void
) => {
  socket.emit("join-lobby", { lobbyId, username, password }, ack);
};

export const createLobby = (
  payload: { name: string; isPrivate: boolean; password?: string; username: string },
  ack: (res: CreateResponse) => void
) => {
  socket.emit("create-lobby", payload, ack);
};

export const leaveLobby = (lobbyId: string) => {
  socket.emit("leave-lobby", lobbyId);
};

export const startGuessingGame = (lobbyId: string) => {
  socket.emit("createGuessingGame", lobbyId)
}

export const giveGuess = (lobbyId: string, guess: string) => {
  socket.emit("submitGuess", { lobbyId, guess})
}
