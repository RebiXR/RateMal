//drawBlob, drawStar, etc. 







  /*const PERMANENT_BLOB = createPermanentBlobShape();



  const drawBlob = (x: number, y: number, color: string) => {
    
    /*original
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();*/



    /*const ctx = canvasRef.current!.getContext("2d")!;
    ctx.fillStyle = color;

    // gute werte :50
    const radius = 28;
    const points = 75;
    const variance= 8.5;

    ctx.beginPath();

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = radius + Math.random() * variance-variance/2 ;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.closePath();
    //ctx.shadowColor = color;
    //ctx.shadowBlur = 10;
    ctx.fill();*/
    /*const ctx = canvasRef.current!.getContext("2d")!;
    ctx.fillStyle = color;

    ctx.beginPath();
    PERMANENT_BLOB.forEach((p, i) => {
      const px = x + p.x;
      const py = y + p.y;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();


  
  };
*/


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
