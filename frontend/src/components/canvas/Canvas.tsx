//---------------------------------
//lag  fix - hopfully ->  no react  mouse to canvas omly
//
//--------------------------------


import { useRef, useEffect, useContext } from "react";
//import io from "socket.io-client";
import { AppContext } from "../../context/AppContext";
import { emitDraw, onDraw, offDraw } from "../../socket/drawingEvents";

//const socket = io("http://localhost:3000");

type Point = { x: number; y: number };

export default function Canvas() {
  const { currentColor, activeLobbyId,tool , activeShape } = useContext(AppContext);

  

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);



  //result= positon relativ to canvas
  const getPos = (e: MouseEvent | TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect(); // rectangle relativ to viewport

    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const drawBlob = (x: number, y: number, color: string) => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();
  };








  const startDraw = (e: MouseEvent | TouchEvent) => {
    
      if (!activeLobbyId) return;

  const p = getPos(e);

  // SHAPE-MODUS
  if (tool === "shape" && activeShape === "blob") {
    drawBlob(p.x, p.y, currentColor);

    emitDraw({
      lobbyId: activeLobbyId,
      data: {
        type: "blob",
        x: p.x,
        y: p.y,
        color: currentColor,
      },
    });

    return; 
  }
    
  
    
    isDrawing.current = true;
    lastPoint.current = getPos(e);
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!activeLobbyId) return;
    if (!isDrawing.current || !lastPoint.current) return;

    const ctx = canvasRef.current!.getContext("2d")!;
    const p = getPos(e);

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    // draw methods
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke(); // needed for visivle line

    // minimal info that is sent over socket- functino call socket 
    emitDraw({
      lobbyId: activeLobbyId,
      data: {
        type: "line",
        from: lastPoint.current,
        to: p,
        color: currentColor,
      }
    });


    /*socket.emit("draw", {
      from: lastPoint.current,
      to: p,
      color: currentColor,
    });*/

    lastPoint.current = p;
  };

  const endDraw = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };


  
  // affter rendering 
  useEffect(() => {
    const ctx = canvasRef.current!.getContext("2d")!;

    // set at creation -> no override problem
    const canvas = canvasRef.current!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    onDraw((data) => {


      if (data.type === "blob") {
        drawBlob(data.x, data.y, data.color);
      return;
  }

      ctx.strokeStyle = data.color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(data.from.x, data.from.y);
      ctx.lineTo(data.to.x, data.to.y);
      ctx.stroke();
    });

    /*socket.on("draw", (data) => {
      ctx.strokeStyle = data.color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(data.from.x, data.from.y);
      ctx.lineTo(data.to.x, data.to.y);
      ctx.stroke();
    });*/

    return () => {
       offDraw();
      //socket.off("draw");
    };
  }, []);



  return (
    <canvas
      ref={canvasRef}
      //width={window.innerWidth}
      //height={window.innerHeight}
      style={{ border: "1px solid #ccc", touchAction: "none" }}
      onMouseDown={(e) => startDraw(e.nativeEvent)}
      onMouseMove={(e) => draw(e.nativeEvent)}
      onMouseUp={endDraw}
      onMouseLeave={endDraw}
      onTouchStart={(e) => startDraw(e.nativeEvent)}
      onTouchMove={(e) => draw(e.nativeEvent)}
      onTouchEnd={endDraw}
    />
  );
}



