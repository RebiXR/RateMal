import { socket } from "./socket";

type Point = { x: number; y: number };

type DrawEvent = {
  from: Point;
  to: Point;
  color: string;
};

export const emitDraw = (data: DrawEvent) => {
  socket.emit("draw", data);
};

export const onDraw = (callback: (data: DrawEvent) => void) => {
  socket.on("draw", callback);
};

export const offDraw = () => {
  socket.off("draw");
};
