import { useState } from 'react'
import './App.css'
import Canvas from "./components/canvas/Canvas";
import ColorPicker from './components/toolbar/ColorPicker';
import LobbySelector from './components/canvas/LobbySelector';
import { twoKeyControls } from './input/twoKeyControls';
import ShapeButton from './components/toolbar/ShapeButton';
import PenButton from './components/toolbar/PenButton';


function App() {
  //const [count, setCount] = useState(0)
  twoKeyControls(); // activate

  return (
    <div>
      {/*<ColorPicker />*/}
      <LobbySelector />
      <ColorPicker />
      <Canvas />
      <ShapeButton/>
      <PenButton/>
    </div>
  )
}

export default App
