import { socket } from "./socket";

/** A single palette colour (0–255 per channel). */
export interface PBNColor {
  r: number;
  g: number;
  b: number;
}

/** One palette entry: the number printed in the template and its colour. */
export interface PBNPaletteEntry {
  index: number;
  color: PBNColor;
}

/** Payload broadcast to the whole lobby when a paint-by-numbers result is ready. */
export interface PBNResult {
  /** Base64 PNG (no data-URL prefix): white canvas with outlines + numbers. */
  pbn_template: string;
  /** Base64 PNG (no data-URL prefix): the flat-colour reference picture. */
  completed: string;
  palette: PBNPaletteEntry[];
}

export interface GeneratePBNPayload {
  lobbyId: string;
  /** Base64 data-URL of the uploaded source picture. */
  image: string;
  /** 1 (few bold regions) … 10 (many fine regions). */
  difficulty: number;
}

/** Wraps a raw base64 string into a PNG data-URL (pass-through if already one). */
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
