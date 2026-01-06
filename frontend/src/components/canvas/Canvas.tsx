//---------------------------------
//lag  fix - hopfully ->  no react  mouse to canvas omly
//
//--------------------------------


import { useRef, useEffect, useContext } from "react";
//import io from "socket.io-client";
import { AppContext } from "../../context/AppContext";
import { emitDraw, onDraw, offDraw, onCanvasSync, offCanvasSync } from "../../socket/drawingEvents";

//const socket = io("http://localhost:3000");

type Point = { x: number; y: number };

export default function Canvas() {
  const { currentColor, activeLobbyId } = useContext(AppContext);

  

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



  const startDraw = (e: MouseEvent | TouchEvent) => {
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
      ctx.strokeStyle = data.color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(data.from.x, data.from.y);
      ctx.lineTo(data.to.x, data.to.y);
      ctx.stroke();
    });

    onCanvasSync((history) => {
      // optional: Canvas löschen und neu zeichnen
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const ev of history) {
        ctx.strokeStyle = ev.color;
        ctx.lineWidth = ev.width ?? 4;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(ev.from.x, ev.from.y);
        ctx.lineTo(ev.to.x, ev.to.y);
        ctx.stroke();
      }

      console.log("SYNC HISTORY", history.length);
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
      offCanvasSync();
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



