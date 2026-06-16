/*
 * Module for Lobby management. Declares object types for client and server, and functions to manage lobbies in memory.
 */

type Lobby = {
  id: string;
  name: string;
  isPrivate: boolean;
  passwordHash?: string;
  isDefault: boolean;        // default lobbies
  adminSocketId: string | null;
  participants: Set<string>; // participant socket ID
};

// client lobby representation
export type LobbyInfo = {
  id: string;
  name: string;
  isPrivate: boolean;
  participantCount: number;
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

function createDefaultLobbies() {
    const lobbies = new Map<string, Lobby>();
    for (let i = 1; i <= 5; i++) {
        const id = makeid(4)
        lobbies.set(id, {
            id,
            name: `Öffentliche Lobby ${i}`,
            isPrivate: false,
            isDefault: true,
            adminSocketId: null,
            participants: new Set(),
        })
    }

    return lobbies
}

export const lobbies = createDefaultLobbies()


export function generateLobbyId(): string {
    let id = makeid(4)
    while (lobbies.has(id)) id = makeid(4)
    return id
}

// maps in-memory lobbies to client safe DTO.
export function getLobbyList(): LobbyInfo[] {
    return Array.from(lobbies.values()).map((l) => ({
        id: l.id,
        name: l.name,
        isPrivate: l.isPrivate,
        participantCount: l.participants.size,
    }))
}

export {Lobby}
