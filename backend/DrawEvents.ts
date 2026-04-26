export type PointN = { x: number; y: number }; // normalized 0..1


type LineDrawEvent ={
  type:"line";
  from: PointN;
  to:PointN;
  color:string;
  width:number;
};
/*type BlobDrawEvent ={
  type:"blob";
  x: number;
  y:number;
  color:string;
};*/

type ShapeDrawEvent ={
  type:"shape";
  shapeType: string;
  x: number;
  y:number;
  color:string;
};

//ich hab hier export hinzugefügt
export type DrawEvent = LineDrawEvent| ShapeDrawEvent;