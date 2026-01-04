import { useState } from 'react'
import './App.css'
import Canvas from "./components/Canvas";
import ColorPicker from './components/ColorPicker';
import Prompts from './components/Prompts';
function App() {
  //const [count, setCount] = useState(0)

  return (
    <>
    {/*<ColorPicker />*/}
    <Prompts/>
    <ColorPicker />
    <Canvas />
    </>
  )
}

export default App
