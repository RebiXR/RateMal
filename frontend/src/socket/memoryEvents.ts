import { socket } from "./socket";

export type MemoryDeckCard = {
  title: string;
  imageUrl: string;
};

export type MemoryCard = {
  id: string;
  pairId: string;
  title: string;
  imageUrl?: string;
  isFlipped: boolean;
  isMatched: boolean;
};

export type MemoryPlayer = {
  id: string;
  username: string;
  score: number;
};

export type MemoryState = {
  id: string;
  lobbyId: string;
  cards: MemoryCard[];
  players: MemoryPlayer[];
  currentTurnIndex: number;
  currentPlayerId: string | null;
  locked: boolean;
  moves: number;
  status: "playing" | "finished" | "lost";
  maxMoves: number | null;
  matchedPairs: number;
  totalPairs: number;
};

export type MemoryGameOptions = {
  pairCount?: number;
  maxMoves?: number | null;
};

export const requestMemoryState = (lobbyId: string) => {
  socket.emit("memory-get-state", lobbyId);
};

export const startMemoryGame = (
  lobbyId: string,
  deck: MemoryDeckCard[],
  options?: MemoryGameOptions,
  ack?: (res: { ok: boolean; error?: string }) => void
) => {
  socket.emit("memory-start", { lobbyId, deck, options }, ack);
};

export const flipMemoryCard = (lobbyId: string, cardId: string) => {
  socket.emit("memory-flip", { lobbyId, cardId });
};

export const resetMemoryGame = (lobbyId: string) => {
  socket.emit("memory-reset", lobbyId);
};

export const onMemoryState = (callback: (state: MemoryState | null) => void) => {
  socket.on("memory-state", callback);
};

export const offMemoryState = (callback: (state: MemoryState | null) => void) => {
  socket.off("memory-state", callback);
};
