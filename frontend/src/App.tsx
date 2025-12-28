import { useState } from 'react'
import './App.css'
import Canvas from "./components/canvas/Canvas";
import ColorPicker from './components/toolbar/ColorPicker';
function App() {
  //const [count, setCount] = useState(0)

  return (
    <>
    {/*<ColorPicker />*/}
    <ColorPicker />
    <Canvas />
    </>
  )
}

export default App
