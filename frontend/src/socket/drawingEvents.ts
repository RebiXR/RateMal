import { socket } from "./socket";

type Point = { x: number; y: number };

type DrawEvent = {
  from: Point;
  to: Point;
  color: string;
  width?: number; //optional
};

type DrawPayload = {
  lobbyId: string;
  data: DrawEvent;
}

export const emitDraw = (payload: DrawPayload) => {
  socket.emit("draw", payload);
};

export const onDraw = (callback: (data: DrawEvent) => void) => {
  socket.on("draw", callback);
};

export const offDraw = () => {
  socket.off("draw");
};

export const onCanvasSync = (callback: (history: DrawEvent[]) => void) => {
  socket.on("canvas-sync", callback);
};

export const offCanvasSync = () => {
  socket.off("canvas-sync");
};
