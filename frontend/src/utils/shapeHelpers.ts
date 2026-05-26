//drawBlob, drawStar, rendner sticker etc. 



  export type Point = { x: number; y: number };


  export const createPermanentBlobShape = (
    radius = 28,
    points = 55,
    variance = 8
  ): Point[] => {
    const shape: Point[] = [];

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = radius + (Math.random() - 0.5) * variance;

      shape.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      });
    }
    return shape;
  };

export const DEFAULT_BLOB = createPermanentBlobShape();



export const drawBlob = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size: number=60) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  const scale = size/ 56;

  DEFAULT_BLOB.forEach((p, i) => {
    const px = x + p.x * scale;
    const py = y + p.y* scale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
};




export const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size: number =60) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  const radius= size/ 2;
  const innerRadius = size/ 5;
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(Math.cos((18 + i * 72) / 180 * Math.PI) * radius + x,
               -Math.sin((18 + i * 72) / 180 * Math.PI) * radius + y);
    ctx.lineTo(Math.cos((54 + i * 72) / 180 * Math.PI) * innerRadius + x,
               -Math.sin((54 + i * 72) / 180 * Math.PI) * innerRadius + y);
  }
  ctx.closePath();
  ctx.fill();
};




export const drawImageSticker = (
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  color: string, // color wird hier ignoriert, da das Bild eigene Farben hat
  src: string,
  size: number =60
) => {
  const img = new Image();
  img.src = src;
  img.onload = () => {
    // Zentriert zeichnen: x - size/2
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  };
};



// Zentraler Mapper
export const SHAPE_RENDERERS: Record<string, Function> = {
  blob: drawBlob,
  star: drawStar,
  //blob: (ctx: any, x: any, y: any, color: any, size: any) => drawBlob(ctx, x, y, color, size),
  //star: (ctx: any, x: any, y: any, color: any, size: any) => drawStar(ctx, x, y, color, size),
  //sun: (ctx: any, x: any, y: any, color: any) => { /* Sonne Logik */ },

  
  // Für Bild-Sticker (tree2):
  tree2: (ctx: any, x: any, y: any, color: any, size: any) => drawImageSticker(ctx, x, y, color, '/sticker/tree.png', size),
  
};






//-----------------------------------------------------
//render sticker from canvas to cleaner version

export const renderSticker = (
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  size: number,
  allStickers: any[] // List of Sticker 
) => {
  //  Check for SHAPE_RENDERERS (mathematische Formen)
  if (SHAPE_RENDERERS[id]) {
    SHAPE_RENDERERS[id](ctx, x, y, "#000", size); // Farbe ggf. aus Context
    return;
  }


  // search in Sticker-Liste
  const sticker = allStickers.find(s => s.id === id);
  if (!sticker) return;

  if (sticker.isImage || sticker.icon.startsWith("data:") || sticker.icon.startsWith("/")) {
    const img = new Image();
    img.src = sticker.icon;
    img.onload = () => {
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    };
  } else {
    // Emoji
    ctx.font = `${size}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sticker.icon, x, y + (size * 0.1));
  }
};






