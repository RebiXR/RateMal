//---------------------------------
//
//
//--------------------------------
import { useRef, useEffect, useContext, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { emitDraw, onDraw, offDraw, onCanvasSync, offCanvasSync, type DrawEvent } from "../../socket/drawingEvents";
import { onPBNReady, offPBNReady, toPngDataUrl, type PBNResult } from "../../socket/PBNEvents";
import { renderSticker} from "../../utils/shapeHelpers";
import { STICKER_CATEGORIES } from "../sticker/stickers";
import SaveDrawing from "./SaveDrawing";


type Point = { x: number; y: number };


export default function Canvas() {

  const { currentColor, activeLobbyId, tool, activeShape, stickerSize, penWidth, showGrid,setShowGrid, mirrorMode } = useContext(AppContext);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  // Clientseitige Kopie aller gezeichneten Events, damit der Canvas nach einem
  // Resize (z.B. Browser-Zoom) verlustfrei neu aufgebaut werden kann.
  const historyRef = useRef<DrawEvent[]>([]);
  const pbnImageRef = useRef<HTMLImageElement | null>(null);

  const [previewPos, setPreviewPos] = useState<Point | null>(null);
  const [customStickers, setCustomStickers] = useState<any[]>([]);
  // Helpfunction, gets stickers as flat list
  //const allStickers = Object.values(STICKER_CATEGORIES).flat();
  const allStickers = [...Object.values(STICKER_CATEGORIES).flat(), ...customStickers];
  const currentStickerObj = allStickers.find(s => s.id === activeShape);

  



  useEffect(() => {
    // Lade custom stickers damit der Ghost sie anzeigen kann
    const saved = localStorage.getItem("custom_stickers");
    if (saved) setCustomStickers(JSON.parse(saved));
  }, [activeShape]); // Wir laden neu, wenn sich die Auswahl ändert, um sicherzugehen





  
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
    historyRef.current.push(eventData);
    emitDraw({lobbyId: activeLobbyId, data: eventData});
  };





  // ZENTRALE ZEICHEN-LOGIK (Fix für alle Sticker & Linien)
  const renderEvent = (ctx: CanvasRenderingContext2D, data: any) => {

    if (data.type === "shape") {
      renderSticker(ctx, data.shapeType, data.x, data.y, data.size || 60, allStickers);
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
      historyRef.current.push(eventData);
      emitDraw({ lobbyId: activeLobbyId, canvasWidth: canvasRef.current!.width, data: eventData });
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
    historyRef.current.push(eventData);
    emitDraw({ lobbyId: activeLobbyId, canvasWidth: canvasRef.current!.width, data: eventData });
    lastPoint.current = p;
  };

  const endDraw = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };

  // Kleines JPEG-Vorschaubild des aktuellen Canvas für die Galerie.
  const makeThumbnail = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const maxW = 320;
    const scale = Math.min(1, maxW / canvas.width);
    const off = document.createElement("canvas");
    off.width = Math.max(1, Math.round(canvas.width * scale));
    off.height = Math.max(1, Math.round(canvas.height * scale));
    const octx = off.getContext("2d");
    if (!octx) return null;
    octx.fillStyle = "#ffffff";
    octx.fillRect(0, 0, off.width, off.height);
    octx.drawImage(canvas, 0, 0, off.width, off.height);
    return off.toDataURL("image/jpeg", 0.7);
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

    // Zeichnet eine geladene PBN-Vorlage zentriert/eingepasst auf den Canvas.
    const drawPbn = (img: HTMLImageElement) => {
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
    };

    // Baut den Canvas komplett aus dem gehaltenen Zustand neu auf.
    const repaint = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (pbnImageRef.current) drawPbn(pbnImageRef.current);
      historyRef.current.forEach((ev) => renderEvent(ctx, ev));
    };

    // Resize Observer damit Canvas bei Größenänderung mitgeht.
    // Hinweis: canvas.width/height neu zu setzen LEERT das Bitmap, deshalb
    // zeichnen wir aus historyRef neu, statt das alte Bitmap zu kopieren
    // (getImageData/putImageData würde beim Verkleinern abschneiden).
    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      repaint();
    });
    ro.observe(container);


    // LIVE ZEICHNEN VON ANDEREN
    onDraw((data) => {
      historyRef.current.push(data);
      renderEvent(ctx, data);
    });

    // HISTORY LADEN
    onCanvasSync((history) => {
      historyRef.current = [...history];
      repaint();
    });

    // PAINT-BY-NUMBERS Vorlage auf den Canvas legen
    const handlePBNReady = (result: PBNResult) => {
      const img = new Image();
      img.onload = () => {
        pbnImageRef.current = img;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPbn(img);
      };
      img.src = toPngDataUrl(result.pbn_template);
    };
    onPBNReady(handlePBNReady);

    return () => {
      ro.disconnect();
      offDraw();
      offCanvasSync();
      offPBNReady(handlePBNReady);
    };
  }, []); // Wichtig: Leeres Array, damit Listener nur 1x registriert werden






  return (

    <div style={{ position: 'relative', width: '100%', height: '100%', cursor: tool === 'shape' ? 'none' : 'crosshair' }}>

    <SaveDrawing getThumbnail={makeThumbnail} />

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

