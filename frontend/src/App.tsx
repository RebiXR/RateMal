import { useState } from 'react'
import './App.css'
import Canvas from "./components/canvas/Canvas";
import ColorPicker from './components/toolbar/ColorPicker';
import LobbySelector from './components/canvas/LobbySelector';
import { twoKeyControls } from './input/twoKeyControls';


function App() {
  //const [count, setCount] = useState(0)
  twoKeyControls(); // activate

  return (
    <div>
      {/*<ColorPicker />*/}
      <LobbySelector />
      <ColorPicker />
      <Canvas />
    </div>
  )
}

export default App
