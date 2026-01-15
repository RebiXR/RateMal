import { useState } from 'react'
import './App.css'
import Prompts from './components/canvas/Prompts';
import Canvas from "./components/canvas/Canvas";
import ColorPicker from './components/toolbar/ColorPicker';
import LobbySelector from './components/canvas/LobbySelector';
import { twoKeyControls } from './input/twoKeyControls';
import ShapeButton from './components/toolbar/ShapeButton';
import PenButton from './components/toolbar/PenButton';
import GuessingGameCreator from './components/canvas/GuessingGame';


function App() {
  //const [count, setCount] = useState(0)
  twoKeyControls(); // activate

  return (
    <div>
      {/*<ColorPicker />*/}
      <Prompts />
      <LobbySelector />
      <ColorPicker />
      <Canvas />
      <ShapeButton/>
      <PenButton/>
      <GuessingGameCreator/>
    </div>
  )
}

export default App
