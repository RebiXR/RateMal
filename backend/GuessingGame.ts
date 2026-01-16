import { lobbies } from "./lobby.ts"

interface GuessingGame {
    id: String,
    drawPrompt: String,
    answers: Set<String>
    participants: Set<String>
    drawMasterId?: String
}

function guidGenerator() {
    var S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

function createDrawGame() {
    
    const guessingGame: GuessingGame = {
        id: guidGenerator(),
        drawPrompt: "Affe",
        answers: new Set<String>(["Affe", "Hund", "Kuh"]),
        participants: new Set<String> 
    }
        return guessingGame
}
export {GuessingGame}
export {createDrawGame as createDrawGame}

// Source - https://stackoverflow.com/a
// Posted by Joe, modified by community. See post 'Timeline' for change history
// Retrieved 2026-01-15, License - CC BY-SA 3.0


