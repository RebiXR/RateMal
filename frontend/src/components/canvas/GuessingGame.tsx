import { useContext } from "react";
import { AppContext } from "../../context/AppContext";
import { startGuessingGame, giveGuess } from "../../socket/selectLobby";
import { socket } from "../../socket/socket";


export interface GuessingGame {
  id: string;
  drawPrompt: string;
  participants: string[];
  drawMasterId: string;
  answerOptions: string[]; 
}

export default function GuessingGameCreator() {
    const { activeLobbyId, guessingGame } = useContext(AppContext);
    
    const joinGuessingGame = () => {
        if(!activeLobbyId) return;
        startGuessingGame(activeLobbyId)
    }

    const guessHandler = (answer: string) => {
        if (!activeLobbyId) return;
        giveGuess(activeLobbyId, answer)
    }

    if(!guessingGame){ return (
        <div>
            <button onClick={joinGuessingGame}>
                Starte Rate Spiel
            </button>
        </div>
    )}

    if(socket.id === guessingGame.drawMasterId) { return (
        <div>
            <h2>Zeichne: </h2>
            <p>{guessingGame.drawPrompt}</p>
        </div>
    )} else { return (
        <div>
            <div>
                {guessingGame.answerOptions.map((answer: string) => (
                    <button
                        key={answer}
                        onClick={() => guessHandler(answer)}
                        >
                        {answer}
                    </button>
                ))}
            </div>
        </div>
    )}
}