import { useState } from 'react'
import './App.css'
import Canvas from "./components/canvas/Canvas";
import ColorPicker from './components/toolbar/ColorPicker';
import LobbySelector from './components/canvas/LobbySelector';
function App() {
  //const [count, setCount] = useState(0)

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
