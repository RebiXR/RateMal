//---------------------------------
//
//
//--------------------------------

import { useRef, useEffect, useContext, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { emitDraw, onDraw, offDraw, onCanvasSync, offCanvasSync, type DrawEvent } from "../../socket/drawingEvents";
import {drawBlob, drawStar, SHAPE_RENDERERS} from "../../utils/shapeHelpers";
import { STICKER_CATEGORIES } from "../sticker/stickers";


type Point = { x: number; y: number };


export default function Canvas() {
  const { currentColor, activeLobbyId, tool, activeShape, stickerSize, penWidth, showGrid,setShowGrid } = useContext(AppContext);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);

  const [previewPos, setPreviewPos] = useState<Point | null>(null);
  // Helpfunction, gets stickers as flat list
  const allStickers = Object.values(STICKER_CATEGORIES).flat();
  const currentStickerObj = allStickers.find(s => s.id === activeShape);



  const handleMouseMove= (e: React.MouseEvent) =>{

    const p = getPos(e.nativeEvent);
    if ( tool === "shape" && activeShape) {
      setPreviewPos(p); // Ghost follows mouse
    } else {
      draw (e.nativeEvent); // normal draw
    }
  };

  const handleMouseDown= (e: React.MouseEvent)=> {

    if ( tool === "shape" && activeShape && previewPos) {
      confirmPlacement(previewPos.x, previewPos.y);
    } else{
      startDraw(e.nativeEvent);
    }
  };


  const confirmPlacement= (x: number, y: number) => {

    const ctx = canvasRef.current!.getContext("2d")!;
    const eventData: DrawEvent ={
      type:"shape",
      shapeType: activeShape,
      x: x,
      y: y,
      color: currentColor,
      size: stickerSize
    };
    renderEvent(ctx, eventData);
    emitDraw({lobbyId: activeLobbyId, data: eventData});
  };





  // ZENTRALE ZEICHEN-LOGIK (Fix für alle Sticker & Linien)
  const renderEvent = (ctx: CanvasRenderingContext2D, data: any) => {
    if (data.type === "shape") {
      const finalSize= data.size || 60;


      if (SHAPE_RENDERERS[data.shapeType]) {
        SHAPE_RENDERERS[data.shapeType](ctx, data.x, data.y, data.color, finalSize);
      } else {
        // Dynamisch für alle aus Liste
        const sticker = allStickers.find(s => s.id === data.shapeType);
        if (sticker) {

          if(sticker.isImage){

            const img = new Image();
            img.src = sticker.icon;
            img.onload = () => {
              ctx.drawImage(img, data.x - finalSize / 2, data.y - finalSize / 2, finalSize, finalSize);
            };
          }else{
            ctx.font = `${finalSize}px serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(sticker.icon, data.x, data.y +( finalSize* 0.1));
          }
          
        }
      }
    } else if (data.type === "line") {
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.width ?? 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(data.from.x, data.from.y);
      ctx.lineTo(data.to.x, data.to.y);
      ctx.stroke();
    }
  };









  const getPos = (e: MouseEvent | TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };








  const startDraw = (e: MouseEvent | TouchEvent) => {
    if (!activeLobbyId) return;
    const p = getPos(e);
    const ctx = canvasRef.current!.getContext("2d")!;

    if (tool === "shape" && activeShape) {
      // Nutze die neue render-Funktion für lokales Zeichnen
      const eventData:DrawEvent = {
        type: "shape",
        shapeType: activeShape,
        x: p.x,
        y: p.y,
        color: currentColor,
        size:stickerSize,
      };
      
      renderEvent(ctx, eventData);
      emitDraw({ lobbyId: activeLobbyId, data: eventData });
      return;
    }

    isDrawing.current = true;
    lastPoint.current = p;
  };





  const draw = (e: MouseEvent | TouchEvent) => {
    if (!activeLobbyId || !isDrawing.current || !lastPoint.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = getPos(e);

    const eventData: DrawEvent= {
      type: "line",
      from: lastPoint.current,
      to: p,
      color: currentColor,
      width: penWidth
    };

    renderEvent(ctx, eventData);
    emitDraw({ lobbyId: activeLobbyId, data: eventData });
    lastPoint.current = p;
  };

  const endDraw = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };




  //keyboard control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (tool !== "shape" || !previewPos) return;

      const step = e.shiftKey ? 25 : 5; // Schneller mit Shift
      let newX = previewPos.x;
      let newY = previewPos.y;

      if (e.key === "ArrowUp")    newY -= step;
      if (e.key === "ArrowDown")  newY += step;
      if (e.key === "ArrowLeft")  newX -= step;
      if (e.key === "ArrowRight") newX += step;
      
      if (e.key === "Enter") {
        confirmPlacement(newX, newY);
      }
      if (e.key === "Escape") {
        setPreviewPos(null); // Abbrechen
      }

      setPreviewPos({ x: newX, y: newY });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewPos, tool, activeShape]);






  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const container = canvas.parentElement!;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Resize Observer damit Canvas bei Größenänderung mitgeht
    const ro = new ResizeObserver(() => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      ctx.putImageData(imageData, 0, 0);
    });
    ro.observe(container);


    // LIVE ZEICHNEN VON ANDEREN
    onDraw((data) => {
      renderEvent(ctx, data);
    });

    // HISTORY LADEN
    onCanvasSync((history) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      console.log("SYNC HISTORY", history.length);
      history.forEach(ev => renderEvent(ctx, ev));
    });

    return () => {
      ro.disconnect();
      offDraw();
      offCanvasSync();
    };
  }, []); // Wichtig: Leeres Array, damit Listener nur 1x registriert werden



  return (

    <div style={{ position: 'relative', width: '100%', height: '100%', cursor: tool === 'shape' ? 'none' : 'crosshair' }}>
    
    <canvas
      ref={canvasRef}
      style={{ touchAction: "none", backgroundColor: "#ffffff", display: 'block', width:'100%', height:'100%',
        backgroundImage: showGrid 
        ? `linear-gradient(to right, #f84040 1px, transparent 1px), 
          linear-gradient(to bottom, #d72929 1px, transparent 1px)`
        : 'none',
      backgroundSize: '40px 40px', // Größe der Quadrate
       }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={endDraw}
      onMouseLeave={endDraw}
      onTouchStart={(e) => startDraw(e.nativeEvent)}
      onTouchMove={(e) => draw(e.nativeEvent)}
      onTouchEnd={endDraw}
    />

    {/* DER GHOST (HTML-Vorschau) */}
    {tool === "shape" && activeShape && previewPos && (
      <div style={{
        position: 'absolute',
        left: previewPos.x,
        top: previewPos.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        opacity: 0.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {currentStickerObj?.isImage ? (
          <img src={currentStickerObj.icon} style={{ width: stickerSize, height: stickerSize }} alt="preview" />
        ) : (
          <span style={{ fontSize: `${stickerSize}px` }}>{currentStickerObj?.icon}</span>
        )}
      </div>
    )}

  </div>
 


  );
}

