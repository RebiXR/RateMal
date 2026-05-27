import { socket } from "./socket";

export interface PBNColor {
  r: number;
  g: number;
  b: number;
}

export interface PBNPaletteEntry {
  index: number;
  color: PBNColor;
}

//PBN payload returned by the server upon generation
export interface PBNResult {
  pbn_template: string;
  completed: string;
  palette: PBNPaletteEntry[];
}

//Request payload for generating a PBN
export interface GeneratePBNPayload {
  lobbyId: string;
  image: string;
  difficulty: number;
}

//Wraps a raw base64 string into a PNG data-URL
export const toPngDataUrl = (base64: string): string =>
  base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;

export const emitGeneratePBN = (payload: GeneratePBNPayload): void => {
  socket.emit("generate-pbn", payload);
};

export const onPBNReady = (callback: (result: PBNResult) => void): void => {
  socket.on("pbn-ready", callback);
};

export const offPBNReady = (callback: (result: PBNResult) => void): void => {
  socket.off("pbn-ready", callback);
};

export const onPBNError = (callback: (error: { message: string }) => void): void => {
  socket.on("pbn-error", callback);
};

export const offPBNError = (callback: (error: { message: string }) => void): void => {
  socket.off("pbn-error", callback);
};
