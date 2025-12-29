import { useEffect, useContext, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { requestLobbies, onLobbyList, joinLobby } from "../../socket/selectLobby";

export default function LobbySelector() {
  const { setActiveLobbyId, activeLobbyId } = useContext(AppContext);
  const [lobbies, setLobbies] = useState<string[]>([]);

  useEffect(() => {
    requestLobbies();

    onLobbyList((ids) => {
      setLobbies(ids);
    });

    return () => {
    };
  }, []);

  const handleJoinLobby = (lobbyId: string) => {
    setActiveLobbyId(lobbyId);
    joinLobby(lobbyId, "user-1"); // replace with read id
  };

  return (
    <div>
      <h2>Select a lobby</h2>

      {lobbies.map((id) => (
        <button
          key={id}
          onClick={() => handleJoinLobby(id)}
          disabled={activeLobbyId === id}
        >
          Lobby {id}
        </button>
      ))}
    </div>
  );
}
