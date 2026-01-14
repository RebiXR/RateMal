import { socket } from "./socket";


/**
 * Represents a 2D point on the canvas.
 */
type Point = { x: number; y: number };


/**
 * Draw event for continous line strokes
 * for freehand drawing
 */
type lineDrawEvent = {
  type: "line"
  from: Point;
  to: Point;
  color: string;
  width?: number; //optional
};

/**
 * Draw event for shape placement.
 */
type BlobDrawEvent = {
  type: "blob"
  x: number;
  y: number;
  color: string;
};

/**
 * Union type represents all possible draw events
 * to distinguish from stroke and shape
 */
export type DrawEvent = lineDrawEvent |BlobDrawEvent;


type DrawPayload = {
  lobbyId: string;
  data: DrawEvent;
}

/**
 * Emits a draw event to other users in the same lobby
 * @param payload 
 */
export const emitDraw = (payload: DrawPayload) => {
  socket.emit("draw", payload);
};

/**
 * Registers a listener for incoming draw events
 * CallBack is triggerd  whenever another user draws
 * @param callback 
 */
export const onDraw = (callback: (data: DrawEvent) => void) => {
  socket.on("draw", callback);
};

/**
 * 
 */
export const offDraw = () => {
  socket.off("draw");
};

export const onCanvasSync = (callback: (history: DrawEvent[]) => void) => {
  socket.on("canvas-sync", callback);
};

export const offCanvasSync = () => {
  socket.off("canvas-sync");
};
