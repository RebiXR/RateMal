// Mirror.ts
//import { DrawEvent } from "./server"; // oder wo DrawEvent definiert ist
import { DrawEvent } from "./DrawEvents.ts";

function mirrorX(x: number, width: number) {
  return width - x;
}

export function mirrorDrawEvent(
  data: DrawEvent,
  canvasWidth: number
): DrawEvent {
  if (data.type === "line") {
    return {
      ...data,
      from: {
        x: mirrorX(data.from.x, canvasWidth),
        y: data.from.y,
      },
      to: {
        x: mirrorX(data.to.x, canvasWidth),
        y: data.to.y,
      },
    };
  }

  if (data.type === "blob") {
    return {
      ...data,
      x: mirrorX(data.x, canvasWidth),
    };
  }

  return data;
}