type Lobby = {
  id: string;
  name?: string;
  participants: Set<string>;
  createdAt: number;
};

type LobbyInfo = {
  id: string;
  name?: string;
  position: number;
  participantCount: number;
};

const lobbies = new Map<string, Lobby>();

function makeid(length: number) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function createLobby(name?: string) {
    let id = makeid(4);
    while (lobbies.has(id)) {
        id = makeid(4);
    }

    const lobby: Lobby = {
        id,
        name,
        participants: new Set(),
        createdAt: Date.now(),
    };
    lobbies.set(id, lobby);
    return lobby;
}

function getLobbyList(): LobbyInfo[] {
    return Array.from(lobbies.values()).map((lobby, index) => ({
        id: lobby.id,
        name: lobby.name,
        position: index + 1,
        participantCount: lobby.participants.size,
    }));
}

function deleteLobby(lobbyId: string) {
    return lobbies.delete(lobbyId);
}

export { lobbies, createLobby, deleteLobby, getLobbyList }
export type { Lobby, LobbyInfo }
