import ColorPicker from "./ColorPicker";
import ShapeButton from "./ShapeButton";
import PenButton from "./PenButton";

export default function ToolBar() {
  return (
    <div style={{ position: "fixed", top: 10, left: 10 }}>
      <ColorPicker />
      <ShapeButton />
      <PenButton/>
    </div>
  );
}
