type Lobby = {
  id: string;
  participants: Set<string>;
};



function makeid(length: number) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function createLobby() {
    const lobbies = new Map<string, Lobby>();
    for (let i = 0; i < 3; i++) {
        const id = makeid(4)
        lobbies.set(id, { id, participants: new Set() })
    }

    return lobbies
}

export const lobbies = createLobby()
