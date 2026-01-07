import { socket } from "./socket";

type Point = { x: number; y: number };

type lineDrawEvent = {
  type: "line"
  from: Point;
  to: Point;
  color: string;
};

type BlobDrawEvent = {
  type: "blob"
  x: number;
  y: number;
  color: string;
};


export type DrawEvent = lineDrawEvent |BlobDrawEvent;


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
