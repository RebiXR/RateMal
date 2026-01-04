//---------------------------------
//
//
//--------------------------------

import { Stage, Layer, Line } from "react-konva";
import { useRef, useState, useEffect, useContext, useCallback } from "react";
import io from "socket.io-client";
import { AppContext } from "../context/AppContext";

//each line has an identifier, points in array form ans a color
interface LineType {
  id: string;
  points: number[];
  color: string;
}

const socket = io("http://localhost:3000"); // connection to backend

export default function Canvas() {
  const { currentColor } = useContext(AppContext);

  const stageRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  // Local Lines from client
  const [localLines, setLocalLines] = useState<LineType[]>([]);
  // Remote Lines from differnt client
  const [remoteLines, setRemoteLines] = useState<LineType[]>([]);

  const isDrawing = useRef(false);
  const lastEmit = useRef(Date.now());

  // Socket: lines from diffrent client  fitting from the backend
  useEffect(() => {
    socket.on("draw", (data: LineType) => {
      setRemoteLines(prev => [...prev, data]);
    });
    return () => {
      socket.off("draw");
    };
  }, []);

  // what happens when mousedown, starts new line when mouse is clicked
  //line gets an id and color
  const handleMouseDown = useCallback((e: any) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;

    const newLine: LineType = {
      id: crypto.randomUUID(), // id for lines
      points: [pos.x, pos.y],
      color: currentColor
    };

    setLocalLines(prev => [...prev, newLine]);
  }, [currentColor]);

  //here new points from moving mouse get added to list
  const handleMouseMove = useCallback((e: any) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (!point) return;

    setLocalLines(prev => {
      if (prev.length === 0) return prev;

      const newLines = [...prev];
      const lastLine = { ...newLines[newLines.length - 1] };
      lastLine.points = [...lastLine.points, point.x, point.y];
      newLines[newLines.length - 1] = lastLine;

      // Throttle Socket-Emit  60 FPS (~16ms
      const now = Date.now();
      if (now - lastEmit.current > 16) {
        socket.emit("draw", lastLine);
        lastEmit.current = now;
      }

      return newLines;
    });
  }, []);

  // stopp when mouse is released
  const handleMouseUp = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const startNewDrawing = () => setLocalLines([]);

  return (
    <Stage
      ref={stageRef}
      width={window.innerWidth}
      height={window.innerHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
    >
      <Layer ref={layerRef}>
        {/* first remote, then local */}
        {[...remoteLines, ...localLines].map((line) => (
          <Line
            key={line.id}
            points={line.points}
            stroke={line.color || "black"}
            strokeWidth={4}
            tension={0.5} // Glättung
            lineCap="round"
            lineJoin="round"
          />
        ))}
      </Layer>
    </Stage>
  );
}




